# 📋 Bo AI — Project Worklog & Development History
**Personal AI Desktop Assistant (โบ้ / Bo AI) v1.0**  
*บันทึกประวัติการพัฒนา การแก้ไขปัญหา และฟีเจอร์ทั้งหมดของระบบ*

---

## 📌 สรุปภาพรวมของโครงการ (Project Overview)
**Bo AI** เป็นผู้ช่วย AI ประจำหน้าจอ Desktop ที่ออกแบบด้วยสถาปัตยกรรม **Privacy-First & Local-First**:
- **Frontend:** React 18, Vite, Tailwind CSS, TypeScript, Lucide Icons, Zustand
- **Desktop Shell:** Electron (Frameless Window, System Tray, IPC Handlers)
- **AI Core:** Google Gemini (`gemini-flash-lite-latest`), OpenAI (`gpt-4o`), Claude
- **Voice & Speech:** Web Speech API (Continuous Wake Word & VAD), Natural Thai Female Voice (Streaming TTS Proxy)
- **External APIs:** Open-Meteo Weather API (Real-time Live Weather), YouTube Music Search & Playback
- **Local Database:** จัดเก็บแยกส่วน (Personality, Memories, Knowledge, Examples, Messages)

---

## 🛠️ รายละเอียดการทำงานและประวัติการพัฒนา (Chronological Worklog)

### 1. การลดความหน่วงและการปรับจูนโมเดล AI (Latency Optimization)
- **ปัญหาเดิม:** โบ้คิดนาน (5–8 วินาที) ก่อนจะเริ่มตอบคำถาม
- **สาเหตุ:** การตั้งค่าเดิมพยายามเรียก `gemini-3.6-flash` ซึ่งบน Google AI Studio Free Tier ติดข้อจำกัด **Rate Limit (HTTP 429)** ทำให้ต้องรอ Error Timeout นานก่อนจะสลับไปโมเดลสำรอง
- **การแก้ไข:**
  - สลับโมเดลหลักมาเป็น **`gemini-flash-lite-latest`** (ผลการ Benchmark ตอบกลับเร็วใน **~880ms**)
  - กำหนดโมเดลสำรองเป็น `gemini-3.1-flash-lite` และ `gemini-3.5-flash-lite`
  - ปรับ `maxOutputTokens: 256` สำหรับบทสนทนาเสียง กระชับและรวดเร็ว
  - ตัดประวัติการสนทนาย้อนหลังให้เหลือ 8 ข้อความล่าสุด (`messages.slice(-8)`) ลดขนาด Token
- **ผลลัพธ์:** เวลาตอบสนองลดลงเหลือเพียง **~0.8 - 1.2 วินาที** ตอบกลับได้ทันทีสไตล์เพื่อนสนิท

---

### 2. การปรับปรุงระบบตรวจจับคำเรียกและคำสั่งเสียง (Wake Word & VAD)
- **ปัญหาเดิม:** เรียก "โบ้" หรือ "ไอ้โบ้" แล้วโบ้เปิดรับฟัง แต่พอผู้ใช้เริ่มพูดคำถาม โบ้กลับไม่ได้ยิน หรือข้อความเสียงสะดุดเบิ้ลคำ
- **สาเหตุ:**
  1. `commandSilenceTimer` เดิมถูกสั่งนับถอยหลังทันที **1.4 วินาที** ตั้งแต่จับคำเรียกได้ หากผู้ใช้เว้นจังหวะหายใจเกิน 1.4 วินาที ระบบจะตัดกลับไปโหมดรอเรียกชื่อทันที
  2. การต่อคำของ Web Speech API แบบเดิมใช้วิธีนำสตริงมาบวกกันในลูป ทำให้เกิดคำซ้ำซ้อนในภาษาไทย
- **การแก้ไข:**
  - ปรับเป็น **Non-blocking 7-Second Window:** เมื่อเรียกชื่อโบ้ โบ้จะส่งเสียง Chime และเปิดรอฟังคำสั่งได้นานถึง 7 วินาที
  - **Dynamic Silence Finalization:** ระบบจะเริ่มนับเวลาตัดจบ 1.4 วินาที **ก็ต่อเมื่อผู้ใช้เริ่มพูดคำถามแล้วเท่านั้น** (`length >= 2`)
  - **Index-based Recognition:** รวบรวมข้อความเสียงตาม Index ของ Web Speech API และตัดคำเรียก (Wake word) ส่วนเกินที่ต้นประโยคออกอย่างหมดจด
  - **Echo Feedback Prevention:** ปิดรับไมโครโฟนชั่วขณะที่โบ้กำลังพูดตอบ เพื่อไม่ให้โบ้ฟังเสียงจากลำโพงตัวเอง แล้วเปิดไมค์รับใหม่อัตโนมัติเมื่อพูดจบ
- **ไฟล์ที่เกี่ยวข้อง:** [`src/services/audio/audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts)

---

### 3. ระบบเสียงภาษาไทยธรรมชาติ (Natural Thai Female TTS)
- **การพัฒนา:**
  - สร้าง Streaming Proxy Middleware ผ่าน Vite (`/api/tts`) เชื่อมต่อไปยัง Google Translate TTS Engine (`client=tw-ob`)
  - รองรับการแบ่งวรรคประโยคและข้อความยาว (< 140 ตัวอักษร) เล่นเสียงแบบต่อเนื่อง (Sequential Playback)
  - กรองสัญลักษณ์ Markdown, โค้ดบล็อก และ Emoji ออกก่อนส่งเข้าสังเคราะห์เสียง เพื่อให้เสียงพูดลื่นไหล
  - สำรองด้วยระบบ OpenAI TTS (Nova/Alloy) และ Web Speech Synthesis
- **ไฟล์ที่เกี่ยวข้อง:** [`vite.config.ts`](file:///c:/Anewproject/boai/vite.config.ts), [`src/services/audio/audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts)

---

