import { ChatMessage, PersonalityConfig, LLMProvider } from '../../types';
import { db } from '../db/databaseService';
import { weatherService } from '../weather/weatherService';
import { musicService } from '../music/musicService';

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

    let prompt = `คุณคือ "โบ้" เพื่อนสนิทคู่หูของผู้ใช้
แนวทางการตอบ:
1. คุยเป็นกันเองเหมือนเพื่อนสนิทคุยกัน (แทนตัวเองว่า "เรา" หรือ "โบ้", เรียกผู้ใช้ว่า "เธอ" หรือ "แก") อารมณ์ดี จริงใจ สบายๆ เหมือนเพื่อนที่นั่งอยู่ข้างๆ
2. ตอบกระชับ ตรงประเด็น ฉลาด มีประโยชน์ ช่วยคิด ช่วยแก้ปัญหาได้ทันที
3. ห้ามพูดถึงคำว่า AI, LLM, Gemini, OpenAI, Claude, API หรือคำศัพท์เทคนิคระบบเด็ดขาด และไม่ต้องแนะนำตัวเป็นระบบ
4. ไม่พูดทางการแบบคอลเซ็นเตอร์ ไม่ต้องลงท้าย คะ/ขา แข็งๆ ให้ใช้ภาษาพูดที่เป็นธรรมชาติ เช่น จ้า, นะ, ล่ะ, ได้เลย, ว่าไงแก
\n`;

    if (memories.length > 0) {
      prompt += `--- เรื่องที่จำได้เกี่ยวกับเพื่อนคนนี้ ---\n`;
      memories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 8)
        .forEach(m => {
          prompt += `- ${m.content}\n`;
        });
      prompt += `\n`;
    }

    if (knowledge.length > 0) {
      prompt += `--- ข้อมูลและความรู้เสริม ---\n`;
      knowledge.slice(0, 5).forEach(k => {
        prompt += `${k.title}: ${k.content}\n\n`;
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
      if (settings.llm_provider === 'gemini' && settings.gemini_api_key) {
        return await this.callGemini(messages, systemPrompt, settings.gemini_api_key, settings.gemini_model);
      } else if (settings.llm_provider === 'openai' && settings.openai_api_key) {
        return await this.callOpenAI(messages, systemPrompt, settings.openai_api_key, settings.openai_model || 'gpt-4o');
      } else if (settings.llm_provider === 'claude' && settings.claude_api_key) {
        return await this.callClaude(messages, systemPrompt, settings.claude_api_key, settings.claude_model);
      } else if (settings.gemini_api_key) {
        return await this.callGemini(messages, systemPrompt, settings.gemini_api_key, settings.gemini_model);
      } else if (settings.openai_api_key) {
        return await this.callOpenAI(messages, systemPrompt, settings.openai_api_key, settings.openai_model || 'gpt-4o');
      }
    } catch (err: any) {
      console.warn('API call error, falling back:', err);
      return `ขอโทษทีนะแก สัญญาณสะดุดไปนิดนึง ลองถามใหม่อีกทีนะ`;
    }

    // 3. Fallback / Offline responses
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
    const candidateModels = [
      model && model !== 'gemini-3.6-flash' ? model : 'gemini-flash-lite-latest',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.6-flash'
    ];
    const uniqueModels = Array.from(new Set(candidateModels.filter(Boolean)));

    // Keep conversation context snappy and fast (last 8 messages)
    const recentMessages = messages.slice(-8);
    const contents = recentMessages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'สวัสดี' }] });
    }

    const payload: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 256,
      },
    };

    let lastError: any = null;
    for (const m of uniqueModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || 'ขอโทษทีนะแก ไม่พบคำตอบ';
        }

        const err = await res.json().catch(() => ({}));
        lastError = new Error(err.error?.message || `HTTP ${res.status}`);
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Gemini API call failed');
  }

  // Live Test Provider Connection
  public async testProviderConnection(provider: LLMProvider, customKey?: string): Promise<{ success: boolean; message: string; model?: string }> {
    const settings = db.getSettings();
    const personality = db.getPersonality();
    const testMsg: ChatMessage = {
      id: 'test_conn',
      conversation_id: 'test',
      role: 'user',
      content: 'สวัสดี',
      created_at: new Date().toISOString(),
    };

    try {
      if (provider === 'gemini') {
        const key = customKey || settings.gemini_api_key;
        if (!key) {
          return { success: false, message: 'ยังไม่ได้ระบุ Gemini API Key' };
        }
        const resp = await this.callGemini([testMsg], personality.system_prompt, key, settings.gemini_model || 'gemini-flash-lite-latest');
        return { success: true, message: resp.trim(), model: settings.gemini_model || 'gemini-flash-lite-latest' };
      }

      if (provider === 'openai') {
        const key = customKey || settings.openai_api_key;
        if (!key) {
          return { success: false, message: 'ยังไม่ได้ระบุ OpenAI API Key' };
        }
        const resp = await this.callOpenAI([testMsg], personality.system_prompt, key, settings.openai_model || 'gpt-4o');
        return { success: true, message: resp.trim(), model: settings.openai_model || 'gpt-4o' };
      }

      if (provider === 'claude') {
        const key = customKey || settings.claude_api_key;
        if (!key) {
          return { success: false, message: 'ยังไม่ได้ระบุ Claude API Key' };
        }
        const resp = await this.callClaude([testMsg], personality.system_prompt, key, settings.claude_model);
        return { success: true, message: resp.trim(), model: settings.claude_model };
      }

      return { success: false, message: 'ไม่พบผู้ให้บริการที่ระบุ' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'การเชื่อมต่อล้มเหลว' };
    }
  }

  // Quick intent & Tool dispatcher
  public async tryExecuteToolIntent(text: string): Promise<string | null> {
    const lower = text.toLowerCase();

    // Weather tool (Open-Meteo Real-time API: https://open-meteo.com)
    const isWeatherQuery = (
      lower.includes('อากาศ') ||
      lower.includes('สภาพอากาศ') ||
      lower.includes('ฝน') ||
      lower.includes('weather') ||
      lower.includes('อุณหภูมิ') ||
      lower.includes('ร้อนไหม') ||
      lower.includes('หนาวไหม')
    ) && !lower.includes('ทำไมฝน') && !lower.includes('ฝนเกิดจาก');

    if (isWeatherQuery) {
      try {
        const liveWeather = await weatherService.getFormattedWeatherResponse(text);
        if (liveWeather) return liveWeather;
      } catch (err) {
        console.warn('Open-Meteo live weather fetch error:', err);
      }
    }

    // Music / YouTube Music Integration
    if (musicService.isMusicIntent(text)) {
      const songInfo = musicService.openMusic(text);
      return `จัดไปแก! โบ้เปิดเพลง "${songInfo.query}" บน YouTube Music ให้แล้วนะ นั่งฟังชิลๆ ได้เลย 🎵🎧`;
    }

    // Reminders
    if (lower.includes('เตือน') || lower.includes('นัด') || lower.includes('reminder')) {
      const newRem = db.addReminder(text.replace(/เตือน|ช่วยเตือน|บันทึก/g, '').trim() || 'รายการเตือนใหม่', 'เร็วๆ นี้');
      return `เราจดเรื่อง "${newRem.title}" ไว้ให้เรียบร้อยแล้วนะแก เดี๋ยวเตือนให้แน่นอน ⏰`;
    }

    // Memory query
    if (lower.includes('จำ') || lower.includes('ข้อมูลของฉัน') || lower.includes('ประวัติ')) {
      const memories = db.getMemories();
      if (memories.length > 0) {
        return `เราจำเรื่องของแกได้อยู่แล้ว เช่น "${memories[0].content}" มีอะไรอยากเล่าหรือให้ช่วยจำเพิ่มบอกได้เลยนะ`;
      }
    }

    return null;
  }

  // Smart Offline/Local Demo Generator adhering to Personality
  private generateSmartDemoResponse(userText: string): string {
    const lower = userText.toLowerCase();

    if (lower.includes('สวัสดี') || lower.includes('หวัดดี') || lower.includes('hi') || lower.includes('hello')) {
      return `หวัดดีแก! มีอะไรให้เราช่วยคิดหรือชวนคุย บอกได้เลยนะ`;
    }

    if (lower.includes('ทำอะไรได้บ้าง') || lower.includes('ช่วยอะไร')) {
      return `เราคุยเล่นเป็นเพื่อนได้ ช่วยคิดงาน สรุปข้อมูล จดบันทึกสิ่งที่ต้องทำ หรือเตือนความจำก็ได้นะ มีเรื่องอะไรเล่าให้ฟังได้เลย!`;
    }

    if (lower.includes('ชื่ออะไร') || lower.includes('ใคร')) {
      return `เราคือโบ้ไง เพื่อนแกที่คอยช่วยอยู่ตรงนี้ มีอะไรปรึกษาได้หมดเลยนะ`;
    }

    return `เราฟังอยู่จ้า เรื่อง "${userText}" อยากให้ช่วยอะไรต่อบอกมาได้เลยนะ`;
  }
}

export const aiService = AIService.getInstance();
