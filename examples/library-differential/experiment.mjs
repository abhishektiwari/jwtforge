#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCorpus } from './corpus.mjs';
import { runJavaScriptAdapters } from './javascript_adapters.mjs';
import { analyze, markdownReport } from './report.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const jwtforgeUrl = (process.env.JWT_FORGE_URL || 'http://localhost:8787').replace(/\/$/, '');
const python = process.env.PYTHON || 'python3';
const outDir = path.resolve(here, process.env.OUT_DIR || 'generated');
const corpusParameters = {
  issuer: process.env.JWT_ISSUER || jwtforgeUrl,
  audience: process.env.JWT_AUDIENCE || 'https://library-differential.example',
};

function commandOutput(command, args) {
  const result = spawnSync(command, args, { cwd: path.resolve(here, '../..'), encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : 'unavailable';
}

function runPythonAdapters(corpusPath) {
  const process = spawnSync(python, [path.join(here, 'python_adapter.py'), corpusPath], {
    cwd: here,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120_000,
  });
  if (process.error) throw process.error;
  if (process.status !== 0) {
    throw new Error(`Python adapters failed with exit ${process.status}: ${process.stderr.trim()}`);
  }
  try {
    return JSON.parse(process.stdout);
  } catch {
    throw new Error(`Python adapters returned invalid JSON: ${process.stdout.slice(0, 500)}`);
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const corpus = await buildCorpus({
    jwtforgeUrl,
    corpusParameters,
    generatorRevision: {
      release: commandOutput('node', ['-p', "require('./package.json').version"]),
      commit: commandOutput('git', ['rev-parse', 'HEAD']),
    },
  });
  const corpusPath = path.join(outDir, 'corpus.json');
  await writeFile(corpusPath, `${JSON.stringify(corpus, null, 2)}\n`);

  const results = [
    ...await runJavaScriptAdapters(corpus),
    ...runPythonAdapters(corpusPath),
  ];
  const analysis = analyze(corpus, results);
  const resultsPath = path.join(outDir, 'results.json');
  const reportPath = path.join(outDir, 'report.md');
  const resultDocument = {
    corpus: path.relative(outDir, corpusPath),
    adapter_profiles: ['policy-unconfigured', 'configured'],
    verification_started_at: new Date().toISOString(),
    analysis,
    results,
  };
  await writeFile(resultsPath, `${JSON.stringify(resultDocument, null, 2)}\n`);
  await writeFile(reportPath, markdownReport(corpus, results, analysis));

  console.log(`Corpus: ${corpusPath}`);
  console.log(`Results: ${resultsPath}`);
  console.log(`Report: ${reportPath}`);
  for (const [profile, profileAnalysis] of Object.entries(analysis.profiles)) {
    console.log(`${profile} signed control accepted by all libraries: ${profileAnalysis.control_all_accepted ? 'yes' : 'no'}`);
    console.log(`${profile} divergent cases: ${profileAnalysis.divergent_cases.join(', ') || 'none'}`);
    console.log(`${profile} required cases outside the declared expectation: ${profileAnalysis.failed_required_cases.join(', ') || 'none'}`);
    console.log(`${profile} observational cases (no acceptance requirement): ${profileAnalysis.observational_cases.length}`);
  }
}

main().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
