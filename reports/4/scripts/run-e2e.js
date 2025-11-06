const { spawn } = require('child_process');
let getPort;
const path = require('path');

console.log('🚀 Starting autonomous E2E test suite...');

const config = {
  serverStartTimeout: 60000, // Increased to 60 seconds
  testTimeout: 300000,
  cleanupAfterTests: true
};

const isWin = process.platform === 'win32';
const pythonPath = isWin
  ? path.resolve(__dirname, '../../venv/Scripts/python.exe')
  : path.resolve(__dirname, '../../venv/bin/python');

async function startFlaskBackend() {
  getPort = getPort || (await import('get-port')).default;
  const backendPort = await getPort({ portRange: [5001, 5999] });
  process.env.BACKEND_PORT = backendPort;
  console.log(`🔧 Starting Flask backend on port ${backendPort}...`);
  const backend = spawn(pythonPath, ['app.py', '--port', backendPort], {
    stdio: 'pipe',
    shell: true,
    cwd: path.resolve(__dirname, '../..'),
    env: { ...process.env, FLASK_ENV: 'development', BACKEND_PORT: backendPort, PORT: backendPort }
  });
  let backendReady = false;
  const timeout = setTimeout(() => {
    if (!backendReady) {
      backend.kill();
      throw new Error('Backend startup timeout');
    }
  }, config.serverStartTimeout);
  backend.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`🐍 Backend: ${output.trim()}`);
    if ((output.includes('Running on') && output.includes(`:${backendPort}`)) || output.includes(`${backendPort}`)) {
      backendReady = true;
      clearTimeout(timeout);
      console.log(`✅ Flask backend is ready on port ${backendPort}!`);
    }
  });
  backend.stderr.on('data', (data) => {
    console.error(`❌ Backend Error: ${data.toString()}`);
  });
  backend.on('error', (error) => {
    clearTimeout(timeout);
    throw error;
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { backend, backendPort };
}

async function startNextFrontend(backendPort) {
  getPort = getPort || (await import('get-port')).default;
  const frontendPort = await getPort({ portRange: [3001, 3999] });
  process.env.PORT = frontendPort;
  process.env.BACKEND_PORT = backendPort;
  process.env.CYPRESS_BASE_URL = `http://localhost:${frontendPort}`;
  console.log(`🔧 Starting Next.js frontend on port ${frontendPort} (proxying to backend ${backendPort})...`);
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
    cwd: process.cwd(),
    env: { ...process.env, PORT: frontendPort, BACKEND_PORT: backendPort }
  });
  let serverReady = false;
  const timeout = setTimeout(() => {
    if (!serverReady) {
      server.kill();
      throw new Error('Frontend startup timeout');
    }
  }, config.serverStartTimeout);
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`📡 Server: ${output.trim()}`);
    if (output.includes('Ready') || output.includes('started server')) {
      serverReady = true;
      clearTimeout(timeout);
      console.log(`✅ Next.js frontend is ready on port ${frontendPort}!`);
    }
  });
  server.stderr.on('data', (data) => {
    console.error(`❌ Server Error: ${data.toString()}`);
  });
  server.on('error', (error) => {
    clearTimeout(timeout);
    throw error;
  });
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { server, frontendPort };
}

function runTests() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Running Cypress tests...');
    const cypressArgs = ['cypress', 'run', '--headless'];
    if (process.env.CYPRESS_SPEC) {
      cypressArgs.push('--spec', process.env.CYPRESS_SPEC);
    }
    const cypress = spawn('npx', cypressArgs, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      env: process.env
    });
    cypress.on('close', (code) => {
      if (code === 0) {
        console.log('✅ All tests passed!');
        resolve();
      } else {
        console.log(`❌ Tests failed with code ${code}`);
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
  });
}

function cleanup() {
  return new Promise((resolve) => {
    console.log('🧹 Running cleanup...');
    const cleanup = spawn('node', ['scripts/cleanup-e2e.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });
    cleanup.on('close', () => {
      console.log('✅ Cleanup completed!');
      resolve();
    });
  });
}

(async function main() {
  let backend = null;
  let server = null;
  try {
    // Start backend
    const backendResult = await startFlaskBackend();
    backend = backendResult.backend;
    const backendPort = backendResult.backendPort;
    // Start frontend
    const frontendResult = await startNextFrontend(backendPort);
    server = frontendResult.server;
    // Run tests
    await runTests();
    // Cleanup if enabled
    if (config.cleanupAfterTests) {
      await cleanup();
    }
    console.log('🎉 E2E test suite completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 E2E test suite failed:', error.message);
    if (config.cleanupAfterTests) {
      await cleanup();
    }
    process.exit(1);
  } finally {
    if (server) {
      console.log('🛑 Stopping frontend server...');
      server.kill();
    }
    if (backend) {
      console.log('🛑 Stopping backend server...');
      backend.kill();
    }
  }
})();

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
}); 