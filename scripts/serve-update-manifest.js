// Serves a fake update manifest for the end-to-end check of the auto-updater.
// Usage: node scripts/serve-update-manifest.js [port]
const http = require('http');
const { createHash } = require('crypto');

const port = Number(process.argv[2] || 8899);
const payload = Buffer.from('fake-update-payload-for-e2e');
const sha256 = createHash('sha256').update(payload).digest('hex');

const server = http.createServer((req, res) => {
  if (req.url === '/version.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      version: '99.0.0',
      url: `http://127.0.0.1:${port}/update.bin`,
      sha256,
      notes: 'Versión de prueba del actualizador',
    }));
    return;
  }
  if (req.url === '/update.bin') {
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': payload.length,
    });
    res.end(payload);
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, '127.0.0.1', () => {
  console.log(`update manifest on http://127.0.0.1:${port}/version.json`);
});
