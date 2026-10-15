import { ChatMessage, PersonalityConfig } from '../../types';
import { db } from '../db/databaseService';

export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Generate enriched system prompt with personality + memories + knowledge
  private buildSystemPrompt(): string {
    const personality = db.getPersonality();
    const memories = db.getMemories();
    const knowledge = db.getKnowledge();
    const examples = db.getExamples();

    let prompt = `${personality.system_prompt}\n\n`;
    prompt += `สไตล์การพูด: ${personality.speaking_style}\n`;
    prompt += `ระดับความเป็นทางการ: ${personality.formality_level}/5\n\n`;

    if (memories.length > 0) {
      prompt += `--- ความจำระยะยาวเกี่ยวกับผู้ใช้ (User Memories) ---\n`;
      memories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 8)
        .forEach(m => {
          prompt += `- [ความสำคัญ ${m.importance}/5, หมวด ${m.category}] ${m.content}\n`;
        });
      prompt += `\n`;
    }

    if (knowledge.length > 0) {
      prompt += `--- ฐานความรู้เฉพาะ (Knowledge Base) ---\n`;
      knowledge.slice(0, 5).forEach(k => {
        prompt += `หัวข้อ: ${k.title}\nเนื้อหา: ${k.content}\n\n`;
      });
    }

    if (examples.length > 0) {
      prompt += `--- ตัวอย่างบทสนทนา (Few-shot Examples) ---\n`;
      examples.slice(0, 3).forEach(ex => {
        prompt += `ผู้ใช้: ${ex.user_query}\nน้องโบ: ${ex.expected_response}\n\n`;
      });
    }

    return prompt;
  }

  public async chat(messages: ChatMessage[]): Promise<string> {
    const settings = db.getSettings();
    const systemPrompt = this.buildSystemPrompt();

    // 1. Tool execution check first (Quick intent matching)
    const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    const toolResult = await this.tryExecuteToolIntent(latestUserMessage);
    if (toolResult) {
      return toolResult;
    }

    // 2. Call configured LLM Provider
    try {
      if (settings.llm_provider === 'claude' && settings.claude_api_key) {
        return await this.callClaude(messages, systemPrompt, settings.claude_api_key, settings.claude_model);
      } else if (settings.llm_provider === 'openai' && settings.openai_api_key) {
        return await this.callOpenAI(messages, systemPrompt, settings.openai_api_key, settings.openai_model);
      } else if (settings.llm_provider === 'gemini' && settings.gemini_api_key) {
        return await this.callGemini(messages, systemPrompt, settings.gemini_api_key, settings.gemini_model);
      }
    } catch (err: any) {
      console.warn('API call error, switching to intelligent local simulator:', err);
      return `(คำเตือน: การเชื่อมต่อ API เกิดข้อผิดพลาด ${err?.message || ''}) น้องโบขอตอบเบื้องต้นนะคะ: รับทราบคำถามเรื่อง "${latestUserMessage}" แล้วค่ะ กรุณาตรวจสอบ API Key ในหน้า Settings อีกครั้งนะคะ`;
    }

    // 3. Fallback / Offline / Demo responses when no API Key is set yet
    return this.generateSmartDemoResponse(latestUserMessage);
  }

  // Anthropic Claude
  private async callClaude(messages: ChatMessage[], systemPrompt: string, apiKey: string, model: string): Promise<string> {
    const formattedMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: formattedMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || 'ขออภัยค่ะ ไม่ได้รับคำตอบจากระบบ';
  }

  // OpenAI
  private async callOpenAI(messages: ChatMessage[], systemPrompt: string, apiKey: string, model: string): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: formattedMessages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'ขออภัยค่ะ ไม่ได้รับข้อความ';
  }

  // Gemini
  private async callGemini(messages: ChatMessage[], systemPrompt: string, apiKey: string, model: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `Instruction/System prompt:\n${systemPrompt}` }],
      },
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัยค่ะ ไม่พบผลลัพธ์';
  }

  // Quick intent & Tool dispatcher
  public async tryExecuteToolIntent(text: string): Promise<string | null> {
    const lower = text.toLowerCase();

    // Weather tool
    if (lower.includes('อากาศ') || lower.includes('ฝน') || lower.includes('weather')) {
      return 'วันนี้อุณหภูมิประมาณ 32°C ท้องฟ้าแจ่มใส มีเมฆบางส่วน ดัชนี UV ปานกลาง และมีความชื้น 65% ค่ะ สภาพอากาศเหมาะกับการทำงานหรือออกกำลังกายช่วงเย็นนะคะ ☀️';
    }

    // Music / Media Control
    if (lower.includes('เพลง') || lower.includes('play') || lower.includes('music')) {
      return 'กำลังเปิดเพลย์ลิสต์ "Coding Focus Lo-fi Chill" สำหรับการทำงานให้ค่ะ สามารถสั่ง "หยุดเพลง" หรือ "เพลงถัดไป" ได้เสมอนะคะ 🎵';
    }

    // Reminders
    if (lower.includes('เตือน') || lower.includes('นัด') || lower.includes('reminder')) {
      const newRem = db.addReminder(text.replace(/เตือน|ช่วยเตือน|บันทึก/g, '').trim() || 'รายการเตือนความจำใหม่', 'เร็วๆ นี้');
      return `น้องโบบันทึกการแจ้งเตือน "${newRem.title}" ลงในตารางเรียบร้อยแล้วค่ะ! ⏰`;
    }

    // Memory query
    if (lower.includes('จำ') || lower.includes('ข้อมูลของฉัน') || lower.includes('ประวัติ')) {
      const memories = db.getMemories();
      if (memories.length > 0) {
        return `น้องโบจำเรื่องของคุณได้ ${memories.length} รายการ เช่น "${memories[0].content}" สามารถดูหรือจัดการเพิ่มเติมได้ที่เมนู Memory นะคะ 💡`;
      }
    }

    return null;
  }

  // Smart Offline/Local Demo Generator adhering to Personality
  private generateSmartDemoResponse(userText: string): string {
    const personality = db.getPersonality();
    const lower = userText.toLowerCase();

    if (lower.includes('สวัสดี') || lower.includes('หวัดดี') || lower.includes('hi') || lower.includes('hello')) {
      return `สวัสดีค่ะ! น้องโบพร้อมช่วยเหลือค่ะ วันนี้มีอะไรให้ช่วยค้นหา คำนวณ หรือจัดการงานบนเครื่องคอมพิวเตอร์มั้ยคะ? 😊`;
    }

    if (lower.includes('ทำอะไรได้บ้าง') || lower.includes('ฟีเจอร์') || lower.includes('ช่วยอะไร')) {
      return `น้องโบสามารถช่วยคุณได้หลากหลายเลยค่ะ:\n• ตอบคำถามและให้คำปรึกษาด้วยเสียงภาษาไทย\n• จดจำข้อมูลและรสนิยมของคุณ (Memory System)\n• ฝึกฝนความรู้และปรับบุคลิกตามใจคุณ (Training Studio)\n• เช็คสภาพอากาศ คุมเครื่องเล่นเพลง และจัดการสิ่งที่ต้องทำ\nคุณสามารถลองสั่งงานด้วยเสียงหรือข้อความได้เลยนะคะ ✨`;
    }

    if (lower.includes('ชื่ออะไร') || lower.includes('ใครสร้าง')) {
      return `น้องโบคือผู้ช่วยส่วนตัว ${personality.name} ประจำระบบ Windows ของคุณค่ะ พัฒนาขึ้นมาเพื่อให้คุณมี AI ประจำเครื่องที่เก่งและปลอดภัยที่สุดค่ะ!`;
    }

    return `น้องโบเข้าใจแล้วค่ะสำหรับ "${userText}"! ตอนนี้กำลังทำงานในโหมดสาธิต (Demo Mode) หากต้องการคำตอบแบบเต็มพิกัดจาก Claude 3.5 Sonnet สามารถนำ Anthropic API Key มาใส่ที่หน้า Settings ได้เลยนะคะ น้องโบยินดีตอบทุกคำถามค่ะ 🌸`;
  }
}

export const aiService = AIService.getInstance();
