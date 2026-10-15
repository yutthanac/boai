# Bo AI (น้องโบ v1.0) — Personal AI Desktop Assistant

แอปพลิเคชัน Desktop บน Windows 10/11 ที่ทำหน้าที่เป็นผู้ช่วย AI ส่วนตัว รองรับคำสั่งเสียงภาษาไทย, Wake Word Detection ("น้องโบ"), การปรับแต่งบุคลิกและความรู้ผ่าน Training Studio, ระบบความจำระยะยาว (Memory Bank), และเครื่องมืออำนวยความสะดวก

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **Always-on Voice & Wake Word**:
   - ตรวจจับคำเรียกหลัก **"น้องโบ"** หรือชื่อสำรองที่ตั้งไว้ (สูงสุด 3 ชื่อ)
   - ปรับความไวการตรวจจับ (Sensitivity 0–100%) พร้อมมาตรวัดระดับเสียง Real-time
   - สลับโหมด Always Listening / Mute ได้จาก Title bar และ Sidebar

2. **ระบบสนทนาครบวงจร (Speech Pipeline)**:
   - Voice Activity Detection (VAD) + Real-time Microphone Meter
   - Speech-to-Text (STT) และ Text-to-Speech (TTS) สำเนียงภาษาไทยเป็นธรรมชาติ
   - ประมวลผลด้วยโมเดลหลัก: **Claude 3.5 Sonnet** (พร้อมรองรับ OpenAI GPT-4o และ Gemini)
   - ช่องพิมพ์ข้อความสำรองและระบบเล่นเสียงซ้ำ

3. **Training Studio**:
   - **Personality**: กำหนดชื่อ, สไตล์การพูด, ระดับความเป็นทางการ (1-5), System Prompt
   - **Knowledge Base**: นำเข้าไฟล์ (.txt, .md) หรือป้อนข้อความความรู้เฉพาะทาง
   - **Example Training**: ชุดคำถาม-คำตอบตัวอย่าง (Few-shot Calibration)
   - **Test Lab**: ห้องทดลองพิมพ์สนทนาแยกจากเสียงเพื่อ Calibrate พฤติกรรม

4. **ระบบความจำ (Memory Bank)**:
   - จัดเก็บข้อมูลและความชอบของผู้ใช้ในเครื่อง (Privacy-first)
   - กำหนดระดับความสำคัญ (1–5 ดาว) และหมวดหมู่
   - รองรับ Export สำรองข้อมูลเป็นไฟล์ JSON เพื่อเตรียมพร้อมสำหรับ Cloud Sync

5. **เครื่องมือ & การเชื่อมต่อ (Tools & Integrations)**:
   - รายงานสภาพอากาศ (Weather Radar)
   - เครื่องเล่นเพลงและควบคุมสื่อ (Media Player)
   - ค้นหาข้อมูลบนเว็บ (Web Search)
   - ระบบแจ้งเตือนอัจฉริยะ (Smart Reminders)
   - คำสั่งระบบ Windows พร้อม Safe Confirmation Guard

6. **ระบบเดสก์ท็อป (Desktop Shell)**:
   - หน้าต่างแบบ Frameless สไตล์โมเดิร์น พร้อมไฟสถานะ AI State และปุ่มควบคุมหน้าต่าง
   - รองรับการทำงานในพื้นหลังผ่าน System Tray
   - คีย์ลัดด่วน (Ctrl+1 ถึง Ctrl+7 เพื่อสลับหน้า, Ctrl+Space เพื่อกดพูดทันที)

---

## 🚀 วิธีการติดตั้งและรันโปรเจกต์ (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันในโหมด Development (Web Preview)
```bash
npm run dev
```
เปิดบราวเซอร์ที่: `http://localhost:5173/`

### 3. รันในโหมด Electron Desktop App
```bash
npm run electron:dev
```

### 4. บิลด์ Production Bundle
```bash
npm run build
```

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)
```
boai/
├── electron/              # Electron Main Process & Native Handlers
│   ├── main.ts            # สร้างหน้าต่าง BrowserWindow & จัดการ Lifecycle
│   ├── preload.ts         # contextBridge API ปลอดภัยสำหรับ Renderer
│   ├── tray.ts            # Windows System Tray & Context Menu
│   └── ipc-handlers.ts    # จัดการ Window Minimize, Maximize, Auto-start
├── src/                   # React Frontend
│   ├── components/        # WindowFrame, Sidebar, AiOrbVisualizer, AudioLevelMeter
│   ├── pages/             # Home, Conversation, VoiceDevices, TrainingStudio, Memory, Tools, Settings
│   ├── services/
│   │   ├── ai/            # Claude, OpenAI, Gemini LLM API integration
│   │   ├── audio/         # Web Audio API visualizer, Wake Word, STT/TTS
│   │   └── db/            # Database Service & Schema (Local SQLite/Storage)
│   ├── stores/            # Zustand State Stores (Assistant & Audio)
│   └── types/             # TypeScript Interfaces & Definitions
├── PRODUCT.md             # Product Truth & Specifications
├── DESIGN.md              # Visual Design Tokens & Guidelines
└── package.json           # Scripts & Dependencies
```
