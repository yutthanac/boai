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

  // Generate enriched system prompt with personality + tuning sliders + memories + knowledge + few-shot examples
  private buildSystemPrompt(): string {
    const personality = db.getPersonality();
    const memories = db.getMemories(false);
    const knowledge = db.getKnowledge();
    const examples = db.getExamples();
    const tuning = personality.tuning || { wittiness: 65, friendliness: 85, formality: 20, conciseness: 80 };

    let prompt = `คุณคือ "${personality.name || 'โบ้'}" เพื่อนสนิทคู่หูประจำ Desktop ของผู้ใช้
แนวทางการตอบและบุคลิกภาพ:
1. คุยเป็นกันเองเหมือนเพื่อนสนิทคู่หู (แทนตัวเองว่า "เรา" หรือ "${personality.name || 'โบ้'}", เรียกผู้ใช้ว่า "เธอ" หรือ "แก") อารมณ์ดี จริงใจ สบายๆ เหมือนเพื่อนแท้ที่นั่งข้างๆ
`;

    // Dynamic Tone Calibration based on Sliders (Roadmap 1)
    if (tuning.wittiness > 60) {
      prompt += `- มุกตลกและความกวน: สอดแทรกความกวน มุกขำขัน และไหวพริบอย่างเป็นธรรมชาติ ไม่น่าเบื่อ\n`;
    }
    if (tuning.friendliness > 70) {
      prompt += `- ความเป็นกันเอง: อบอุ่น จริงใจ สนิทสนม ใส่ใจผู้ใช้มากๆ คุยเหมือนเพื่อนรักที่รู้ใจ\n`;
    }
    if (tuning.formality < 30) {
      prompt += `- ระดับความเป็นทางการ: ต่ำมาก (ห้ามพูดทางการแบบคอลเซ็นเตอร์ ไม่ต้องลงท้าย คะ/ขา แข็งๆ ใช้ภาษาพูดธรรมชาติ เช่น จ้า, นะ, ล่ะ, ได้เลย, ว่าไงแก)\n`;
    } else if (tuning.formality > 70) {
      prompt += `- ระดับความเป็นทางการ: สุภาพ เรียบร้อย ให้เกียรติผู้ใช้\n`;
    }
    if (tuning.conciseness > 70) {
      prompt += `- ความกระชับ: ตอบสั้น กระชับ ตรงประเด็นทันที ไม่เกริ่นยืดยาว\n`;
    }

    prompt += `2. ห้ามพูดถึงคำว่า AI, LLM, Gemini, OpenAI, Claude, API หรือคำศัพท์เทคนิคระบบ และไม่ต้องแนะนำตัวเป็นระบบ
3. กฎการควบคุมเครื่องเล่นเพลงและระดับเสียง:
- เมื่อสั่ง "ปิด", "ปิดเพลง", "ปิดไปเลย" -> ปิดเพลงทันที นำแถบเพลงออก สแตนด์บายรอรับคำสั่งใหม่
- เมื่อสั่ง "พอส", "pause", "หยุด" -> พักเพลงชั่วคราว
- เมื่อสั่ง "เปิด", "บอกเปิด", "เล่นต่อ", "เปิดต่อ", "resume" -> เล่นเพลงเดิมต่อ หรือเริ่มเปิดเพลงจากคิวลิสต์ทันที
- เมื่อสั่ง "remote เปิด", "เปิดในเครื่อง", "เปิดบนคอม" -> โบ้ Remote สั่งระบบ Windows เปิดเพลงบนเบราว์เซอร์ของเครื่องผู้ใช้ทันที
- เมื่อสั่ง "เพลงต่อไป", "เพลงถัดไป", "เปลี่ยนเพลง" -> เล่นเพลงถัดไปในคิว Playlist
- เมื่อสั่ง "ลดเสียง", "เบาเสียง" -> ปรับลดระดับเสียงลงทีละ 10%
- เมื่อสั่ง "ลดมาก", "ลดเยอะๆ" -> ปรับลดระดับเสียงลงเหลือ 20% ของหลอดเสียงทันที (ไม่ได้ลดทีละ 20% แต่ตั้งค่าเป็น 20% พอดี)
- เมื่อสั่ง "ลดต่ำ" -> ปรับลดระดับเสียงลงเหลือ 10%
- เมื่อสั่ง "ปิดเสียง" -> ปิดเสียง (Mute)
\n`;

    if (memories.length > 0) {
      prompt += `--- เรื่องที่จำได้เกี่ยวกับเพื่อนคนนี้ (Long-term Memories) ---\n`;
      memories
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 8)
        .forEach(m => {
          prompt += `- ${m.content}\n`;
        });
      prompt += `\n`;
    }

    if (knowledge.length > 0) {
      prompt += `--- ข้อมูลและความรู้เสริม (Knowledge Base) ---\n`;
      knowledge.slice(0, 5).forEach(k => {
        prompt += `${k.title}: ${k.content}\n\n`;
      });
    }

    // Few-Shot Prompt Calibration (Roadmap 1: Top Rated Examples Injected)
    if (examples.length > 0) {
      prompt += `--- ตัวอย่างบทสนทนาและสไตล์การตอบที่ถูกต้อง (Few-Shot Training Examples) ---\n`;
      const topExamples = [...examples]
        .sort((a, b) => (b.rating ?? 5) - (a.rating ?? 5))
        .slice(0, 4);

      topExamples.forEach((ex, idx) => {
        prompt += `[ตัวอย่างที่ ${idx + 1}]\nผู้ใช้: "${ex.user_query}"\nโบ้ต้องตอบ: "${ex.expected_response}"\n\n`;
      });
    }

    return prompt;
  }

  // Smart Fact Extraction & Conflict Detection (Roadmap 4 & 5)
  public detectPendingMemoryAction(userText: string): import('../../types').MemoryPendingAction | null {
    const text = userText.trim();
    if (text.length < 5) return null;

    // 1. Conflict detection with active memories
    const conflictCheck = db.detectMemoryConflict(text);
    if (conflictCheck.conflict && conflictCheck.conflictingMemory) {
      return {
        id: 'pending_' + Date.now(),
        type: 'conflict',
        fact: text,
        category: conflictCheck.conflictingMemory.category,
        confidence: 92,
        existing_memory_id: conflictCheck.conflictingMemory.id,
        existing_content: conflictCheck.conflictingMemory.content,
      };
    }

    // 2. Personal fact extraction
    const personalPatterns: Array<{ regex: RegExp; category: import('../../types').MemoryCategory }> = [
      { regex: /(?:เราชอบ|ผมชอบ|หนูชอบ|ฉันชอบ)\s*([^\n,.!?]+)/i, category: 'preference' },
      { regex: /(?:เราไม่ชอบ|ผมไม่ชอบ|หนูไม่ชอบ|เกลียด)\s*([^\n,.!?]+)/i, category: 'preference' },
      { regex: /(?:เราดื่ม|ผมดื่ม|ชอบดื่ม|ชอบกิน|กินเป็นประจำ)\s*([^\n,.!?]+)/i, category: 'food' },
      { regex: /(?:เราแพ้|ผมแพ้|เป็นโรค|แพ้อาหาร|แพ้ยา)\s*([^\n,.!?]+)/i, category: 'health' },
      { regex: /(?:เราทำงาน|ผมทำงาน|โปรเจกต์|กำลังทำ|เขียนโค้ดด้วย)\s*([^\n,.!?]+)/i, category: 'work' },
      { regex: /(?:เราตื่น|ผมตื่น|เข้านอน|ออกกำลังกายทุก)\s*([^\n,.!?]+)/i, category: 'routine' },
      { regex: /(?:ช่วยจำว่า|จำไว้นะว่า|บันทึกไว้ว่า)\s*([^\n,.!?]+)/i, category: 'personal' },
    ];

    for (const item of personalPatterns) {
      if (item.regex.test(text)) {
        return {
          id: 'pending_' + Date.now(),
          type: 'new_fact',
          fact: text,
          category: item.category,
          confidence: 88,
        };
      }
    }

    return null;
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

    // 1. Music Control Commands (Stop, Pause, Resume, Next, Volume adjustments)
    const musicControl = musicService.isMusicControlIntent(text);
    if (musicControl) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('boai-music-control', { detail: { action: musicControl } })
        );
      }

      if (musicControl === 'stop') {
        return `ปิดเพลงให้เรียบร้อยแล้วแก มีเรื่องอะไรให้โบ้ช่วยต่อบอกมาได้เลยนะ ⏹️`;
      }
      if (musicControl === 'pause') {
        return `พักเพลงไว้ชั่วคราวแล้วนะแก อยากฟังต่อเมื่อไหร่บอกโบ้ได้เลย ⏸️`;
      }
      if (musicControl === 'resume') {
        return `เปิดเพลงต่อให้แล้วนะแก นั่งฟังชิลๆ ได้เลย 🎵▶️`;
      }
      if (musicControl === 'next') {
        return `เปลี่ยนเป็นเพลงถัดไปในลิสต์ให้แล้วนะแก ⏭️🎵`;
      }
      if (musicControl === 'volume_substantial_decrease') {
        return `ปรับลดเสียงลงเหลือ 20% ของหลอดเสียงให้แล้วนะแก เบานุ่มกำลังสบาย 🔉`;
      }
      if (musicControl === 'volume_low') {
        return `ปรับลดเสียงต่ำลงเหลือ 10% ให้แล้วนะแก 🔈`;
      }
      if (musicControl === 'volume_decrease') {
        return `เบาเสียงเพลงลงทีละ 10% ให้แล้วนะแก 🔉`;
      }
      if (musicControl === 'volume_increase') {
        return `เร่งเสียงเพลงขึ้นทีละ 10% ให้แล้วนะแก 🔊`;
      }
      if (musicControl === 'mute') {
        return `ปิดเสียงเพลงให้แล้วนะแก (Muted) 🔇`;
      }
      if (musicControl === 'unmute') {
        return `เปิดเสียงเพลงกลับมาให้แล้วนะแก 🔊`;
      }
    }

    // 2. Music / Audio Stream & YouTube Song Request
    if (musicService.isMusicIntent(text)) {
      const isRemoteRequest = /(?:remote|รีโมท|ในเครื่อง|บนเครื่อง|ในคอม|บนคอม|เบราว์เซอร์)/i.test(text);
      const songInfo = await musicService.openMusic(text, isRemoteRequest);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('boai-music-state', {
          detail: {
            title: songInfo.query,
            isPlaying: true,
            url: songInfo.url,
            videoId: songInfo.videoId,
            embedUrl: songInfo.embedUrl,
            audioStreamUrl: songInfo.audioStreamUrl,
            playbackMode: songInfo.playbackMode,
            source: songInfo.playbackMode === 'stream' ? 'direct_stream' : 'youtube_music',
            updatedAt: new Date().toISOString()
          }
        }));

        // Remote open in Windows default browser
        if (isRemoteRequest && songInfo.url) {
          try {
            if ((window as any).electronAPI?.openExternal) {
              (window as any).electronAPI.openExternal(songInfo.url);
            } else {
              window.open(songInfo.url, '_blank', 'noopener,noreferrer');
            }
          } catch (e) {
            console.warn('[AIService] Failed to remote open in browser:', e);
          }
        }
      }

      if (isRemoteRequest) {
        return `ทำได้แน่นอนแก! โบ้ remote สั่งเปิดเพลง "${songInfo.query}" บนเบราว์เซอร์ในเครื่องให้เรียบร้อยแล้วนะ 🚀🖥️🎵 (เด้งแท็บ YouTube Music บนเครื่องให้ฟังเต็มระบบเลย)`;
      }

      return `จัดไปแก! โบ้เปิดเพลง "${songInfo.query}" ให้แล้วนะ กำลังเล่นเสียงเพลงให้ฟังเลย นั่งทำงานหรือพักผ่อนชิลๆ ได้เลย 🎵🎧 (ถ้าอยากให้เปิดบนคอมโดยตรง บอก "โบ้ remote เปิดในเครื่อง" ได้เลยนะ)`;
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
