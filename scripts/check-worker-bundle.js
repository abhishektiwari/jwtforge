'use strict';

const fs = require('node:fs');
const path = require('node:path');

const outputDirectory = path.resolve(process.argv[2] || '.wrangler/worker-bundle-check');
const forbidden = [
  { label: 'node:fs', pattern: /node:fs/ },
  { label: 'newman', pattern: /\bnewman\b/i },
  { label: 'lib/pentest', pattern: /lib[\\/]pentest/i },
];

function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(target) : [target];
  });
}

if (!fs.existsSync(outputDirectory)) {
  console.error(`Worker bundle directory does not exist: ${outputDirectory}`);
  process.exit(1);
}

const findings = [];
for (const file of filesBelow(outputDirectory)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const check of forbidden) {
    if (check.pattern.test(content)) findings.push(`${check.label} in ${path.relative(outputDirectory, file)}`);
  }
}

if (findings.length) {
  console.error('Node-only pentest code entered the Worker bundle:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Worker bundle boundary verified: ${outputDirectory}`);
