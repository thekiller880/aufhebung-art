// Zero-dependency local server: serves ./public and routes /api/oracle to the Vercel function.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import handler from './api/oracle.js';

// Load .env if present (never committed).
if (existsSync('.env')) for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const PORT = Number(process.env.PORT || 3000);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const root = path.resolve('public');

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/oracle') {
    let raw = ''; for await (const c of req) raw += c;
    req.body = raw;
    res.status = c => { res.statusCode = c; return res; };
    res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
    return handler(req, res);
  }
  const file = path.join(root, path.normalize(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end(); }
  try { const data = await readFile(file); res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(data); }
  catch { res.statusCode = 404; res.end('not found'); }
}).listen(PORT, () => console.log(`Aufhebung: the Dialectic Engine on http://localhost:${PORT}  (qloo: ${process.env.MOCK_QLOO === '1' || !process.env.QLOO_API_KEY ? 'stand-in' : 'live'})`));
