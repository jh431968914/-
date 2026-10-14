'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.wav': 'audio/wav', '.png': 'image/png' };
function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let url;
    try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch (_) { res.writeHead(400); res.end(); return; }
    if (url === '/') url = '/web/index.html';
    if (!/^\/(web|utils|assets)\//.test(url)) { res.writeHead(404); res.end('Not found'); return; }
    const file = path.resolve(root, '.' + url);
    if (!file.startsWith(root + path.sep) || !types[path.extname(file)]) { res.writeHead(404); res.end('Not found'); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Content-Length': stat.size,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
    });
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  createServer().listen(port, '127.0.0.1', () => {
    console.log('猫猫消消屋试玩：http://127.0.0.1:' + port);
  });
}
module.exports = { createServer };
