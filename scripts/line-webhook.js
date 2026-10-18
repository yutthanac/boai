import http from 'http';
import https from 'https';
import crypto from 'crypto';

const PORT = process.env.LINE_WEBHOOK_PORT ? parseInt(process.env.LINE_WEBHOOK_PORT) : 3000;
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '71ff04a0ec6aa3923cdc447ae7331589';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-line-signature');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url || '';
  const cleanUrl = url.split('?')[0];

  // Health check & verification GET
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'Noar AI LINE Webhook Server',
      port: PORT,
      endpoint: '/api/line/webhook',
      message: 'Server is running and ready for LINE Webhook verification'
    }, null, 2));
    return;
  }

  // Handle Send LINE Message POST (Server-to-Server Proxy, bypasses CORS)
  if (req.method === 'POST' && cleanUrl === '/api/line/send') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { token, to, message, broadcastIfNoTo } = JSON.parse(body || '{}');
        if (!token || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing token or message' }));
          return;
        }

        const useBroadcast = !to && broadcastIfNoTo;
        const targetUrl = useBroadcast
          ? 'https://api.line.me/v2/bot/message/broadcast'
          : 'https://api.line.me/v2/bot/message/push';

        const payload = useBroadcast
          ? { messages: [{ type: 'text', text: message }] }
          : { to, messages: [{ type: 'text', text: message }] };

        const payloadStr = JSON.stringify(payload);

        const lineReq = https.request(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(payloadStr),
          },
          timeout: 10000,
        }, (lineRes) => {
          let resData = '';
          lineRes.on('data', chunk => resData += chunk);
          lineRes.on('end', () => {
            const isOk = lineRes.statusCode && lineRes.statusCode >= 200 && lineRes.statusCode < 300;
            res.writeHead(lineRes.statusCode || 200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: isOk,
              statusCode: lineRes.statusCode,
              data: resData,
              error: isOk ? undefined : `LINE API HTTP ${lineRes.statusCode}: ${resData.slice(0, 250)}`
            }));
          });
        });

        lineReq.on('error', (err) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        });

        lineReq.on('timeout', () => {
          lineReq.destroy();
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Request timeout to LINE API' }));
        });

        lineReq.write(payloadStr);
        lineReq.end();
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Webhook POST Handler (Supports /api/line/webhook, /apl/line/webhook, /webhook)
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const signature = req.headers['x-line-signature'];
        if (CHANNEL_SECRET && signature) {
          const hash = crypto
            .createHmac('sha256', CHANNEL_SECRET)
            .update(body)
            .digest('base64');
          if (hash !== signature) {
            console.warn('[LINE Webhook] Signature mismatch (proceeding for Verify)');
          }
        }

        const payload = JSON.parse(body || '{}');
        const events = payload.events || [];
        console.log(`[LINE Webhook] Received ${events.length} event(s) from LINE:`, events);

        for (const ev of events) {
          if (ev.source?.userId) {
            console.log('[LINE Webhook] Captured User ID:', ev.source.userId);
          }
        }

        // Return 200 OK immediately for LINE platform
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: events.length }));
      } catch (err) {
        console.warn('[LINE Webhook] Error parsing payload:', err);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, warning: err.message }));
      }
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok' }));
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[LINE Webhook] Port ${PORT} already in use, listening on another process.`);
  } else {
    console.error('[LINE Webhook] Error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`[LINE Webhook] Standalone server listening on http://localhost:${PORT}/api/line/webhook`);
});
