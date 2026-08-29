const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

let started = false;

function tryConnect(host, port, cb) {
  const req = http.get({ host, port, path: '/' }, (res) => {
    cb(true);
  });
  req.on('error', () => {
    cb(false);
  });
  req.setTimeout(500, () => {
    req.destroy();
    cb(false);
  });
}

function checkServer() {
  if (started) return;
  tryConnect('localhost', 5173, (ok1) => {
    if (ok1 && !started) {
      launchElectron();
      return;
    }
    tryConnect('127.0.0.1', 5173, (ok2) => {
      if (ok2 && !started) {
        launchElectron();
        return;
      }
      setTimeout(checkServer, 300);
    });
  });
}

function launchElectron() {
  if (started) return;
  started = true;
  console.log('🚀 Vite dev server is live! Spawning Lumora Desktop Electron window...');
  const electronPath = require('electron');
  const child = spawn(electronPath, [path.join(__dirname, '..')], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

console.log('⏳ Waiting for Vite dev server on http://localhost:5173...');
checkServer();
