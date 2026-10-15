import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import https from 'https';

const ttsPlugin: Plugin = {
  name: 'tts-proxy-plugin',
  configureServer(server) {
    server.middlewares.use('/api/tts', (req, res) => {
      try {
        const urlObj = new URL(req.url || '', 'http://localhost');
        const text = urlObj.searchParams.get('text') || '';
        if (!text) {
          res.statusCode = 400;
          res.end('Missing text query parameter');
          return;
        }

        const encoded = encodeURIComponent(text.slice(0, 200));
        const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=th&client=tw-ob`;

        const googleReq = https.get(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/'
          }
        }, (googleRes) => {
          res.statusCode = googleRes.statusCode || 200;
          res.setHeader('Content-Type', googleRes.headers['content-type'] || 'audio/mpeg');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          googleRes.pipe(res);
        });

        googleReq.on('error', (err) => {
          res.statusCode = 500;
          res.end(err.message);
        });
      } catch (err: any) {
        res.statusCode = 500;
        res.end(err.message);
      }
    });

    server.middlewares.use('/api/music/search', (req, res) => {
      try {
        const urlObj = new URL(req.url || '', 'http://localhost');
        const q = urlObj.searchParams.get('q') || '';
        if (!q) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ videoId: null }));
          return;
        }

        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
        const ytReq = https.get(ytUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8',
          }
        }, (ytRes) => {
          let body = '';
          ytRes.on('data', chunk => (body += chunk));
          ytRes.on('end', () => {
            const matches = [...body.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
            const videoId = matches.length > 0 ? matches[0][1] : null;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ videoId }));
          });
        });

        ytReq.on('error', () => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ videoId: null }));
        });
        ytReq.setTimeout(5000, () => {
          ytReq.destroy();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ videoId: null }));
        });
      } catch (_) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ videoId: null }));
      }
    });
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), ttsPlugin],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: false
  }
});
