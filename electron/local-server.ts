import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

let server: http.Server | null = null;
let currentPort = 0;

export function startLocalServer(distPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server && currentPort) {
      resolve(currentPort);
      return;
    }

    server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
        const pathname = parsedUrl.pathname;

        // 1. TTS Proxy: /api/tts
        if (pathname === '/api/tts') {
          const text = parsedUrl.searchParams.get('text') || '';
          if (!text) {
            res.statusCode = 400;
            res.end('Missing text query parameter');
            return;
          }
          const encoded = encodeURIComponent(text.slice(0, 200));
          const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=th&client=tw-ob`;

          const googleReq = https.get(
            targetUrl,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: 'https://translate.google.com/',
              },
            },
            (googleRes) => {
              res.statusCode = googleRes.statusCode || 200;
              res.setHeader('Content-Type', googleRes.headers['content-type'] || 'audio/mpeg');
              res.setHeader('Cache-Control', 'public, max-age=86400');
              googleRes.pipe(res);
            }
          );
          googleReq.on('error', (err) => {
            res.statusCode = 500;
            res.end(err.message);
          });
          return;
        }

        // 2. Music Search Proxy: /api/music/search
        if (pathname === '/api/music/search') {
          const q = parsedUrl.searchParams.get('q') || '';
          if (!q) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ videoId: null }));
            return;
          }

          const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
          const ytReq = https.get(
            ytUrl,
            {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
              },
            },
            (ytRes) => {
              let body = '';
              ytRes.on('data', (chunk) => (body += chunk));
              ytRes.on('end', () => {
                const matches = [...body.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
                const videoId = matches.length > 0 ? matches[0][1] : null;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ videoId }));
              });
            }
          );
          ytReq.on('error', () => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ videoId: null }));
          });
          return;
        }

        // 3. Static Files from dist directory (with SPA fallback to index.html)
        let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
        if (safePath === '/' || !safePath) safePath = '/index.html';

        let filePath = path.join(distPath, safePath);

        // If file doesn't exist or is a directory, fallback to index.html for SPA
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(distPath, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      } catch (err: any) {
        res.statusCode = 500;
        res.end(`Internal Server Error: ${err?.message}`);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server?.address();
      if (addr && typeof addr === 'object') {
        currentPort = addr.port;
        console.log(`[LocalServer] Production server running on http://127.0.0.1:${currentPort}`);
        resolve(currentPort);
      } else {
        reject(new Error('Failed to obtain server address'));
      }
    });

    server.on('error', (err) => {
      console.error('[LocalServer] Error:', err);
      reject(err);
    });
  });
}

export function stopLocalServer(): void {
  if (server) {
    server.close();
    server = null;
    currentPort = 0;
  }
}
