import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};
http.createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const filename = path.resolve(
            root,
            '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''),
        );
        if (!filename.startsWith(root + path.sep)) {
            response.writeHead(403).end();
            return;
        }
        const contents = await readFile(filename);
        response
            .writeHead(200, {
                'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
            })
            .end(contents);
    } catch {
        response.writeHead(404).end();
    }
}).listen(4176, '127.0.0.1', () => console.log('Test server: http://127.0.0.1:4176'));
