import { db } from '../db/databaseService';
import { ReminderItem } from '../../types';

export interface LineScheduleResult {
  success: boolean;
  message: string;
  count?: number;
  dateLabel?: string;
  error?: string;
}

export class LineService {
  private static instance: LineService;

  private constructor() {
    // Listen for Webhook-detected User ID updates
    if (typeof window !== 'undefined') {
      window.addEventListener('noar-line-user-updated', ((e: CustomEvent) => {
        if (e.detail?.userId) {
          console.log('[LineService] Connected LINE User ID updated:', e.detail.userId);
        }
      }) as EventListener);
    }
  }

  public static getInstance(): LineService {
    if (!LineService.instance) {
      LineService.instance = new LineService();
    }
    return LineService.instance;
  }

  // Retrieve Channel Secret
  public getChannelSecret(): string {
    const settings = db.getSettings();
    return (
      settings.line_channel_secret ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LINE_CHANNEL_SECRET) ||
      '71ff04a0ec6aa3923cdc447ae7331589'
    ).trim();
  }

  // Retrieve Channel Access Token
  public getChannelAccessToken(): string {
    const settings = db.getSettings();
    return (
      settings.line_channel_access_token ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LINE_CHANNEL_ACCESS_TOKEN) ||
      this.getChannelSecret()
    ).trim();
  }

  // Retrieve stored LINE User ID
  public getLineUserId(): string {
    return db.getLineUserId().trim();
  }

  // Set LINE User ID manually or via Webhook
  public setLineUserId(userId: string): void {
    db.setLineUserId(userId.trim());
  }

  // Format schedule for today or specified date
  public getFormattedScheduleForDate(dateQuery?: string): {
    text: string;
    items: ReminderItem[];
    dateLabel: string;
  } {
    const reminders = db.getReminders();
    const now = new Date();
    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    let targetDateStr = '';
    let filtered: ReminderItem[] = [];

    const query = (dateQuery || '').toLowerCase().trim();

    if (query.includes('พรุ่งนี้') || query.includes('tomorrow')) {
      const tomorrow = new Date(now.getTime() + 86400000);
      const dayName = thaiDays[tomorrow.getDay()];
      const dateNum = tomorrow.getDate();
      const monthName = thaiMonths[tomorrow.getMonth()];
      const yearBE = tomorrow.getFullYear() + 543;
      targetDateStr = `พรุ่งนี้ (${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${yearBE})`;

      filtered = reminders.filter(r => {
        const t = (r.time || '').toLowerCase();
        const title = (r.title || '').toLowerCase();
        return t.includes('พรุ่งนี้') || title.includes('พรุ่งนี้') || t.includes(`${dateNum}`);
      });
    } else {
      // Specific date check (e.g., "วันที่ 19", "19 ต.ค.")
      const dateMatch = query.match(/(?:วันที่|ที่)?\s*(\d{1,2})/);
      if (dateMatch && !query.includes('วันนี้')) {
        const specificDay = dateMatch[1];
        targetDateStr = `วันที่ ${specificDay} ${thaiMonths[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;
        filtered = reminders.filter(r => {
          const t = (r.time || '').toLowerCase();
          const title = (r.title || '').toLowerCase();
          return t.includes(specificDay) || title.includes(specificDay);
        });
      } else {
        // Default: วันนี้ (Today)
        const dayName = thaiDays[now.getDay()];
        const dateNum = now.getDate();
        const monthName = thaiMonths[now.getMonth()];
        const yearBE = now.getFullYear() + 543;
        targetDateStr = `วันนี้ (${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${yearBE})`;

        // Pending items or items marked for today
        const todayStr = `${dateNum}`;
        filtered = reminders.filter(r => {
          if (!r.completed) return true;
          const t = (r.time || '').toLowerCase();
          return t.includes('วันนี้') || t.includes(todayStr) || !t.includes('พรุ่งนี้');
        });
      }
    }

    if (filtered.length === 0) {
      // If specific filter yielded 0, but there are active reminders, return all pending as today's tasks
      const pending = reminders.filter(r => !r.completed);
      if (pending.length > 0) {
        filtered = pending;
      }
    }

    const pendingList = filtered.filter(r => !r.completed);
    const completedList = filtered.filter(r => r.completed);

    let messageText = `[ตารางงานและการแจ้งเตือน - ${targetDateStr}]\n`;
    messageText += `จาก: โนอา (Noar AI Assistant)\n`;
    messageText += `------------------------------------\n`;

    if (pendingList.length > 0) {
      messageText += `\n[รายการที่ต้องทำ (${pendingList.length} รายการ)]:\n`;
      pendingList.forEach((r, idx) => {
        messageText += `${idx + 1}. [${r.time}] ${r.title}\n`;
      });
    }

    if (completedList.length > 0) {
      messageText += `\n[รายการที่เสร็จสิ้นแล้ว (${completedList.length} รายการ)]:\n`;
      completedList.forEach((r, idx) => {
        messageText += `${idx + 1}. [${r.time}] ${r.title} (เสร็จแล้ว)\n`;
      });
    }

    if (filtered.length === 0) {
      messageText += `\n(ไม่มีรายการตารางงานที่บันทึกไว้สำหรับช่วงเวลานี้)\n`;
    }

    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    messageText += `\n------------------------------------\n`;
    messageText += `ส่งเมื่อ: ${now.getDate()} ${thaiMonths[now.getMonth()]} เวลา ${currentHours}:${currentMins} น.`;

    return {
      text: messageText,
      items: filtered,
      dateLabel: targetDateStr,
    };
  }

  // Send schedule to LINE Official Account (Push or Broadcast)
  public async sendScheduleToLine(dateQuery?: string): Promise<LineScheduleResult> {
    const { text, items, dateLabel } = this.getFormattedScheduleForDate(dateQuery);

    if (items.length === 0) {
      return {
        success: false,
        dateLabel,
        message: `ตอนนี้คุณยังไม่มีรายการตารางงานหรือการแจ้งเตือนที่บันทึกไว้สำหรับ ${dateLabel} เลยค่ะ บอกให้โนอาช่วยบันทึกก่อนได้เลยนะคะ เช่น "โนอา บันทึกตารางงานส่งโปรเจกต์ตอนบ่ายสองให้หน่อย" ค่ะ`,
      };
    }

    const token = this.getChannelAccessToken();
    const userId = this.getLineUserId();

    if (!token) {
      return {
        success: false,
        message: 'ยังไม่ได้ระบุคีย์ LINE OA ในระบบค่ะ กรุณาระบุในไฟล์ .env หรือหน้าตั้งค่าก่อนนะคะ',
      };
    }

    try {
      // 1. Electron Native IPC execution (bypasses browser CORS completely)
      if (typeof window !== 'undefined' && (window as any).electronAPI?.sendLineMessage) {
        const res = await (window as any).electronAPI.sendLineMessage({
          token,
          to: userId || undefined,
          message: text,
          broadcastIfNoTo: true,
        });

        if (res.success) {
          return {
            success: true,
            count: items.length,
            dateLabel,
            message: `โนอาส่งตารางงานของ${dateLabel} (${items.length} รายการ) ไปที่ LINE OA ให้เรียบร้อยแล้วค่ะ`,
          };
        }

        // If 401 Unauthorized, provide crystal-clear guidance
        if (res.statusCode === 401 || (res.error && res.error.includes('401'))) {
          return {
            success: false,
            error: res.error,
            message: `ส่งไม่สำเร็จเนื่องจากรหัส Token ไม่ถูกต้องค่ะ หากรหัสที่คุณระบุคือ Channel Secret (32 หลัก) กรุณาเข้าไปที่ LINE Developers Console ในแท็บ Messaging API แล้วกดปุ่ม Issue ตรง Channel access token (long-lived) แล้วนำมาใส่ในหน้าตั้งค่า หรือไฟล์ .env นะคะ`,
          };
        }

        return {
          success: false,
          error: res.error,
          message: `ส่งข้อความเข้า LINE ไม่สำเร็จค่ะ (${res.error || 'Unknown Error'}) ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือ LINE Access Token อีกครั้งนะคะ`,
        };
      }

      // 2. Browser Fetch fallback (via proxy to avoid browser CORS restrictions)
      let resp: Response;
      const proxyPayload = JSON.stringify({
        token,
        to: userId || undefined,
        message: text,
        broadcastIfNoTo: true,
      });

      try {
        resp = await fetch('/api/line/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: proxyPayload,
        });
      } catch {
        // Fallback to standalone webhook server on port 3000
        resp = await fetch('http://localhost:3000/api/line/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: proxyPayload,
        });
      }

      const result = await resp.json().catch(() => ({}));

      if (!resp.ok || !result.success) {
        const errorMsg = result.error || `HTTP ${resp.status}`;
        if (resp.status === 401 || errorMsg.includes('401') || token.length <= 40) {
          return {
            success: false,
            error: '401 Unauthorized',
            message: `ส่งไม่สำเร็จเนื่องจากรหัส Token ไม่ถูกต้อง (401) ค่ะ รหัสที่คุณระบุ (${token.slice(0, 8)}...) คือ Channel Secret (32 หลัก) ซึ่งใช้รับ Webhook เท่านั้น หากต้องการส่งข้อความออก ให้เข้าไปที่ LINE Developers Console ในแท็บ Messaging API เลื่อนลงล่างสุดแล้วกดปุ่ม Issue ตรง Channel access token (long-lived) แล้วนำ Token ตัวยาวมาใส่นะคะ`,
          };
        }
        throw new Error(errorMsg);
      }

      return {
        success: true,
        count: items.length,
        dateLabel,
        message: `โนอาส่งตารางงานของ${dateLabel} (${items.length} รายการ) ไปที่ LINE OA ให้เรียบร้อยแล้วค่ะ`,
      };
    } catch (e: any) {
      console.warn('[LineService] Send error:', e);
      return {
        success: false,
        error: e?.message,
        message: `ส่งข้อความเข้า LINE ไม่สำเร็จค่ะ (${e?.message || 'ข้อผิดพลาดระบบ'})`,
      };
    }
  }
}

export const lineService = LineService.getInstance();