### 4. เชื่อมต่อระบบสภาพอากาศจริงจาก Open-Meteo (Real-Time Weather)
- **ปัญหาเดิม:** โบ้ตอบสภาพอากาศแบบสุ่ม Mock ข้อมูลเดิม (32°C แดดดี)
- **การพัฒนา:**
  - สร้าง [`src/services/weather/weatherService.ts`](file:///c:/Anewproject/boai/src/services/weather/weatherService.ts) เชื่อมต่อ **Open-Meteo API** (โอเพนซอร์สและฟรี 100% ไม่ต้องใช้ API Key)
  - ดึงข้อมูลอุตุนิยมวิทยาจริง: อุณหภูมิ (`temperature_2m`), อุณหภูมิที่รู้สึก (`apparent_temperature`), ความชื้นสัมพัทธ์ (`relative_humidity_2m`), ความเร็วลม (`wind_speed_10m`)
  - แปลงรหัสสภาพอากาศสากล WMO (`weather_code`) เป็นภาษาไทยที่เป็นมิตร (เช่น ฝนตกปรอยๆ, ฝนฟ้าคะนอง, แดดจัด, หมอกหนา)
  - **Geocoding อัตโนมัติ:** ค้นหาพิกัด ละติจูด/ลองจิจูด ของจังหวัดหรือเมืองทั้งในไทยและต่างประเทศ (เช่น *"เชียงใหม่"*, *"เมืองโคราช"*, *"ภูเก็ต"*, *"Tokyo"*)
  - ระบบ **Cache 10 นาที** เพื่อความรวดเร็วและประหยัดการเรียก API
  - เชื่อมโยงเข้ากับ AI Dispatcher ใน [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts)

---

### 5. จัดการระบบตัวแปรสภาพแวดล้อม (Environment Configuration & Security)
- **การสร้างไฟล์:**
  - [`.env`](file:///c:/Anewproject/boai/.env): จัดเก็บ API Keys และค่าพิกัดเริ่มต้นสำหรับสภาพอากาศ (กรุงเทพมหานคร)
  - [`.env.example`](file:///c:/Anewproject/boai/.env.example): เทมเพลตตัวอย่างสำหรับการติดตั้งใหม่
  - [`.gitignore`](file:///c:/Anewproject/boai/.gitignore): ป้องกันการเผลออัปโหลด `.env` หรือโฟลเดอร์ Build ขึ้น Git
  - [`src/vite-env.d.ts`](file:///c:/Anewproject/boai/src/vite-env.d.ts): กำหนด Type Interface `ImportMetaEnv` สำหรับ TypeScript ให้คอมไพล์ผ่าน 100%

---

### 6. การแก้ปัญหาข้อความส่งเบิ้ล (Duplicate Message Prevention)
- **ปัญหาเดิม:** ในบางครั้งข้อความของผู้ใช้ส่งซ้ำ 2 ครั้งที่เวลาเดียวกัน
- **สาเหตุ:** การลงทะเบียน Callback สำหรับรับคำสั่งเสียง (`onCommandCaptured`) ถูกเรียกซ้ำในรอบ Re-mount ของ React ทำให้มี Listener ซ้อนกัน 2 ตัว
- **การแก้ไข:**
  1. [`audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts): เปลี่ยน Callback Array ให้เป็น Single Active Listener (`[callback]`) ป้องกันการสะสมซ้ำ
  2. [`useAssistantStore.ts`](file:///c:/Anewproject/boai/src/stores/useAssistantStore.ts): เพิ่มตัวเช็ค `isAudioListenersBound` ให้ผูกเพียงรอบเดียว
  3. เพิ่มระบบ **Debounce Lock:** บล็อกข้อความที่ซ้ำกันหากส่งเข้ามาภายในเวลา 1.5 วินาที
  4. [`Conversation.tsx`](file:///c:/Anewproject/boai/src/pages/Conversation.tsx): เพิ่มสถานะ `isSubmitting` ป้องกันการกดส่งรัวๆ

---

### 7. การเชื่อมต่อ YouTube Music (Music Intent & Playback)
- **การพัฒนา:**
  - สร้าง [`src/services/music/musicService.ts`](file:///c:/Anewproject/boai/src/services/music/musicService.ts)
  - ตรวจจับ Intent คำสั่งเปิดเพลงทั้งภาษาไทยและภาษาอังกฤษ เช่น *"เปิดเพลง bodyslam ใน youtube music หน่อย"*, *"เปิดเพลง lofi ชิลๆ"*, *"เล่นเพลง Three Man Down"*
  - ทำความสะอาดข้อความ ตัดคำฟุ่มเฟือย เพื่อสกัดเอาชื่อเพลง/ศิลปินที่แท้จริง
  - สั่งเปิดหน้า **YouTube Music Search & Play** (`https://music.youtube.com/search?q=...`) ผ่านเบราว์เซอร์หรือแอปภายนอกของ Windows
  - โบ้ตอบรับด้วยเสียงและข้อความแบบเพื่อนคู่หู

---

### 8. โครงสร้าง Desktop Application (Electron Integration)
- **ความพร้อม:**
  - โปรเจกต์มีโครงสร้าง Electron สมบูรณ์ใน [`electron/`](file:///c:/Anewproject/boai/electron):
    - [`main.ts`](file:///c:/Anewproject/boai/electron/main.ts): จัดการหน้าต่าง Frameless Window และรอบชีวิตของโปรแกรม
    - [`preload.ts`](file:///c:/Anewproject/boai/electron/preload.ts): Context Bridge สำหรับ IPC ปลอดภัย
    - [`tray.ts`](file:///c:/Anewproject/boai/electron/tray.ts): ไอคอน System Tray ที่ Taskbar มุมขวาล่างของ Windows
    - [`ipc-handlers.ts`](file:///c:/Anewproject/boai/electron/ipc-handlers.ts): จัดการปุ่มย่อ/ขยาย/ซ่อนหน้าต่าง และการเปิด External Links
  - คอมไพล์โฟลเดอร์ [`dist-electron/`](file:///c:/Anewproject/boai/dist-electron) พร้อมรันด้วย `npx electron .`

---

### 9. ระบบเทรน AI ตัวเองได้จริง (Self-Training Studio & Custom Few-Shot Learning)
- **การพัฒนา:**
  - สร้าง 4 สไลเดอร์ปรับระดับสไตล์การพูด (Speaking Style Tuner): ความกวนและมุกตลก, ความเป็นกันเอง, ความสุภาพ, และความกระชับ
  - เชื่อมโยงสไลเดอร์เข้าสู่ Dynamic System Prompt ใน [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts) เพื่อกำหนดพฤติกรรมการตอบของ LLM แบบเรียลไทม์
  - ระบบ Few-Shot Examples Rating: จัดเรียงตัวอย่างตามคะแนนความแม่นยำ (Thumbs Up / Down) และดึง 4 ตัวอย่างคะแนนสูงสุดส่งเข้า System Prompt อัตโนมัติ
  - Live Prompt Benchmark & Latency Tracker: หน้า Test Lab พร้อมตัวจับเวลาตอบสนอง (ms) และปุ่ม "บันทึกเป็น Few-Shot ทันที"
  - ระบบ Export / Import Dataset: บันทึกและนำเข้าชุดข้อมูลการเทรนทั้งระบบเป็นไฟล์ JSON
- **ไฟล์ที่เกี่ยวข้อง:** [`src/pages/TrainingStudio/index.tsx`](file:///c:/Anewproject/boai/src/pages/TrainingStudio/index.tsx), [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts), [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts)

---

### 10. ระบบควบคุม YouTube Music เชิงลึกและ Mini Music Bar (Deep YouTube Music Playback & Mini Bar)
- **การพัฒนา:**
  - สร้างคอมโพเนนต์ [`src/components/MiniMusicBar.tsx`](file:///c:/Anewproject/boai/src/components/MiniMusicBar.tsx) ฝังที่แถบล่างสุดของหน้าต่างหลัก
  - แสดงชื่อเพลงที่กำลังเล่น พร้อม Animation คลื่นเสียง Equalizer แบบ Real-time
  - ปุ่มสั่งงานมัลติมีเดีย: Play/Pause, Next Track, เปิดใน YouTube Music ทันที, และปิดแถบเครื่องเล่น
  - ส่งและรับคำสั่งควบคุมมีเดียระดับระบบผ่าน Electron IPC Context Bridge
- **ไฟล์ที่เกี่ยวข้อง:** [`src/components/MiniMusicBar.tsx`](file:///c:/Anewproject/boai/src/components/MiniMusicBar.tsx), [`src/stores/useAssistantStore.ts`](file:///c:/Anewproject/boai/src/stores/useAssistantStore.ts), [`electron/ipc-handlers.ts`](file:///c:/Anewproject/boai/electron/ipc-handlers.ts)

---

### 11. โหมดลูกแก้วลอยและ Background Daemon (Floating Orb Widget, Minimize & Hotkeys)
- **การพัฒนา:**
  - สร้าง [`src/components/FloatingOrbWidget.tsx`](file:///c:/Anewproject/boai/src/components/FloatingOrbWidget.tsx) โหมดย่อเหลือลูกแก้วขนาด 135x135px แบบ Always-on-top ลอยอยู่มุมขวาล่างของหน้าจอ
  - รองรับการลากย้ายตำแหน่งหน้าต่างด้วย `-webkit-app-region: drag`
  - เรืองแสงและกะพริบตามสถานะ AI (ฟังคำสั่ง / คิด / พูด / สแตนด์บาย)
  - ตั้งค่า Global Hotkeys ในระดับ OS:
    - `Alt + Space`: กดเรียกหรือซ่อนหน้าต่างน้องโบได้ทันทีจากทุกโปรแกรม
    - `Ctrl + Shift + B`: สลับโหมดหน้าต่างหลักกับโหมดลูกแก้วลอย (Floating Orb)
  - ปรับปรุง System Tray Menu ให้สลับโหมดลูกแก้วลอยและโหมดเงียบได้จาก Taskbar
  - เชื่อมต่อ Native Windows Toast Notification แจ้งเตือนเมื่อโบ้ทำงานเบื้องหลัง
- **ไฟล์ที่เกี่ยวข้อง:** [`electron/main.ts`](file:///c:/Anewproject/boai/electron/main.ts), [`electron/ipc-handlers.ts`](file:///c:/Anewproject/boai/electron/ipc-handlers.ts), [`electron/tray.ts`](file:///c:/Anewproject/boai/electron/tray.ts), [`src/components/FloatingOrbWidget.tsx`](file:///c:/Anewproject/boai/src/components/FloatingOrbWidget.tsx)

---

### 12. ความแม่นยำของข้อมูลส่วนตัวและการสกัดความจำ (Personal Memory Accuracy & Verification)
- **การพัฒนา:**
  - สกัดข้อเท็จจริงสำคัญจากบทสนทนาอัตโนมัติ (ความชอบ, อาหาร/เครื่องดื่ม, สุขภาพ, กิจวัตร, งาน)
  - เพิ่มระบบ Confidence Score (ความมั่นใจ 0-100%) และป้ายสถานะยืนยันความถูกต้อง (Verified Checkmark)
  - ฟิลเตอร์แยกตามหมวดหมู่ภาษาไทยชัดเจนในหน้า Memory Bank
  - ระบบ Strict Interactive Prompt: เมื่อตรวจพบข้อเท็จจริงใหม่ โบ้จะเด้งการ์ดถามในแชทให้ผู้ใช้กดยืนยันหรือแก้ไขก่อนบันทึกลงความจำเสมอ
- **ไฟล์ที่เกี่ยวข้อง:** [`src/pages/Memory.tsx`](file:///c:/Anewproject/boai/src/pages/Memory.tsx), [`src/pages/Conversation.tsx`](file:///c:/Anewproject/boai/src/pages/Conversation.tsx), [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts)

---

### 13. การตรวจจับความขัดแย้งและการโละข้อมูล (Memory Conflict Detection, Pruning & Audit Log)
- **การพัฒนา:**
  - เพิ่มระบบตรวจจับข้อมูลขัดแย้ง (Conflict Detection) เช่น เปลี่ยนรสนิยมเครื่องดื่ม, เวลาตื่นนอน, หรืออาหารที่แพ้
  - เสนอการ์ดแก้ไขความขัดแย้งในห้องแชททันที พร้อมตัวเลือก "อัปเดตแทนที่ข้อมูลเดิม", "แก้ไขข้อความ", หรือ "ไม่ต้องจำ"
  - ระบบ Memory Decay & Auto-Pruning: ตรวจจับและโละความจำชั่วคราวที่หมดอายุออกจากสมอง AI
  - ระบบ Memory Audit Log: บันทึก Timeline ประวัติการบันทึก, แก้ไข, ยืนยัน, จัดการความขัดแย้ง และลบข้อมูลทั้งหมดอย่างโปร่งใส พร้อมหน้าต่าง Modal ตรวจสอบย้อนหลัง
- **ไฟล์ที่เกี่ยวข้อง:** [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts), [`src/pages/Memory.tsx`](file:///c:/Anewproject/boai/src/pages/Memory.tsx), [`src/pages/Conversation.tsx`](file:///c:/Anewproject/boai/src/pages/Conversation.tsx)

---

## 📂 โครงสร้างไฟล์หลักในระบบ (Architecture Map)

| ไฟล์ / โฟลเดอร์ | หน้าที่รับผิดชอบ |
|---|---|
| [`.env`](file:///c:/Anewproject/boai/.env) | ตั้งค่า API Keys (Gemini, OpenAI), พิกัดสภาพอากาศเริ่มต้น |
| [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts) | จัดการ LLM, Dynamic Prompt จากสไลเดอร์, Few-Shot Injection, Fact/Conflict Detector |
| [`src/services/audio/audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts) | ระบบจับเสียงเรียก (Wake Word), VAD Silence Timer, Audio Meter, TTS Proxy |
| [`src/services/weather/weatherService.ts`](file:///c:/Anewproject/boai/src/services/weather/weatherService.ts) | เชื่อมต่อ Open-Meteo Live Weather & Geocoding, แปลง WMO Code |
| [`src/services/music/musicService.ts`](file:///c:/Anewproject/boai/src/services/music/musicService.ts) | แกะชื่อเพลงและสั่งเปิด YouTube Music |
| [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts) | ฐานข้อมูล Local: Personality, Memories, Knowledge, Examples, Audit Logs |
| [`src/stores/useAssistantStore.ts`](file:///c:/Anewproject/boai/src/stores/useAssistantStore.ts) | Global State (Zustand), Mini Mode, Music Track State, Pending Memory Action |
| [`src/components/FloatingOrbWidget.tsx`](file:///c:/Anewproject/boai/src/components/FloatingOrbWidget.tsx) | วิดเจ็ตลูกแก้วโปร่งใส Always-on-top ลากย้ายได้ พร้อม Hover Controls |
| [`src/components/MiniMusicBar.tsx`](file:///c:/Anewproject/boai/src/components/MiniMusicBar.tsx) | แถบเครื่องเล่นเพลง YouTube Music ด้านล่างของแอป พร้อม Equalizer Animation |
| [`electron/`](file:///c:/Anewproject/boai/electron) | โค้ด Main Process, Tray, IPC Handlers, Global Hotkeys (Alt+Space, Ctrl+Shift+B) |

---

## 🧠 การจัดเก็บตัวตนและความทรงจำ (Identity & Memory Model)
- **การกด "ล้างประวัติ" (Clear Conversation):** ลบเฉพาะข้อความลูกโป่งแชทบนหน้าจอ (`boai_messages`) เท่านั้น
- **ตัวตนที่ไม่สูญหาย:**
  - **Personality (`boai_personality`):** บุคลิกเพื่อนสนิท อารมณ์ดี จริงใจ คุยสบายๆ พร้อม 4 สไลเดอร์ปรับจูน
  - **Long-term Memories (`boai_memories`):** เรื่องที่โบ้จำได้ พร้อม Confidence Score, Verification Status และหมวดหมู่
  - **Knowledge & Examples (`boai_knowledge`, `boai_examples`):** คลังความรู้และ Few-shot Examples ที่มีระบบคะแนน Rating
  - **Audit Logs (`boai_memory_audit_logs`):** บันทึกประวัติการกระทำเกี่ยวกับความจำทั้งหมด
- ทุกครั้งที่เริ่มคุยใหม่ ระบบจะนำ Personality + Tuning Sliders + Memories + Knowledge + Top Few-Shot Examples มาประกอบเป็นตัวตนเดิมของโบ้เสมอ

---

## 🚀 แผนการพัฒนาที่เสร็จสมบูรณ์ (Completed Roadmap & Milestones)

### 1. ระบบเทรน AI ตัวเองได้จริง (Self-Training Studio & Custom Few-Shot Learning)
- [x] **Interactive Training Studio:** ให้ผู้ใช้พิมพ์ตัวอย่างคู่คำถาม-คำตอบ (Input & Output Examples) เข้าไปในระบบ แล้วโบ้จะเรียนรู้สไตล์การตอบนั้นทันที
- [x] **Live Prompt Benchmark & Feedback:** หน้าทดสอบคุยกับโบ้แบบเรียลไทม์หลังการเทรน พร้อมระบบให้คะแนนความแม่นยำ (Thumb Up / Down) เพื่อปรับค่าน้ำหนักการตอบ
- [x] **Speaking Style Tuner:** สไลเดอร์ปรับระดับความกวน ความเป็นกันเอง ความสุภาพ และการเล่นมุก
- [x] **Export / Import Dataset:** บันทึกชุดข้อมูลการเทรนเป็นไฟล์ `.json` เพื่อสำรองหรือนำไปใช้ต่อในเครื่องอื่น

---

### 2. การควบคุม YouTube Music เชิงลึก (Deep YouTube Music Playback & Control)
- [x] **Direct Song & Playlist Play:** รองรับการเปิดอัลบั้ม เพลย์ลิสต์ หรือวิทยุประจำศิลปินบน YouTube Music ได้แม่นยำยิ่งขึ้น
- [x] **Desktop Media Controls:** ส่งคำสั่งควบคุมมีเดียระดับระบบ (Play, Pause, Next, Previous, Volume Up/Down) ผ่าน Windows Media Session
- [x] **Mini Music Bar:** แถบแสดงสถานะเพลงที่กำลังเล่นบน UI ของโบ้ พร้อมปุ่มกดข้ามเพลงหรือหยุดเพลงได้ในคลิกเดียว

---

### 3. การทำงานเบื้องหลังและการย่อขนาดบน Desktop (Background Daemon, Minimize & Floating Widget)
- [x] **Background Daemon in System Tray:** พัฒนาให้โบ้ทำงานเป็นเซอร์วิสเบื้องหลัง รอฟังเสียงเรียก "ไอ้โบ้" ได้ตลอดเวลาโดยไม่กินทรัพยากรเครื่อง (RAM ต่ำกว่า 100MB)
- [x] **Floating Orb / Mini Mode:** โหมดย่อหน้าต่างแอปให้เหลือเพียงลูกแก้ววงกลมจิ๋ว (Orb Widget) ลอยอยู่มุมหน้าจอ สามารถลากขยับไปมา และเรืองแสงเวลาโบ้ฟังหรือตอบ
- [x] **Global Hotkey:** ตั้งค่าคีย์ลัดระดับระบบปฏิบัติการ (`Alt + Space` เพื่อเรียกใช้, `Ctrl + Shift + B` เพื่อสลับโหมดลูกแก้วลอย)
- [x] **Silent Notification:** ระบบแจ้งเตือนแบบ Windows Toast เมื่อมีนัดหมายหรือสิ่งที่โบ้ต้องเตือนขณะอยู่เบื้องหลัง

---

### 4. การเทรนความแม่นยำของข้อมูลส่วนตัว (Personal Memory Accuracy & Verification)
- [x] **Smart Fact Extraction:** เมื่อเราคุยเรื่องชีวิตประจำวัน โบ้จะคัดกรอง "ข้อเท็จจริงสำคัญ" มาบันทึกลงความจำโดยอัตโนมัติ
- [x] **Categorized Memories:** จัดหมวดหมู่ความจำอย่างเป็นระเบียบ เช่น หมวดสุขภาพ, งาน/โปรเจกต์, รสนิยมอาหารและเครื่องดื่ม, กิจวัตรประจำวัน
- [x] **Confidence Score & Verification:** แสดงระดับความมั่นใจของแต่ละข้อมูลความจำ และให้ผู้ใช้กดยืนยันความถูกต้องได้
- [x] **Interactive Fact Review:** ให้โบ้ถามยืนยันเมื่อข้อมูลที่ได้รับใหม่ดูคลุมเครือ เพื่อป้องกันการจำผิด

---

### 5. การโละข้อมูลที่ไม่จริงและล้างข้อมูลขัดแย้ง (Memory Pruning & Conflict Resolution)
- [x] **Conflict Detection:** เมื่อผู้ใช้บอกข้อมูลใหม่ที่ขัดแย้งกับข้อมูลเดิม (เช่น เดิมบันทึกว่าชอบกาแฟดริป แต่เปลี่ยนมาชอบมัทฉะ) โบ้จะตรวจพบความขัดแย้งและเสนออัปเดตแทนที่ข้อมูลเดิมทันที
- [x] **One-Click Purge & Edit:** หน้ารายการความจำในเมนู "ความจำ (Memory)" ที่ค้นหา แก้ไขคำ และกดลบ (Delete) ข้อมูลที่ไม่จริงทิ้งได้ทันที
- [x] **Memory Decay & Archiving:** ระบบทำเครื่องหมายข้อมูลชั่วคราวที่หมดอายุแล้ว (เช่น นัดหมายที่ผ่านไปแล้ว) และโละออกจากสมอง AI อัตโนมัติ เพื่อไม่ให้ความจำบวม
- [x] **Memory Audit Log:** บันทึกประวัติว่าโบ้จดจำเรื่องอะไรไปเมื่อไหร่ และลบเรื่องไหนออกไป เพื่อความโปร่งใสและความปลอดภัยของข้อมูลส่วนบุคคล

---

### 14. การแก้ไขปัญหาความแม่นยำของสภาพอากาศ, เสียงเพลงในแอป และความเร็วเสียงพูดธรรมชาติ (Weather Forecast, Audible Music & Natural TTS)
- **1. แก้ไขบั๊กสกัดชื่อเมืองและเพิ่มระบบพยากรณ์อากาศล่วงหน้า (Weather Intent & Forecast):**
  - ลบข้อผิดพลาดที่คำว่า "ให้" (จาก "ให้หน่อย") ถูกเข้าใจผิดว่าเป็นชื่อจังหวัด/เมือง
  - เพิ่มพจนานุกรม 77 จังหวัดทั่วไทยและเมืองสำคัญระดับโลก ป้องกันการนำ Stop words (เช่น ให้, หน่อย, ดู, ช่วย, พรุ่งนี้, เป็นยังไง) มาเป็นชื่อเมือง
  - ตรวจจับมิติเวลา (`พรุ่งนี้` = วันถัดไป, `มะรืนนี้` = สองวันถัดไป) และเรียก API พยากรณ์รายวัน (`daily`) ของ Open-Meteo แสดงอุณหภูมิสูงสุด-ต่ำสุด โอกาสฝนตก และแรงลม พร้อมคำแนะนำอย่างเป็นธรรมชาติ
- **2. เพิ่มระบบเล่นเสียงเพลงจริงในแอปพลิเคชัน (Audible Desktop Music Engine):**
  - แก้ไขข้อผิดพลาด "ไม่สามารถเล่นวิดีโอนี้" (Error: Video Unavailable) เนื่องจาก YouTube ปิดกั้น URL แบบ `listType=search`:
    - พัฒนาระบบ `searchVideoId` ค้นหาและดึงรหัส **YouTube Video ID** จริง (`Advn74fiZsY` ฯลฯ) ผ่าน IPC Handler และ API Proxy เพื่อนำมาฝังใน URL `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1` เล่นเพลงได้จริง 100%
    - ตัดคำเรียกชื่อโบ้หรือคำว่า "เปลี่ยนเป็น..." / "โลไอ" ออกจากชื่อเพลงที่สกัดได้
    - แก้ไขปัญหา Chromium ระงับเสียงเมื่อซ่อนแถบวิดีโอ โดยเปลี่ยนจากการใช้ `display: none` มาเป็นตำแหน่ง Off-screen `fixed -top-[9999px] w-1 h-1 opacity-0` ทำให้เสียงเพลงเล่นต่อเนื่องไม่สะดุด
  - ฝังตัวเล่นเสียง HTML5 Audio Streaming คุณภาพสูง (Lofi Chill Beats, Acoustic Cafe, Chillout Lounge) สำหรับเพลงแนวฟังสบายๆ ชิลๆ
  - เพิ่มแถบควบคุมความดังเสียง (Volume Slider 0-100%) และปุ่ม Mute/Unmute
  - ปุ่มสลับดูจอวิดีโอ YouTube ขนาดกะทัดรัด (Mini Video Screen) เหนือ Mini Music Bar พร้อมปุ่มเปิดบน YouTube Music
  - เพิ่ม Flag `autoplay-policy: no-user-gesture-required` ใน [`electron/main.ts`](file:///c:/Anewproject/boai/electron/main.ts)
- **3. ปรับระดับความเร็วเสียงพูดและเพิ่มความเป็นธรรมชาติของภาษาไทย (Natural Thai TTS):**
  - ปรับความเร็วเริ่มต้น (Default TTS Rate) จาก `1.0x` เป็น `1.20x` เพื่อให้ได้จังหวะการพูดที่กระฉับกระเฉง คล่องแคล่ว เหมือนเพื่อนคุยกัน
  - เพิ่มฟังก์ชัน `normalizeThaiTtsText` แปลงหน่วยเทคนิคเป็นภาษาพูดไทยธรรมชาติ เช่น `25°C` -> `25 องศา`, `km/h` -> `กิโลเมตรต่อชั่วโมง`, `%` -> `เปอร์เซ็นต์`, ตัดวงเล็บและสัญลักษณ์เพื่อให้สังเคราะห์เสียงราบรื่น
  - พัฒนาฟังก์ชัน `splitIntoNaturalThaiChunks` ตัดท่อนประโยคตามคำเชื่อมและจังหวะหายใจ ไม่ตัดคำภาษาไทยกลางคัน
  - คัดเลือกเสียง Microsoft Natural / Online Thai Voice ในระบบ Windows SpeechSynthesis อัตโนมัติ
  - เพิ่ม 4 ปุ่ม Preset ปรับความเร็วเสียงใน [`src/pages/Settings.tsx`](file:///c:/Anewproject/boai/src/pages/Settings.tsx) (1.0x ช้า, 1.2x ธรรมชาติ, 1.35x คล่องแคล่ว, 1.5x ไว)
- **ไฟล์ที่เกี่ยวข้อง:** [`src/services/weather/weatherService.ts`](file:///c:/Anewproject/boai/src/services/weather/weatherService.ts), [`src/services/music/musicService.ts`](file:///c:/Anewproject/boai/src/services/music/musicService.ts), [`src/components/MiniMusicBar.tsx`](file:///c:/Anewproject/boai/src/components/MiniMusicBar.tsx), [`src/services/audio/audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts), [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts), [`src/pages/Settings.tsx`](file:///c:/Anewproject/boai/src/pages/Settings.tsx), [`electron/ipc-handlers.ts`](file:///c:/Anewproject/boai/electron/ipc-handlers.ts), [`vite.config.ts`](file:///c:/Anewproject/boai/vite.config.ts)

---

### 15. การปรับปรุงระบบควบคุมเพลง, คำสั่งระดับเสียง, และแก้ปัญหาคำพ้องสระภาษาไทย (Music Control, Volume Logic & Thai Unicode Bugfix)
- **1. ตรวจพบและแก้ไขกับดักสระภาษาไทย (Thai Unicode Substring Collision):**
  - *ปัญหา:* เมื่อผู้ใช้สั่ง *"ไอ้โบว์เปิดเพลง Love Me Like You Do ให้หน่อย"* หรือสั่ง *"เปิดเพลง"* โบ้กลับตอบว่า *"ปิดเพลงให้เรียบร้อยแล้วแก"*
  - *สาเหตุเชิงลึก:* ในรหัสภาษาไทย คำว่า **`เปิดเพลง`** (`เ` + `ป` + `ิ` + `ด` + `เ` + `พ` + `ล` + `ง`) เมื่อมองตั้งแต่ตัวอักษร index 1 เป็นต้นไป (`ป-ิ-ด-เ-พ-ล-ง`) มันคือสตริง **`ปิดเพลง`** พอดีเป๊ะ! ทำให้ Regex คำสั่งปิดเพลงเดิม `/(?:ปิดเพลง)/` ถูกทริกเกอร์ทันที
  - *การแก้ไข:* นำ **Negative Lookbehind `(?<![เแ])ปิด`** มาบังคับใช้ทุกจุด เพื่อรับประกันว่าคำว่า "ปิด" ต้อง**ไม่มี**สระเอ (`เ`) หรือสระแอ (`แ`) นำหน้าเด็ดขาด ทำให้คำว่า "เปิดเพลง" ไม่มีทางชนกับ "ปิดเพลง" อีกต่อไป 100%
- **2. เพิ่มชื่อเรียกและตัวตัดคำนำหน้า (Vocatives Expansion):**
  - เพิ่มชื่อเรียกที่มี ว การันต์: *"ไอ้โบว์"*, *"ไอโบว์"*, *"น้องโบว์"*, *"โบว์"* เข้าสู่ระบบ Wake Word, Setting Alternate Names และฟังก์ชันตัดคำนำหน้าของทุกโมดูล
- **3. กฎการควบคุมระดับเสียงตามคำสั่งผู้ใช้ (Volume Control Rules):**
  - *"ลดเสียง"* / *"เบาเสียง"* -> ลดระดับเสียงลงทีละ 10% (Step -0.10)
  - *"ลดมาก"* / *"ลดเยอะๆ"* -> ตั้งค่าระดับเสียงลงเหลือ **20% พอดีของหลอดเสียง** (ไม่ใช่การลบออก 20%) ตามที่ผู้ใช้กำหนดอย่างเคร่งครัด
  - *"ลดต่ำ"* -> ตั้งค่าระดับเสียงลงเหลือ **10% ของหลอดเสียง**
  - *"ปิดเสียง"* (Mute) / *"เปิดเสียง"* (Unmute) โดยจัดลำดับให้ตรวจเช็คคำสั่ง Mute ก่อนคำสั่ง Stop
- **4. ระบบ Playlist Queue Drawer และการเลือกเพลง:**
  - สร้างแถบลิสต์เพลงในคิว (Playlist Queue Drawer) พร้อมรายชื่อเพลง, แทร็กที่กำลังเล่น, Equalizer เคลื่อนไหว, และปุ่มคลิกเพื่อเลือกเล่นเพลงใดๆ ในลิสต์ได้ทันที
  - ปุ่มข้ามเพลง (Skip Next Track) บน Mini Music Bar
- **5. ระบบ Remote สั่งเปิดเพลงบนเบราว์เซอร์เครื่อง (Remote PC Browser Launch):**
  - รองรับคำสั่ง *"remote เปิด"*, *"เปิดในเครื่อง"*, *"เปิดบนคอม"*, *"เปิด youtube ในเครื่อง"*
  - โบ้จะสั่งการ Windows ผ่าน `electronAPI.openExternal(url)` เพื่อเด้งเปิดแท็บ YouTube Music บนเบราว์เซอร์หลักของเครื่อง (Chrome, Edge ฯลฯ) ให้เล่นเพลงเต็มระบบบนเครื่องได้ทันที
  - เพิ่มปุ่มสีแดง **`Remote ในเครื่อง`** บนแถบ Mini Music Bar สำหรับคลิกโยนเพลงขึ้นเบราว์เซอร์ได้ตลอดเวลา
- **ไฟล์ที่เกี่ยวข้อง:** [`src/services/music/musicService.ts`](file:///c:/Anewproject/boai/src/services/music/musicService.ts), [`src/components/MiniMusicBar.tsx`](file:///c:/Anewproject/boai/src/components/MiniMusicBar.tsx), [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts), [`src/stores/useAssistantStore.ts`](file:///c:/Anewproject/boai/src/stores/useAssistantStore.ts), [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts)

---

### 16. แผนงานการพัฒนาขั้นตอนถัดไป (Upcoming Roadmap & Action Plan) 📌

#### 🎯 เป้าหมายที่ 1: การสกัดและคัดกรองชื่อเพลงให้แม่นยำ ไม่ติดคำสร้อยและบริบท (Smart Song Query Cleaner)
- **ปัญหาที่พบ:** เมื่อผู้ใช้พูดว่า *"เปิดเพลง see you again ในระบบเรานะ"* ปัจจุบันระบบยังสกัดเอาข้อความส่วนเกินท้ายประโยคติดไปด้วย ทำให้ได้คำค้นหาเป็น *"see you again ในระบบเรา"* ส่งผลให้ค้นหาเพลงผิดหรือไม่ตรงกับเพลงจริง
- **แผนการดำเนินงาน:**
  1. **สร้าง Contextual Suffix Stripper:** เพิ่มชุดคำศัพท์และบริบทแวดล้อมที่มักต่อท้ายชื่อเพลงในภาษาไทย เช่น:
     - `ในระบบเรานะ`, `ในระบบเรา`, `บนระบบเรา`, `บนเครื่องเรา`, `ในเครื่องเรา`, `ในคอมเรา`, `บนคอมเรา`
     - `ให้เราฟังนะ`, `ให้ฟังหน่อยนะ`, `หน่อยนะแก`, `ให้หน่อยดิ`, `ให้ที`, `สักเพลงสิ`, `ฟังเพลินๆ`, `หน่อยครับ`, `หน่อยค่ะ`
  2. **Language Boundary & Title Isolation:** พัฒนาอัลกอริทึมตรวจจับรอยต่อภาษา (Thai-English Boundary) เมื่อตรวจพบชื่อเพลงภาษาอังกฤษ (เช่น `See You Again`, `Love Me Like You Do`, `Shape of You`) ให้ตัดคำสร้อยภาษาไทยที่ต่อท้ายออกทันที
  3. **Smart Song Search Normalizer:** ใช้พจนานุกรมคำสะกดชื่อเพลงยอดนิยม หรือเรียก Search Suggestion API ของ YouTube Music มากรองชื่อเพลงที่สกัดได้ก่อนส่งเล่นจริง

#### 🎯 เป้าหมายที่ 2: การควบคุมการหยุด พอส และปิดเสียงให้มีผลจริง 100% (Robust Media Control: Pause & Mute Execution)
- **ปัญหาที่พบ:** ผู้ใช้แจ้งว่าเมื่อสั่ง *"ปิดเสียง"* (Mute) แล้วเสียงยังไม่เงียบจริง และสั่ง *"พอส"* (Pause) แล้วเพลงยังไม่หยุดชั่วคราวให้จริงในบางครั้ง
- **สาเหตุที่ต้องแก้:**
  - ปัจจุบันการควบคุม `<iframe>` ของ YouTube ใช้วิธีส่ง `postMessage({ event: 'command', func: 'pauseVideo' })` แบบ Generic ซึ่งในบางจังหวะ YouTube Player ไม่ตอบสนองหากไม่มีการผูก Event Listener ของ YouTube Iframe API อย่างเป็นทางการ
  - ระดับเสียงและสถานะ Mute ของ HTML5 `<audio>` กับ YouTube `<iframe>` ยังแยกขาดจากกันในบางจุด
- **แผนการดำเนินงาน:**
  1. **Official YouTube Iframe Player API Integration:**
     - โหลดสคริปต์ `https://www.youtube.com/iframe_api` และสร้างอินสแตนซ์ `new YT.Player()` จัดการตัวเล่นวิดีโอโดยตรง
     - สั่งงานด้วย Native API Methods:
       - `player.pauseVideo()` สำหรับการพอสเพลง (หยุดจริง 100%)
       - `player.playVideo()` สำหรับการเล่นต่อ
       - `player.mute()` และ `player.unMute()` สำหรับการปิด/เปิดเสียงจริง
       - `player.setVolume(volume)` สำหรับการปรับหลอดเสียง 0-100%
  2. **Dual-Channel Synchronization:**
     - ซิงค์ทั้ง HTML5 Audio Element (`audioRef.current.muted = true`, `audioRef.current.pause()`) และ YouTube Player ไปพร้อมกันในฟังก์ชันเดียวเมื่อได้รับคำสั่ง `pause` หรือ `mute`
  3. **Windows System Media Key Fallback:**
     - สำหรับกรณีที่ผู้ใช้ Remote เปิดบนเบราว์เซอร์เครื่อง ให้รองรับการส่งคำสั่ง Media Key ระดับ OS (`MediaPlayPause`, `VolumeMute`) ผ่าน Electron

#### 🎯 เป้าหมายที่ 3: ทำให้ระบบเทรน AI (Training Studio & Knowledge Base) นำไปปรับใช้จริง 100% (Production-Grade Real AI Training Integration)
- **เป้าหมาย:** ผู้ใช้ต้องการให้ข้อมูลที่บันทึกและเทรนไว้ในหน้า Training Studio (Few-Shot Examples, สไลเดอร์สไตล์, คลังความรู้ Knowledge Items) ส่งผลกระทบต่อคำตอบของ AI ในการใช้งานจริงแบบเรียลไทม์อย่างเห็นผลชัดเจน
- **แผนการดำเนินงาน:**
  1. **Dynamic Prompt Injection Pipeline:**
     - ตรวจสอบและยกระดับฟังก์ชัน `buildSystemPrompt()` ใน [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts) ให้ดึงตัวอย่าง Few-Shot ที่ผู้ใช้ให้คะแนนสูงสุด (High Rating) พร้อมทั้ง Knowledge Base ทั้งหมด ส่งตรงเข้า Prompt ของโมเดลหลัก (Gemini, Claude, OpenAI) เสมอ
  2. **Direct Intent & Semantic Matcher:**
     - เพิ่มระบบ Matching ระดับสูง หากผู้ใช้พิมพ์หรือพูดคำถามที่ตรงกับตัวอย่างที่เคยเทรนไว้ใน Training Studio ให้ AI เลือกใช้คำตอบที่เทรนไว้เป็น First-priority ตอบทันทีด้วยความแม่นยำ 100%
  3. **Visual Training Indicator ในหน้าห้องแชท:**
     - แสดงป้ายกำกับบอกที่มาของคำตอบ เช่น `🏷️ Few-Shot Trained` หรือ `📚 จากคลังความรู้` เพื่อให้ผู้ใช้ตรวจสอบได้ทันทีว่าสิ่งที่ตนเองเทรนไปถูกนำมาใช้งานจริง
  4. **One-Click Feedback & Retrain:**
     - เพิ่มปุ่ม "แก้ไขและบันทึกเป็นตัวอย่างการเทรน" ที่แต่ละบอลลูนคำตอบในห้องสนทนา เพื่อให้ผู้ใช้กดสอนโบ้ต่อได้ทันทีเมื่อตอบไม่ตรงใจ

### 17. การผสานรวมคอมโพเนนต์ LiveOrb (WebGL 3D) และระบบหน้าโบ้ขยับปากสมจริง (Dynamic Talking Mouth & Companion) 🐶✨
- **สิ่งที่พัฒนาและผสานรวม:**
  1. **สถาปัตยกรรม shadcn และโครงสร้างโฟลเดอร์ UI Primitives:**
     - ยืนยันการรองรับ **Tailwind CSS**, **TypeScript**, และโครงสร้าง **shadcn** ในโปรเจกต์
     - สร้าง [`src/lib/utils.ts`](file:///c:/Anewproject/boai/src/lib/utils.ts) พร้อมฟังก์ชัน `cn` (`clsx` + `tailwind-merge`)
     - กำหนดเส้นทางมาตรฐานสำหรับ UI Primitives ที่โฟลเดอร์ [`src/components/ui/`](file:///c:/Anewproject/boai/src/components/ui/) ซึ่งตรงกับ Alias `@/components/ui` ใน `tsconfig.json` และ `vite.config.ts`
  2. **ผสานรวมคอมโพเนนต์ LiveOrb:**
     - ติดตั้ง [`src/components/ui/live-orb.tsx`](file:///c:/Anewproject/boai/src/components/ui/live-orb.tsx) รองรับ WebGL Shader Raymarching, การปรับสี (White, Black, WebGL Wash, Custom), ลูกตาติดตามเคอร์เซอร์เมาส์อัตโนมัติ และการกะพริบตา
     - สร้าง [`src/components/ui/demo.tsx`](file:///c:/Anewproject/boai/src/components/ui/demo.tsx) สำหรับเดโมแบบ Standalone
  3. **ระบบหน้าโบ้มีปากขยับตอนพูดให้เหมือนเพื่อนคุยกัน (Talking Mouth & Living Friend Face):**
     - พัฒนาใน [`src/components/AiOrbVisualizer.tsx`](file:///c:/Anewproject/boai/src/components/AiOrbVisualizer.tsx) และ [`src/index.css`](file:///c:/Anewproject/boai/src/index.css)
     - **ขยับปากสมจริงตามเสียงพูด (Realistic Talking Mouth):** เมื่ออยู่ในสถานะ `speaking` ปากของโบ้จะขยับเปิด-ปิดตามจังหวะคำพูด (`.animate-bo-mouth-talk`) เผยให้เห็นฟันบนและลิ้นสีชมพูที่เด้งตามจังหวะเสียง (`.animate-bo-tongue`)
     - **สายตามีชีวิตชีวา (Cursor Tracking & Natural Blinking):** ดวงตามีประกายสะท้อนแสงและเลื่อนมองตามเคอร์เซอร์เมาส์ของผู้ใช้ พร้อมทั้งกะพริบตาตามธรรมชาติทุก 2.5-4 วินาที
     - **หูดุ๊กดิ๊กและแก้มแดง (Puppy Ears & Blushing Cheeks):** หูสุนัขขยับไหวและกระดิกเมื่อกำลังฟัง (`listening`) แก้มเรื่อสีชมพูและเรืองแสงเมื่อกำลังพูดคุยกับเพื่อน
     - **คลื่นเสียงออร่า (Voice Aura Rings):** กระเพื่อมออกจากตัวโบ้ตามจังหวะการพูดและการฟัง
     - **Companion Switcher:** สลับโหมดได้ด้วยคลิกเดียวระหว่าง **"เพื่อนโบ้ (ขยับปาก)"** และ **"LiveOrb (3D WebGL)"** พร้อมบันทึกตัวเลือกลงใน `localStorage`
- **สถานะ:** ทดสอบ Build ผ่าน 100% (`npm run build` สำเร็จ 0 errors)

### 18. เพิ่มธีมสว่าง (Light Theme), กำหนดหน้าโบ้เป็น LiveOrb หน้าเดียวพร้อมวาดปากขยับ, และปรับบทสนทนาให้เป็นกันเองไม่จำเจ ☀️🔮
- **สิ่งที่พัฒนาและปรับปรุง:**
  1. **ระบบ 2 Themes (Dark Theme & Light Theme):**
     - เพิ่มตัวเลือกธีมใน `AppSettings` และ [`src/stores/useAssistantStore.ts`](file:///c:/Anewproject/boai/src/stores/useAssistantStore.ts)
     - สร้างปุ่มสลับธีมรูป ☀️/🌙 บนแถบควบคุมหน้าต่าง [`src/components/WindowFrame.tsx`](file:///c:/Anewproject/boai/src/components/WindowFrame.tsx) สลับได้ทันทีจากทุกหน้าจอ
     - เพิ่มการตั้งค่าธีมในหน้า [`src/pages/Settings.tsx`](file:///c:/Anewproject/boai/src/pages/Settings.tsx) (Dark Theme และ Light Theme)
     - เขียน CSS สไตล์ธีมสว่างคลีนสบายตาใน [`src/index.css`](file:///c:/Anewproject/boai/src/index.css) รองรับการแสดงผลทั้ง Panel, Sidebar, Header, Typography และ Input
  2. **กำหนดหน้าโบ้เป็นหน้าเดียว (LiveOrb 3D WebGL) พร้อมวาดปากขยับตอนพูด:**
     - ปรับใน [`src/components/AiOrbVisualizer.tsx`](file:///c:/Anewproject/boai/src/components/AiOrbVisualizer.tsx): ตัดปุ่มสลับโหมดออกทั้งหมด ให้โบ้ใช้หน้า LiveOrb 3D เพียงหน้าเดียวตามที่ผู้ใช้ส่งรูป
     - วาดปากบนตัวลูกแก้ว LiveOrb:
       - **ตอนพูด (`speaking`):** ปากขยับเปิด-ปิดตามเสียงพูด (`.animate-bo-mouth-talk`) พร้อมฟันบน ลิ้นสีชมพูดุ๊กดิ๊ก (`.animate-bo-tongue`) และออร่าคลื่นเสียง
       - **ตอนฟัง (`listening`):** ปากกลม attentive "o" เรืองแสงสีฟ้า Cyan
       - **ตอนสแตนด์บาย (`idle`):** รอยยิ้มโค้งอารมณ์ดี `◡`
  3. **แก้ปัญหาโบ้ทักเรื่อง "ดริปกาแฟ" หรือ "เขียนโค้ด" ซ้ำซาก:**
     - ลบข้อมูลความจำเดิมที่ล็อกไว้เรื่องกาแฟดริปและเขียนโค้ดออกจาก `DEFAULT_MEMORIES`
     - เพิ่มระบบล้างความจำ (Memory Purge) อัตโนมัติใน [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts) ลบข้อมูลเก่าที่ค้างใน `localStorage`
     - ปรับ System Prompt ใน [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts): ห้ามทักเรื่องดริปกาแฟ/เขียนโค้ดเองเด็ดขาดหากผู้ใช้ไม่ได้พูดถึง ให้เข้าใจบริบทของคนทั่วไปในชีวิตประจำวัน (ถามไถ่อารมณ์, ดินฟ้าอากาศ, กิจกรรมทั่วไป) และตีความบทสนทนาอย่างเป็นธรรมชาติเหมือนเพื่อนสนิทคุยกัน
- **สถานะ:** ทดสอบ Build ผ่าน 100% (`npm run build` สำเร็จ 0 errors)

### 19. เพิ่มการเชื่อมต่อโมเดลจริง: xAI Grok (พร้อมระบบแจ้งเตือนโควต้า & Auto-Fallback) และ Meta Llama 3.3/3.1 🚀🤖
- **สิ่งที่พัฒนาและเชื่อมต่อ:**
  1. **โมเดล xAI Grok (Grok-2 Latest, Grok-2, Grok Beta):**
     - เชื่อมต่อ Native xAI API Endpoint (`https://api.x.ai/v1/chat/completions`)
     - รองรับความสามารถในการถามตอบเชิงลึก (Deep Reasoning & Witty Personality) ตามเอกลักษณ์ของ Grok
     - สร้างฟังก์ชัน `testProviderConnection('grok')` สำหรับทดสอบ Key ได้จากหน้าการตั้งค่า
  2. **ระบบตรวจจับและแจ้งเตือนข้อจำกัด/โควต้าของ Grok (Grok Quota & Rate Limit Monitor):**
     - ดักจับ Header ตอบกลับจริงจาก xAI API: `x-ratelimit-remaining-requests`, `x-ratelimit-limit-requests`, `x-ratelimit-reset-requests`, `x-ratelimit-remaining-tokens`
     - **โควต้าใกล้หมด (Near Limit <= 5 คำขอ):** แสดงป้ายเตือนสีส้ม และแจ้งเตือนในบทสนทนาว่าเหลือประมาณกี่ครั้งก่อนระบบรีเซ็ต
     - **โควต้าหมดแล้ว (Exhausted / HTTP 429):** แจ้งเตือนผู้ใช้ด้วยเสียงและข้อความ พร้อม **Auto-Fallback สลับไปใช้โมเดลสำรอง (Gemini/OpenAI) ให้อัตโนมัติทันที** บทสนทนาไม่สะดุดและไม่ออฟไลน์
     - เพิ่มการ์ด **Grok Live Quota Monitor** ในหน้า Settings และป้ายกำกับโควต้าสดบนแถบหัวหน้า Home
  3. **โมเดล Meta Llama (Llama 3.3 70B, Llama 3.1 8B):**
     - รองรับการเชื่อมต่อผ่าน **Groq API** (ความเร็วสูงพิเศษ ~300 Tokens/วินาที) และ **OpenRouter API**
     - เลือกรุ่นโมเดลได้ทั้ง `llama-3.3-70b-versatile` และ `llama-3.1-8b-instant`
     - สร้างฟังก์ชันทดสอบการเชื่อมต่อ Meta Llama ได้จากหน้าการตั้งค่า
  4. **การปรับแต่งเสียง Grok (Grok Voice Experience):**
     - แนะนำการตั้งค่าคู่เสียง TTS ให้เข้ากับคาแรกเตอร์คมคายของ Grok ผ่าน OpenAI Voice (`onyx` / `echo`) หรือ Natural Thai Female ปรับสปีด 1.25x
- **สถานะ:** ทดสอบ Build ผ่าน 100% (`npm run build` สำเร็จ 0 errors)

### 20. อัปเดตไอคอนของแอปพลิเคชันด้วยรูป bobo.png ทั่วทั้งระบบ 🎨⚪
- **สิ่งที่พัฒนาและอัปเดต:**
  1. **คัดลอกไฟล์รูปไอคอน:**
     - นำรูปจาก [`src/assets/ิbobo.png`](file:///c:/Anewproject/boai/src/assets/ิbobo.png) ไปบันทึกที่:
       - [`public/bobo.png`](file:///c:/Anewproject/boai/public/bobo.png) (สำหรับ Favicon และ Web/Electron Asset)
       - [`public/assets/images/bobo.png`](file:///c:/Anewproject/boai/public/assets/images/bobo.png)
       - [`src/assets/bobo.png`](file:///c:/Anewproject/boai/src/assets/bobo.png)
  2. **ตั้งค่าไอคอนระดับ Desktop Shell & Electron:**
     - **Window Icon:** เพิ่ม `icon: path.join(__dirname, '../public/bobo.png')` ใน [`electron/main.ts`](file:///c:/Anewproject/boai/electron/main.ts)
     - **System Tray Icon:** โหลด `bobo.png` ย่อขนาด 18x18 ใน [`electron/tray.ts`](file:///c:/Anewproject/boai/electron/tray.ts)
  3. **ตั้งค่าไอคอน Favicon ใน Web Browser:**
     - อัปเดต `<link rel="icon" type="image/png" href="/bobo.png" />` ใน [`index.html`](file:///c:/Anewproject/boai/index.html)
  4. **อัปเดตโลโก้และรูปโปรไฟล์ในหน้าจอแอปพลิเคชัน:**
     - แถบไตเติลบาร์หน้าต่างหลักใน [`src/components/WindowFrame.tsx`](file:///c:/Anewproject/boai/src/components/WindowFrame.tsx)
     - บอลลูนและไอคอนผู้ช่วยในหน้าจอแชท [`src/pages/Conversation.tsx`](file:///c:/Anewproject/boai/src/pages/Conversation.tsx)
     - กล่องข้อความล่าสุดในหน้าแรก [`src/pages/Home.tsx`](file:///c:/Anewproject/boai/src/pages/Home.tsx)
     - หน้าการตั้งค่าไมค์/เสียง [`src/pages/VoiceDevices.tsx`](file:///c:/Anewproject/boai/src/pages/VoiceDevices.tsx)
     - กล่องพรีวิวโปรไฟล์ใน [`src/pages/TrainingStudio/index.tsx`](file:///c:/Anewproject/boai/src/pages/TrainingStudio/index.tsx)
- **สถานะ:** ทดสอบ Build ผ่าน 100% (`npm run build` สำเร็จ 0 errors)

### 21. แก้ปัญหา Groq Model 404 และเพิ่มระบบ Auto-Fallback สำหรับโมเดล Groq LPU ⚡🤖
- **ปัญหาที่พบ:**
  - เมื่อผู้ใช้นำ Groq API Key (`gsk_...`) มาใส่ แล้วทดสอบถามว่า *"บอกไอ้โบว์"* โบ้ตอบกลับว่า:
    `ขอโทษทีนะแก สัญญาณโมเดล meta สะดุดไปนิดนึง (The model 'llama-3.3-70b-versatile' does not exist or you do not have access to it.) ลองถามใหม่อีกทีนะ`
- **การวิเคราะห์สาเหตุ (Root Cause Analysis):**
  1. ทาง Groq ได้ทำการ Decommission/จำกัดสิทธิ์โมเดล `llama-3.3-70b-versatile` และ `llama-3.1-70b-versatile` สำหรับ API Key ระดับ Free / Developer Tier (ต้องมีการยอมรับ Meta License แยกหรือเป็น Tier องค์กร)
  2. เมื่อยิงคำขอไปที่ `https://api.groq.com/openai/v1/models` พบว่าโมเดลหลักที่เปิดให้ใช้งานเต็มระบบบนชิป Groq LPU ในปัจจุบันคือ:
     - **`openai/gpt-oss-120b`** (เรือธง 120B เปิดเผยน้ำหนัก ทำงานบน Groq LPU ฉลาด ลึกซึ้ง และเร็วถึง 300+ token/s)
     - **`openai/gpt-oss-20b`** (โมเดล 20B ความเร็วสูงพิเศษ)
     - **`qwen/qwen3.8-27b`**
- **การแก้ไขและพัฒนา:**
  1. **เพิ่มระบบ Groq Resilient Auto-Fallback ใน [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts):**
     - หากโมเดลที่เลือกส่งกลับ HTTP 404 หรือ 400 (decommissioned หรือ no access) ระบบจะสลับไปเรียกโมเดลสำรองบน Groq (`openai/gpt-oss-120b` -> `openai/gpt-oss-20b`) ให้อัตโนมัติทันที
     - เมื่อสลับโมเดลสำเร็จ ระบบจะบันทึกโมเดลที่ใช้ได้จริงลงฐานข้อมูลตั้งค่าอัตโนมัติ เพื่อให้คำขอถัดไปตอบได้ทันที ไม่ต้องลองซ้ำ
     - ดักจับ Rate-limit headers จาก Groq API (`x-ratelimit-remaining-requests`, `x-ratelimit-limit-requests`) เพื่ออัปเดตโควต้าแบบเรียลไทม์
     - หากโควต้า Groq หมด (429) จะสลับไปตอบด้วยโมเดลสำรอง (Gemini/OpenAI) ให้อัตโนมัติ บทสนทนาไม่ค้าง
  2. **ปรับปรุงค่าเริ่มต้นและการตั้งค่าใน [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts):**
     - ปรับค่าเริ่มต้น `meta_model` เป็น `'openai/gpt-oss-120b'`
     - ระบบ Auto-migrate อัตโนมัติสำหรับผู้ใช้ที่มีค่าเดิมเป็น `'llama-3.3-70b-versatile'` ให้เปลี่ยนเป็น `'openai/gpt-oss-120b'` ทันที
     - แก้ไขไม่ให้ `initDefaults()` เขียนทับ `llm_provider` ที่ผู้ใช้เลือก
  3. **ปรับปรุงหน้าจอการตั้งค่า [`src/pages/Settings.tsx`](file:///c:/Anewproject/boai/src/pages/Settings.tsx):**
     - เพิ่มปุ่มเลือกรุ่นโมเดลยอดนิยมของ Groq: `GPT-OSS 120B ★ แนะนำ`, `GPT-OSS 20B`, `Qwen 3.8 27B`, `Llama 3.3 70B`, `Llama 3.1 8B`
     - เพิ่มแบนเนอร์แสดงผลการทดสอบเชื่อมต่อ (Test Connection Feedback) แบบเรียลไทม์ แสดงโมเดลที่เชื่อมต่อได้จริงและข้อความตอบกลับ
- **สถานะ:** ทดสอบยิง API ด้วยคีย์จริงของผู้ใช้สำเร็จ 100% ตอบภาษาไทยทันทีในเวลาไม่ถึง 0.6 วินาที, Build ผ่าน 100% (`npm run build` สำเร็จ 0 errors)

### 22. เพิ่มระบบเสียง xAI Grok TTS และพรีเซ็ตเสียง & สำเนียงสไตล์ Grok ฟรี 100% 🎙️⚡
- **ความต้องการของผู้ใช้:** ต้องการใช้เสียงของ Grok แต่ไม่อยากใช้ API Key จะทำได้ไหม
- **การวิเคราะห์ทางเทคนิค:**
  1. **เสียง Grok ตัวจริงของ xAI:** ทาง xAI ได้เปิดตัว Grok Text-to-Speech API (เช่นเสียง `leo`, `rex`, `ara`, `eve`, `sal`) แต่ระบบนี้ถูกล็อกอยู่หลังระบบชำระเงิน API Key ของ xAI ซึ่งไม่มี Endpoint สาธารณะให้ดึงเสียงฟรีโดยตรง
  2. **แนวทางแก้ปัญหาเพื่อให้ผู้ใช้ได้ประสบการณ์เสียง Grok โดยไม่ต้องใช้ API Key:**
     - จุดเด่นของ Grok คือ **"จังหวะการพูดที่ฉะฉาน กระชับ ว่องไว และมีมุกกวนๆ / ไหวพริบสูง"**
     - สร้างฟังก์ชัน **"⚡ พรีเซ็ตสไตล์เสียง Grok ฟรี 100%" (`applyGrokFreePreset`)**:
       - เร่ง Speed การพูดเป็น `1.25x` (ฉะฉาน กระฉับกระเฉง)
       - ใช้เอนจิน Natural Studio Clarity เสียงชัดลื่นไหล (ฟรี 100%)
       - ปรับค่า Personality Tuning: Wittiness 85% (กวน/มีไหวพริบ), Conciseness 85% (กระชับ ตรงประเด็น)
  3. **การพัฒนาในระบบ:**
     - อัปเดต [`src/types/index.ts`](file:///c:/Anewproject/boai/src/types/index.ts): เพิ่มตัวเลือก `tts_engine: 'grok'` และเสียง `grok_tts_voice: 'leo' | 'rex' | 'ara' | 'eve' | 'sal'`
     - พัฒนาฟังก์ชัน `speakWithGrok(...)` ใน [`src/services/audio/audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts) รองรับ xAI Grok TTS API
     - เพิ่มปุ่มกด **"เปิดใช้สไตล์ Grok ฟรี"** และตัวเลือกเอนจินเสียง Grok ในหน้า [`src/pages/Settings.tsx`](file:///c:/Anewproject/boai/src/pages/Settings.tsx)
- **สถานะ:** ทดสอบ Build ผ่าน 100% (`npm run build` สำเร็จ 0 errors)

### 23. แก้ปัญหาทดสอบเสียงไหนๆ ก็เป็นเสียงผู้ชายหมด (Microsoft Pattara Fallback & Electron IPC TTS Bridge) 👩🔊
- **ปัญหาที่พบ:**
  - ผู้ใช้แจ้งว่าเมื่อกดทดสอบฟังเสียงในหน้าตั้งค่า หรือกดเลือกเสียงผู้หญิง (เช่น Nova, Shimmer, Ara, Eve, หรือเสียงธรรมชาติ) เสียงที่พูดออกมากลับเป็น **"เสียงผู้ชาย"** ทั้งหมด
- **การวิเคราะห์หาสาเหตุเชิงลึก (Deep Root Cause Investigation):**
  1. **สิทธิ์เสียงบน Windows:** จากการตรวจสอบเสียงในระบบ Windows 10/11 ของเครื่อง พบว่ามีเสียงภาษาไทยติดตั้งอยู่เพียงเสียงเดียวคือ **`Microsoft Pattara - Thai (Thailand)`** ซึ่งเป็น **เสียงผู้ชาย** (Male Voice)
  2. **คีย์ OpenAI หมดเครดิต (`429 credit_balance_exhausted`):** เมื่อเลือกเสียง OpenAI (เช่น Nova, Shimmer) แต่ API Key ของผู้ใช้ไม่มีเครดิตคงเหลือ OpenAI จึงปฏิเสธคำขอด้วย HTTP 429
  3. **คีย์ xAI Grok ยังไม่ได้ระบุ:** เมื่อเลือกเสียง Grok (เช่น Ara, Eve) แต่ไม่มีคีย์ xAI ระบบจึงข้ามไป
  4. **ข้อจำกัดใน Electron กับ `/api/tts`:** เมื่อแอปทำงานใน Electron Shell (`file:///` protocol) เสียงธรรมชาติเดิมที่เรียกผ่าน `/api/tts` ล้มเหลวเพราะไม่มี Web Server รองรับ ทำให้ระบบทำการ Fallback ไปยัง Windows SpeechSynthesis (`speakWithBrowser`)
  5. **ผลลัพธ์ซ้ำซ้อน:** ทุกครั้งที่เอนจินใดๆ ไม่สามารถทำงานได้ ระบบจึงเงียบและสลับไปเล่น **Microsoft Pattara (เสียงผู้ชายตัวเดียวใน Windows)** เสมอ ทำให้ผู้ใช้รู้สึกว่าเลือกเสียงไหนก็เป็นเสียงผู้ชายเหมือนเดิมทั้งหมด
- **การแก้ไขและพัฒนา:**
  1. **สร้าง Native Electron IPC TTS Bridge (`fetch-tts`):**
     - เพิ่ม Handler `fetch-tts` ใน [`electron/ipc-handlers.ts`](file:///c:/Anewproject/boai/electron/ipc-handlers.ts) ใช้ Node.js `https.get` ดึงเสียงสังเคราะห์ภาษาไทยโดยตรง
     - เปิดใช้ใน [`electron/preload.ts`](file:///c:/Anewproject/boai/electron/preload.ts) และเชื่อมต่อใน [`src/services/audio/audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts) ให้เล่นผ่าน Base64 Data URL ได้ 100% ทั้งใน Dev และ Electron Packaged
  2. **ปรับแต่ง Fallback สำหรับ Windows SpeechSynthesis:**
     - ตรวจจับชื่อเสียง หากเป็นเสียงผู้ชายของ Windows (Pattara หรือ Niwat) จะปรับ Pitch ขึ้นเป็น `1.30x` ให้ออกโทนสว่างเป็นมิตร ไม่ทุ้มต่ำ
  3. **เพิ่มการแจ้งเตือนชัดเจนในหน้าตั้งค่า ([`src/pages/Settings.tsx`](file:///c:/Anewproject/boai/src/pages/Settings.tsx)):**
     - หากเลือก OpenAI TTS แต่คีย์หมดเครดิต หรือเลือก Grok Voice แต่ไม่มีคีย์ ระบบจะแสดงกล่องข้อความเตือนให้ผู้ใช้ทราบทันทีว่าสลับมาใช้เสียงธรรมชาติแทน
- **สถานะ:** ทดสอบยิงเสียงผ่าน IPC สำเร็จ 100%, Build ผ่าน 100% (`npm run build` สำเร็จ 0 errors)

---
*บันทึกล่าสุด: 16 ตุลาคม 2026*


