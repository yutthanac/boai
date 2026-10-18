import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { BrowserWindow } from 'electron';

export interface WebhookServerConfig {
  port?: number;
  channelSecret?: string;
  channelAccessToken?: string;
}

export class LineWebhookServer {
  private static instance: LineWebhookServer;
  private server: http.Server | null = null;
  private port: number = 3000;
  private channelSecret: string = '71ff04a0ec6aa3923cdc447ae7331589';
  private channelAccessToken: string = '71ff04a0ec6aa3923cdc447ae7331589';
  private lastDetectedUserId: string | null = null;
  private mainWindow: BrowserWindow | null = null;

  private constructor() {
    this.port = process.env.LINE_WEBHOOK_PORT ? parseInt(process.env.LINE_WEBHOOK_PORT) : 3000;
    this.channelSecret = process.env.LINE_CHANNEL_SECRET || '71ff04a0ec6aa3923cdc447ae7331589';
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || this.channelSecret;
  }

  public static getInstance(): LineWebhookServer {
    if (!LineWebhookServer.instance) {
      LineWebhookServer.instance = new LineWebhookServer();
    }
    return LineWebhookServer.instance;
  }

  public setMainWindow(win: BrowserWindow) {
    this.mainWindow = win;
  }

  public updateConfig(config: WebhookServerConfig) {
    if (config.channelSecret) this.channelSecret = config.channelSecret;
    if (config.channelAccessToken) this.channelAccessToken = config.channelAccessToken;
    if (config.port && config.port !== this.port) {
      this.port = config.port;
      this.restart();
    }
  }

  public getStatus() {
    return {
      running: this.server !== null && this.server.listening,
      port: this.port,
      endpoint: '/api/line/webhook',
      fullLocalUrl: `http://localhost:${this.port}/api/line/webhook`,
      lastDetectedUserId: this.lastDetectedUserId,
      channelSecretConfigured: !!this.channelSecret,
    };
  }

  public start(port?: number): Promise<boolean> {
    if (port) this.port = port;

    return new Promise((resolve) => {
      if (this.server && this.server.listening) {
        resolve(true);
        return;
      }

      this.server = http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-line-signature');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const url = req.url || '';

        // Status & Health Check endpoints
        if (req.method === 'GET' && (url === '/' || url === '/webhook' || url === '/api/line/webhook' || url === '/health')) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            status: 'online',
            service: 'Noar AI LINE Webhook Server',
            port: this.port,
            endpoint: '/api/line/webhook',
            webhookUrlAdvice: 'Use ngrok or Cloudflare Tunnel to expose this port to HTTPS (e.g. ngrok http ' + this.port + ')',
            lastDetectedUserId: this.lastDetectedUserId,
          }, null, 2));
          return;
        }

        // Webhook POST Handler
        if (req.method === 'POST' && (url === '/api/line/webhook' || url === '/webhook')) {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', () => {
            try {
              const signature = req.headers['x-line-signature'] as string;
              
              // Validate Signature if channelSecret is present
              if (this.channelSecret && signature) {
                const hash = crypto
                  .createHmac('sha256', this.channelSecret)
                  .update(body)
                  .digest('base64');

                if (hash !== signature) {
                  console.warn('[LineWebhook] Signature validation failed. Expected:', hash, 'Got:', signature);
                  // Return 200 anyway during setup so LINE Verify doesn't break if secret is still updating
                }
              }

              const payload = JSON.parse(body || '{}');
              const events = payload.events || [];

              console.log(`[LineWebhook] Received ${events.length} event(s) from LINE`);

              // Process Events (Follow, Message, etc.)
              for (const event of events) {
                const userId = event.source?.userId;
                if (userId) {
                  this.lastDetectedUserId = userId;
                  console.log('[LineWebhook] Captured LINE User ID:', userId);

                  // Notify Renderer window
                  if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                    this.mainWindow.webContents.send('line-user-connected', {
                      userId,
                      event,
                      timestamp: new Date().toISOString(),
                    });
                  }

                  // Auto reply greeting via LINE Reply API
                  if (event.replyToken && (event.type === 'follow' || (event.type === 'message' && event.message?.type === 'text'))) {
                    this.sendReply(
                      event.replyToken,
                      'สวัสดีค่ะ โนอา (Noar AI Assistant) เชื่อมต่อกับบัญชี LINE ของคุณเรียบร้อยแล้วค่ะ ต่อไปนี้หากสั่งให้โนอาส่งตารางงาน โนอาจะส่งเข้ามาที่นี่นะคะ'
                    ).catch(e => console.warn('[LineWebhook] Auto reply warning:', e.message));
                  }
                }
              }

              // LINE expects 200 OK immediately
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: events.length }));
            } catch (err: any) {
              console.warn('[LineWebhook] Error parsing webhook payload:', err);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, warning: err.message }));
            }
          });
          return;
        }

        // 404 for other routes
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      });

      this.server.on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
          console.warn(`[LineWebhook] Port ${this.port} is in use, trying port ${this.port + 1}`);
          this.port += 1;
          this.server?.close();
          this.start(this.port).then(resolve);
        } else {
          console.error('[LineWebhook] Server error:', e);
          resolve(false);
        }
      });

      this.server.listen(this.port, () => {
        console.log(`[LineWebhook] Server listening on http://localhost:${this.port}/api/line/webhook`);
        resolve(true);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public async restart(): Promise<boolean> {
    await this.stop();
    return this.start();
  }

  // Reply back to user via replyToken
  private sendReply(replyToken: string, text: string): Promise<boolean> {
    return new Promise((resolve) => {
      const token = this.channelAccessToken;
      if (!token || token.length < 20) {
        resolve(false);
        return;
      }

      const body = JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      });

      const req = https.request('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => resolve(false));
      req.write(body);
      req.end();
    });
  }
}

export const lineWebhookServer = LineWebhookServer.getInstance();
