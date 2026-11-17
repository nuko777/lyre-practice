// 零依赖静态服务器：node serve.mjs  →  http://localhost:8080
// 想换端口：PORT=9000 node serve.mjs；想对局域网开放：HOST=0.0.0.0 node serve.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, relative, isAbsolute } from 'node:path';

const ROOT = import.meta.dirname;
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// 只允许仓库内的路径，且不暴露 .git 之类的隐藏目录
function resolvePath(urlPath) {
  const file = normalize(join(ROOT, urlPath));
  const rel = relative(ROOT, file);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  if (rel.split(/[\/]/).some((seg) => seg.startsWith('.'))) return null;
  return file;
}

const server = createServer(async (req, res) => {
  const send = (code, body, headers = {}) => {
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    res.end(body);
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(405, '只支持 GET / HEAD', { Allow: 'GET, HEAD' });
  }

  let pathname, search;
  try {
    const url = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
    search = url.search;
  } catch {
    return send(400, '请求地址不合法');
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  const file = resolvePath(pathname);
  if (!file) return send(403, '403 forbidden');

  try {
    const info = await stat(file);
    if (info.isDirectory()) {
      return send(302, '', { Location: encodeURI(pathname) + '/' + search });
    }
    const headers = {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-cache'
    };
    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      return res.end();
    }
    const body = await readFile(file);
    res.writeHead(200, headers);
    res.end(body);
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return send(404, '404 not found');
    if (err.code === 'EACCES') return send(403, '403 forbidden');
    console.error('[serve]', err);
    return send(500, '500 internal error');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('端口 ' + PORT + ' 已被占用，换个端口：PORT=8081 node serve.mjs');
  } else {
    console.error('[serve]', err);
  }
  process.exit(1);
});

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  console.error('PORT 不合法：' + process.env.PORT);
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  const addr = server.address();
  console.log('练琴页面已启动：http://localhost:' + addr.port + '  （监听 ' + HOST + '）');
});
