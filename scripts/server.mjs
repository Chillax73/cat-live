import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 4173;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('端口必须为 1–65535 的整数');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)), args.includes('--dist') ? 'dist' : '.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const allowed = path === '/' || path === '/index.html' || path === '/styles.css' || path === '/favicon.svg' || /^\/src\/[a-z-]+\.js$/.test(path);
    if (!allowed || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
    const file = resolve(root, path === '/' ? 'index.html' : path.slice(1));
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(`无法启动：${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`金渐层大作战：http://127.0.0.1:${port} · Ctrl+C 停止`));
