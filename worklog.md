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

## 📂 โครงสร้างไฟล์หลักในระบบ (Architecture Map)

| ไฟล์ / โฟลเดอร์ | หน้าที่รับผิดชอบ |
|---|---|
| [`.env`](file:///c:/Anewproject/boai/.env) | ตั้งค่า API Keys (Gemini, OpenAI), พิกัดสภาพอากาศเริ่มต้น |
| [`src/services/ai/aiService.ts`](file:///c:/Anewproject/boai/src/services/ai/aiService.ts) | จัดการ LLM Providers, System Prompt, Tool Intent (Weather, Music, Reminder) |
| [`src/services/audio/audioService.ts`](file:///c:/Anewproject/boai/src/services/audio/audioService.ts) | ระบบจับเสียงเรียก (Wake Word), VAD Silence Timer, Audio Meter, TTS Proxy |
| [`src/services/weather/weatherService.ts`](file:///c:/Anewproject/boai/src/services/weather/weatherService.ts) | เชื่อมต่อ Open-Meteo Live Weather & Geocoding, แปลง WMO Code |
| [`src/services/music/musicService.ts`](file:///c:/Anewproject/boai/src/services/music/musicService.ts) | แกะชื่อเพลงและสั่งเปิด YouTube Music |
| [`src/services/db/databaseService.ts`](file:///c:/Anewproject/boai/src/services/db/databaseService.ts) | ฐานข้อมูล Local: Personality, Memories, Knowledge, Examples, Messages |
| [`src/stores/useAssistantStore.ts`](file:///c:/Anewproject/boai/src/stores/useAssistantStore.ts) | Global State (Zustand), จัดการรอบการส่งข้อความ, ป้องกันข้อความซ้ำ |
| [`electron/`](file:///c:/Anewproject/boai/electron) | โค้ด Main Process, Tray, IPC Handlers สำหรับรันบน Desktop Windows |

---

## 🧠 การจัดเก็บตัวตนและความทรงจำ (Identity & Memory Model)
- **การกด "ล้างประวัติ" (Clear Conversation):** ลบเฉพาะข้อความลูกโป่งแชทบนหน้าจอ (`boai_messages`) เท่านั้น
- **ตัวตนที่ไม่สูญหาย:**
  - **Personality (`boai_personality`):** บุคลิกเพื่อนสนิท อารมณ์ดี จริงใจ คุยสบายๆ
  - **Long-term Memories (`boai_memories`):** เรื่องที่โบ้จำได้เกี่ยวกับผู้ใช้ (เช่น ความชอบ, กาแฟ, โปรเจกต์)
  - **Knowledge & Examples (`boai_knowledge`, `boai_examples`):** คลังความรู้และตัวอย่างที่เคยเทรนใน Training Studio
- ทุกครั้งที่เริ่มคุยใหม่ ระบบจะนำ Personality + Memories + Knowledge มาประกอบเป็นตัวตนเดิมของโบ้เสมอ

---

## 🚀 แผนการพัฒนาต่อไป (Upcoming Roadmap & Action Plan)

### 1. ระบบเทรน AI ตัวเองได้จริง (Self-Training Studio & Custom Few-Shot Learning)
- [ ] **Interactive Training Studio:** ให้ผู้ใช้พิมพ์ตัวอย่างคู่คำถาม-คำตอบ (Input & Output Examples) เข้าไปในระบบ แล้วโบ้จะเรียนรู้สไตล์การตอบนั้นทันที
- [ ] **Live Prompt Benchmark & Feedback:** หน้าทดสอบคุยกับโบ้แบบเรียลไทม์หลังการเทรน พร้อมระบบให้คะแนนความแม่นยำ (Thumb Up / Down) เพื่อปรับค่าน้ำหนักการตอบ
- [ ] **Speaking Style Tuner:** สไลเดอร์ปรับระดับความกวน ความเป็นกันเอง ความสุภาพ และการเล่นมุก
- [ ] **Export / Import Dataset:** บันทึกชุดข้อมูลการเทรนเป็นไฟล์ `.json` เพื่อสำรองหรือนำไปใช้ต่อในเครื่องอื่น

---

### 2. การควบคุม YouTube Music เชิงลึก (Deep YouTube Music Playback & Control)
- [ ] **Direct Song & Playlist Play:** รองรับการเปิดอัลบั้ม เพลย์ลิสต์ หรือวิทยุประจำศิลปินบน YouTube Music ได้แม่นยำยิ่งขึ้น
- [ ] **Desktop Media Controls:** ส่งคำสั่งควบคุมมีเดียระดับระบบ (Play, Pause, Next, Previous, Volume Up/Down) ผ่าน Windows Media Session
- [ ] **Mini Music Bar:** แถบแสดงสถานะเพลงที่กำลังเล่นบน UI ของโบ้ พร้อมปุ่มกดข้ามเพลงหรือหยุดเพลงได้ในคลิกเดียว

---

### 3. การทำงานเบื้องหลังและการย่อขนาดบน Desktop (Background Daemon, Minimize & Floating Widget)
- [ ] **Background Daemon in System Tray:** พัฒนาให้โบ้ทำงานเป็นเซอร์วิสเบื้องหลัง รอฟังเสียงเรียก "ไอ้โบ้" ได้ตลอดเวลาโดยไม่กินทรัพยากรเครื่อง (RAM ต่ำกว่า 100MB)
- [ ] **Floating Orb / Mini Mode:** โหมดย่อหน้าต่างแอปให้เหลือเพียงลูกแก้ววงกลมจิ๋ว (Orb Widget) ลอยอยู่มุมหน้าจอ สามารถลากขยับไปมา และเรืองแสงเวลาโบ้ฟังหรือตอบ
- [ ] **Global Hotkey:** ตั้งค่าคีย์ลัดระดับระบบปฏิบัติการ (เช่น `Alt + Space` หรือ `Ctrl + Shift + B`) เพื่อกดเรียกโบ้ขึ้นมาสั่งการหรือพิมพ์ถามได้ทันทีจากทุกโปรแกรม
- [ ] **Silent Notification:** ระบบแจ้งเตือนแบบ Windows Toast เมื่อมีนัดหมายหรือสิ่งที่โบ้ต้องเตือน

---

### 4. การเทรนความแม่นยำของข้อมูลส่วนตัว (Personal Memory Accuracy & Verification)
- [ ] **Smart Fact Extraction:** เมื่อเราคุยเรื่องชีวิตประจำวัน โบ้จะคัดกรอง "ข้อเท็จจริงสำคัญ" มาบันทึกลงความจำโดยอัตโนมัติ
- [ ] **Categorized Memories:** จัดหมวดหมู่ความจำอย่างเป็นระเบียบ เช่น หมวดสุขภาพ, งาน/โปรเจกต์, รสนิยมอาหารและเครื่องดื่ม, กิจวัตรประจำวัน
- [ ] **Confidence Score & Verification:** แสดงระดับความมั่นใจของแต่ละข้อมูลความจำ และให้ผู้ใช้กดยืนยันความถูกต้องได้
- [ ] **Interactive Fact Review:** ให้โบ้ถามยืนยันเมื่อข้อมูลที่ได้รับใหม่ดูคลุมเครือ เพื่อป้องกันการจำผิด

---

### 5. การโละข้อมูลที่ไม่จริงและล้างข้อมูลขัดแย้ง (Memory Pruning & Conflict Resolution)
- [ ] **Conflict Detection:** เมื่อผู้ใช้บอกข้อมูลใหม่ที่ขัดแย้งกับข้อมูลเดิม (เช่น เดิมบันทึกว่าชอบกาแฟดริป แต่เปลี่ยนมาชอบมัทฉะ) โบ้จะตรวจพบความขัดแย้งและเสนออัปเดตแทนที่ข้อมูลเดิมทันที
- [ ] **One-Click Purge & Edit:** หน้ารายการความจำในเมนู "ความจำ (Memory)" ที่ค้นหา แก้ไขคำ และกดลบ (Delete) ข้อมูลที่ไม่จริงทิ้งได้ทันที
- [ ] **Memory Decay & Archiving:** ระบบทำเครื่องหมายข้อมูลชั่วคราวที่หมดอายุแล้ว (เช่น นัดหมายที่ผ่านไปแล้ว) และโละออกจากสมอง AI อัตโนมัติ เพื่อไม่ให้ความจำบวม
- [ ] **Memory Audit Log:** บันทึกประวัติว่าโบ้จดจำเรื่องอะไรไปเมื่อไหร่ และลบเรื่องไหนออกไป เพื่อความโปร่งใสและความปลอดภัยของข้อมูลส่วนบุคคล

---
*บันทึกล่าสุด: 15 ตุลาคม 2026*
