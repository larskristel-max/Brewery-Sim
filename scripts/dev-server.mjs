import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const publicRoot = join(root, 'public');
const port = Number(process.env.PORT ?? 4173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.map', 'application/json; charset=utf-8']
]);

const noCacheHeaders = {
  'cache-control': 'no-store, max-age=0',
  pragma: 'no-cache',
  expires: '0'
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = normalize(requestedPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePaths = requestedPath.startsWith('/assets/')
    ? [join(root, safePath), join(publicRoot, safePath)]
    : [join(root, safePath)];

  for (const filePath of filePaths) {
    try {
      const body = await readFile(filePath);
      response.writeHead(200, {
        'content-type': types.get(extname(filePath)) ?? 'application/octet-stream',
        ...noCacheHeaders
      });
      response.end(body);
      return;
    } catch {
      // Try the next candidate.
    }
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...noCacheHeaders });
  response.end('Not found');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Brewery Sim prototype running at http://localhost:${port}`);
});
