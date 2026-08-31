// Serves the Capacitor SPA bundle the way the Android WebView does:
// every unknown path falls back to index.html (no prerendered HTML at all).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = 'dist/doctoguide-app/browser';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.woff2':'font/woff2', '.png':'image/png', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.txt':'text/plain' };
createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = join(ROOT, url === '/' ? 'index.html' : url);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); }
  catch { file = join(ROOT, 'index.html'); }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    const buf = await readFile(join(ROOT, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(buf);
  }
}).listen(4799, () => console.log('capacitor bundle on http://localhost:4799'));
