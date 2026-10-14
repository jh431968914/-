'use strict';
// Optional isolated file-backed browser fixture when localhost is unavailable.
// The game still loads at its normal origin; only this test context intercepts requests.
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.wav': 'audio/wav', '.png': 'image/png' };
async function attachLocalFixture(context) {
  if (process.env.MEOW_BROWSER_OFFLINE !== '1') return;
  await context.route('http://127.0.0.1:4173/**', async route => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(route.request().url()).pathname); }
    catch (_) { await route.fulfill({ status: 400 }); return; }
    if (pathname === '/') pathname = '/web/index.html';
    const file = path.resolve(root, '.' + pathname), contentType = types[path.extname(file)];
    if (!/^\/(web|utils|assets)\//.test(pathname) || !file.startsWith(root + path.sep) || !contentType) {
      await route.fulfill({ status: 404 }); return;
    }
    try { await route.fulfill({ status: 200, contentType, body: await fs.readFile(file) }); }
    catch (_) { await route.fulfill({ status: 404 }); }
  });
}
module.exports = { attachLocalFixture };
