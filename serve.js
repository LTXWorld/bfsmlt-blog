#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8080);
const WATCH_DIRS = ['posts', 'src'];
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

let building = false;
let pending = false;
let rebuildTimer = null;

function build() {
  if (building) {
    pending = true;
    return;
  }

  building = true;
  const result = spawnSync(process.execPath, ['build.js', '--drafts'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  building = false;

  if (result.status !== 0) {
    console.error('Build failed. Fix the error and save again to rebuild.');
  }

  if (pending) {
    pending = false;
    build();
  }
}

function scheduleBuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(build, 120);
}

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^\.{2}(\/|\\|$)/, '');
  return path.join(root, normalized);
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function startServer() {
  const server = http.createServer((req, res) => {
    let filePath = safeJoin(DIST_DIR, req.url || '/');

    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    fs.stat(filePath, (error, stats) => {
      if (!error && stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      serveFile(res, filePath);
    });
  });

  server.listen(PORT, () => {
    console.log(`Local preview: http://localhost:${PORT}`);
    console.log('Watching posts/ and src/ for changes...');
  });
}

function watch() {
  for (const dir of WATCH_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) continue;

    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      if (String(filename).includes('.swp')) return;
      scheduleBuild();
    });
  }
}

build();
watch();
startServer();
