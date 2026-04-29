#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const command = process.argv[2];
const portFile = path.join(os.tmpdir(), '.jwtforge-port');

function getPortFile() {
  return portFile;
}

function savePort(port) {
  try {
    fs.writeFileSync(getPortFile(), port.toString());
  } catch (e) {
    // Silently fail if we can't write the file
  }
}

function readPort() {
  try {
    if (fs.existsSync(getPortFile())) {
      return fs.readFileSync(getPortFile(), 'utf8').trim();
    }
  } catch (e) {
    // Silently fail if we can't read the file
  }
  return null;
}

async function findAvailablePort() {
  const http = require('http');

  // Try default wrangler ports (8787 is default, but it can use others)
  const ports = [8787, 8788, 8789, 8790, 9000, 3000];

  for (const port of ports) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request(
          { hostname: 'localhost', port, path: '/', method: 'GET', timeout: 1000 },
          (res) => {
            resolve(true);
          }
        );
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject();
        });
        req.end();
      });
      return port; // Found a listening port
    } catch (e) {
      // Port not listening, try next
    }
  }

  return null; // None found
}

function showHelp() {
  console.log(`
jwtforge - JWT Token Vending Service for Testing

Usage:
  jwtforge start                      Start the development server
  jwtforge token [payload] [options]  Generate a JWT token
  jwtforge status [options]           Check if server is running
  jwtforge stop [options]             Stop the running server
  jwtforge help                       Show this help message

Options:
  --port=<port>     Port where jwtforge is running (default: 8787)

Examples:
  jwtforge start
  jwtforge token
  jwtforge token '{"sub":"user123","scope":"profile email"}'
  jwtforge status
  jwtforge stop

Environment Variables:
  JWTFORGE_PORT     Port where jwtforge is running (default: 8787)
`);
}

async function run(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, [], {
      stdio: 'inherit',
      shell: true,
      cwd: path.dirname(path.dirname(__filename))
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', reject);
  });
}

async function generateToken(payload, port = null) {
  const https = require('https');
  const http = require('http');

  // Parse payload
  let data = {};
  if (payload) {
    try {
      data = JSON.parse(payload);
    } catch (e) {
      throw new Error(`Invalid JSON payload: ${e.message}`);
    }
  }

  // Get port from: command line arg > env var > auto-detect > default
  if (!port) {
    const explicit = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] ||
                     process.env.JWTFORGE_PORT;

    if (explicit) {
      port = explicit;
    } else {
      // Try to auto-detect listening port
      port = await findAvailablePort() || 8787;
    }
  }

  // Default host
  const host = 'localhost';

  const requestData = JSON.stringify(data);

  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: host,
      port: port,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const protocol = port === 443 ? https : http;
    const req = protocol.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonResponse = JSON.parse(responseData);
            resolve(jsonResponse);
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`\n❌ Cannot connect to jwtforge on ${host}:${port}\n\nPlease start the server first:\n  jwtforge start\n`));
    });

    req.write(requestData);
    req.end();
  });
}

async function checkStatus(port = null) {
  const http = require('http');

  // Get port from: command line arg > env var > auto-detect > default
  if (!port) {
    const explicit = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] ||
                     process.env.JWTFORGE_PORT;

    if (explicit) {
      port = explicit;
    } else {
      // Try to auto-detect listening port
      port = await findAvailablePort() || 8787;
    }
  }

  const host = 'localhost';

  return new Promise((resolve) => {
    const requestOptions = {
      hostname: host,
      port: port,
      path: '/',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(requestOptions, (res) => {
      resolve({
        running: true,
        host: `${host}:${port}`,
        statusCode: res.statusCode
      });
    });

    req.on('error', () => {
      resolve({
        running: false,
        host: `${host}:${port}`
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        running: false,
        host: `${host}:${port}`
      });
    });

    req.end();
  });
}

async function stopServer(port = null) {
  const { execSync } = require('child_process');
  const os = require('os');

  // Get port from: command line arg > env var > auto-detect > default
  if (!port) {
    const explicit = process.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] ||
                     process.env.JWTFORGE_PORT;

    if (explicit) {
      port = explicit;
    } else {
      // Try to auto-detect listening port
      port = await findAvailablePort() || 8787;
    }
  }

  try {
    if (os.platform() === 'win32') {
      // Windows command
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /pid %a /f`, {
        stdio: 'ignore',
        shell: 'cmd.exe'
      });
    } else {
      // Unix/Linux/macOS command
      execSync(`lsof -ti :${port} | xargs kill -9`, {
        stdio: 'ignore',
        shell: true
      });
    }

    // Give it a moment to shut down, then verify
    await new Promise(resolve => setTimeout(resolve, 500));

    const status = await checkStatus(port);
    if (status.running) {
      throw new Error(`Server is still running on port ${port}`);
    }

    return {
      stopped: true,
      port: port
    };
  } catch (error) {
    throw new Error(`Failed to stop server on port ${port}: ${error.message}`);
  }
}

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  if (command === 'start') {
    console.log('Starting jwtforge development server...\n');
    try {
      await run('npm run dev');
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else if (command === 'token') {
    try {
      const payload = process.argv[3];
      const token = await generateToken(payload);
      console.log(JSON.stringify(token, null, 2));
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else if (command === 'status') {
    try {
      const status = await checkStatus();
      if (status.running) {
        console.log(`✓ jwtforge is running on ${status.host}`);
        process.exit(0);
      } else {
        console.log(`✗ jwtforge is not running on ${status.host}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else if (command === 'stop') {
    try {
      const result = await stopServer();
      console.log(`✓ Stopped jwtforge on port ${result.port}`);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}`);
    console.log('Run "jwtforge help" for usage information');
    process.exit(1);
  }
}

main();
