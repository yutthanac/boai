# PRODUCT.md — Bo AI (น้องโบ)

Personal AI Desktop Assistant สำหรับระบบปฏิบัติการ Windows 10/11

## Overview
- **Product Name**: Bo AI (ชื่อเรียก/Wake Word เริ่มต้น: "น้องโบ")
- **Platform**: Desktop Application (Windows 10/11 x64, Electron + Vite + React 18+ + TypeScript)
- **Target Audience**: ผู้ใช้ทั่วไปที่ต้องการ AI ผู้ช่วยส่วนตัวสั่งการด้วยเสียงภาษาไทย ปรับแต่งบุคลิกและความรู้ได้เอง ควบคุมข้อมูลและความเป็นส่วนตัวได้เบ็ดเสร็จ (Privacy-first)

## Core Capabilities (Phase 1 MVP)
1. **Always-on Voice & Wake Word**: รอฟังเสียงคำเรียก "น้องโบ" (Sensitivity 0–100) รองรับชื่อสำรอง
2. **Natural Thai Speech Pipeline**:
   - Voice Activity Detection (VAD) & Real-time Mic Level
   - Speech-to-Text (STT) รองรับภาษาไทยสมบูรณ์แบบ
   - Primary LLM: Claude (Claude 3.5 Sonnet) พร้อมรองรับสลับเป็น OpenAI / Gemini
   - Text-to-Speech (TTS) เสียงภาษาไทยธรรมชาติ
3. **Training Studio**:
   - Personality: ปรับชื่อ, บุคลิก, สไตล์การพูด, ระดับความเป็นทางการ, System Prompt
   - Knowledge Base: อัปโหลดเอกสาร (txt, md, pdf) และเพิ่มข้อความความรู้เฉพาะทาง
   - Example Training: ชุดคำถาม-คำตอบตัวอย่าง (Few-shot prompt calibration)
   - Test Lab: ห้องทดสอบพิมพ์สนทนาแยกจากเสียง
4. **Memory Management**:
   - ความจำระยะสั้น (Recent conversation context)
   - ความจำระยะยาว (User facts & preferences พร้อมระดับความสำคัญ 1–5)
   - เก็บในเครื่อง (Local SQLite) พร้อมระบบ Export & เตรียม Sync
5. **Tools & Integrations**:
   - สภาพอากาศ (Weather)
   - ควบคุมเพลงและสื่อ (Media player control)
   - ค้นหาข้อมูล / เว็บไซต์ (Web search)
   - การแจ้งเตือน (Reminders & Alarms)
   - คำสั่งระบบ Windows พร้อม Safe Confirmation Modal
6. **Device Control & Settings**:
   - เลือกไมโครโฟน / ลำโพง พร้อม Visualizer วัดระดับเสียง Real-time
   - จัดเก็บ API Keys ในเครื่องแบบเข้ารหัสปลอดภัย
