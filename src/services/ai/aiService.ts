import { ChatMessage, PersonalityConfig, LLMProvider, ProviderQuotaInfo } from '../../types';
import { db } from '../db/databaseService';
import { weatherService } from '../weather/weatherService';
import { musicService } from '../music/musicService';
import { lineService } from '../line/lineService';

export class AIService {
  private static instance: AIService;

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // Normalize Thai and English conversational queries for bulletproof intent & few-shot matching
  public normalizeQuery(text: string): string {
    let clean = (text || '').toLowerCase().trim();
    // Strip leading vocatives / greetings
    clean = clean.replace(/^(?:ไอ้โนอา|ไอโนอา|น้องโนอา|คุณโนอา|โนอาห์|โนอา|noar\s*ai|noarai|noar|noah|hey\s*noar|hey\s*noah|ไอ้โบว์|ไอโบว์|น้องโบว์|โบว์|ไอ้โบ้|ไอโบ้|น้องโบ|บักโบ้|โบ้|ไอ้โบ|ไอโบ|โบไอ|โลไอ|bo\s*ai|boai)\s*[,.:;]?\s*/gi, '');
    clean = clean.replace(/^(?:ช่วย|ช่วยหน่อย|รบกวน|กรุณา|วาน|บอกหน่อย|บอกที|ถามหน่อย)\s*/gi, '');
    // Strip trailing conversational suffixes / politeness
    clean = clean.replace(/(?:หน่อยนะแก|หน่อยนะ|หน่อยดิ|หน่อยสิ|หน่อยครับ|หน่อยค่ะ|หน่อย|ทีครับ|ทีค่ะ|ทีดิ|ทีแก|ทีนะ|ที|นะแก|นะครับ|นะคะ|นะ|ดิแก|ดิ|สิแก|สิ|ครับผม|ครับ|ค่ะ|จ้า|เลย)$/gi, '');
    // Strip punctuation
    clean = clean.replace(/[?？!！.,:;"'“”’‘/\\()_+=\-[\]{}#%^&*~`]+/g, ' ');
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
  }

  // Direct Intent & Semantic Matcher (First-Priority 100% Precision Matching for Training Studio items)
  public findMatchingTrainedKnowledgeOrExample(userText: string): {
    type: 'few_shot' | 'knowledge';
    content: string;
    label: string;
    exampleId?: string;
  } | null {
    const cleanUser = this.normalizeQuery(userText);
    if (!cleanUser || cleanUser.length < 2) return null;

    // 1. Check Few-Shot Examples (Highest Priority)
    const examples = db.getExamples();
    // Sort by rating descending so top-rated examples match first
    const sortedExamples = [...examples].sort((a, b) => (b.rating ?? 5) - (a.rating ?? 5));

    for (const ex of sortedExamples) {
      const cleanEx = this.normalizeQuery(ex.user_query);
      if (!cleanEx) continue;

      // Exact match
      if (cleanUser === cleanEx) {
        return {
          type: 'few_shot',
          content: ex.expected_response,
          label: 'Few-Shot Trained (ตรง 100%)',
          exampleId: ex.id,
        };
      }

      // Strong Substring match (when queries have substantial length)
      if (cleanUser.length >= 4 && cleanEx.length >= 4) {
        if (cleanUser === cleanEx || (cleanUser.length >= 6 && cleanEx.length >= 6 && (cleanUser.includes(cleanEx) || cleanEx.includes(cleanUser)))) {
          return {
            type: 'few_shot',
            content: ex.expected_response,
            label: 'Few-Shot Trained',
            exampleId: ex.id,
          };
        }
      }
    }

    // 2. Check Knowledge Base (Match by Title or Keywords)
    const knowledgeList = db.getKnowledge();
    for (const kn of knowledgeList) {
      const cleanTitle = this.normalizeQuery(kn.title);
      if (cleanTitle.length >= 4) {
        if (cleanUser.includes(cleanTitle) || cleanTitle.includes(cleanUser)) {
          return {
            type: 'knowledge',
            content: kn.content,
            label: kn.title,
          };
        }
      }
    }

    return null;
  }

  // Generate enriched system prompt with personality + tuning sliders + memories + knowledge + few-shot examples
  public buildSystemPrompt(userQuery?: string): string {
    const personality = db.getPersonality();
    const memories = db.getMemories(false);
    const knowledge = db.getKnowledge();
    const examples = db.getExamples();
    const tuning = personality.tuning || { wittiness: 65, friendliness: 85, formality: 20, conciseness: 80 };

    // Dynamic Live Local System Clock (Asia/Bangkok UTC+7)
    const now = new Date();
    const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const dayStr = thaiDays[now.getDay()];
    const dateNum = now.getDate();
    const monthStr = thaiMonths[now.getMonth()];
    const yearBE = now.getFullYear() + 543;
    const yearCE = now.getFullYear();
    const hoursStr = String(now.getHours()).padStart(2, '0');
    const minsStr = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hoursStr}:${minsStr} น.`;

    let prompt = `คุณคือ "${personality.name || 'โนอา'}" ผู้ช่วย AI ประจำเครื่องคอมพิวเตอร์ของผู้ใช้

[ข้อมูลเวลาและวันที่จริงของระบบเครื่อง (แม่นยำ 100%)]:
- ขณะนี้เวลา: ${timeStr} (${dayStr}ที่ ${dateNum} ${monthStr} พ.ศ. ${yearBE} / ค.ศ. ${yearCE})
- เขตเวลา: Asia/Bangkok (UTC+7, ประเทศไทย)
*คำสั่งสำคัญเกี่ยวกับเวลา*: เมื่อผู้ใช้ถามเวลา ("กี่โมงแล้ว", "เวลากี่โมง", "นาฬิกา", "ตอนนี้กี่โมง", "วันอะไร", "วันที่เท่าไหร่") ให้อ้างอิงจากข้อมูลเวลาจริงด้านบนนี้ตอบอย่างแม่นยำเสมอ ห้ามเดาหรือบอกว่าไม่มีนาฬิกาเด็ดขาด!

แนวทางการตอบและบุคลิกภาพ (คำนวณจากค่าน้ำหนักสไลเดอร์ที่ผู้ใช้ตั้งค่าไว้):
1. ความเป็นกันเอง (Friendliness: ${tuning.friendliness}%):
${tuning.friendliness >= 70
  ? '- เป็นกันเองและสนิทสนมสูงมาก: พูดคุยอย่างอบอุ่น เหมือนเพื่อนสนิทที่รู้ใจ สบายๆ เป็นธรรมชาติ ให้ความรู้สึกใกล้ชิดและจริงใจ'
  : tuning.friendliness <= 40
  ? '- สุภาพเรียบง่าย: รักษาระยะห่างที่เหมาะสมอย่างมืออาชีพ'
  : '- เป็นมิตรระดับพอดี: สุภาพ อบอุ่น และเป็นธรรมชาติ'}
2. ความสุภาพและระดับทางการ (Formality: ${tuning.formality}%):
${tuning.formality >= 70
  ? '- ภาษาทางการและสุภาพสูง: ใช้ถ้อยคำสุภาพ เรียบร้อย ชัดเจน ไพเราะ ลงท้าย ค่ะ/นะคะ อย่างสม่ำเสมอ'
  : tuning.formality <= 35
  ? '- ภาษาพูดสบายๆ ไม่เกร็ง: พูดจาเหมือนคนคุยกันในชีวิตประจำวัน ไม่ต้องใช้คำทางการแข็งๆ'
  : '- ความสุภาพมาตรฐาน: สุภาพ นุ่มนวล ลงท้าย ค่ะ/นะคะ'}
3. ความกวนและมุกตลก (Wittiness: ${tuning.wittiness}%):
${tuning.wittiness >= 65
  ? '- มีความกวนและมุกตลก: ไหวพริบดี ขี้เล่น หยอดมุกตลกน่ารักๆ แซวเล่นอย่างมีมารยาท อารมณ์ดี ชวนหัวเราะ'
  : '- จริงจัง สาระตรงไปตรงมา ไม่เล่นมุก'}
4. ความกระชับ (Conciseness: ${tuning.conciseness}%):
${tuning.conciseness >= 75
  ? '- กระชับ ตรงประเด็นทันที: ไม่เกริ่นยืดยาว ไม่พูดน้ำท่วมทุ่ง ได้ใจความรวดเร็ว'
  : '- อธิบายละเอียด: ขยายความและให้ข้อมูลที่ครอบคลุมเมื่อเป็นประโยชน์'}
5. กฎพื้นฐาน:
- เมื่อได้รับคำสั่งจัดการสิ่งต่างๆ (เช่น ควบคุมเพลง, ตรวจสภาพอากาศ, เตือนความจำ, บันทึกความจำ) ให้ตอบยืนยันการทำรายการสั้นๆ กระชับทันที
- [กฎสำคัญที่สุดเรื่องการอ่านออกเสียง]: ห้ามใส่สติกเกอร์ อิโมจิ หรือสัญลักษณ์รูปภาพใดๆ ในข้อความตอบกลับเด็ดขาด (ห้ามใส่สัญลักษณ์หรือรูปภาพทุกชนิด) เนื่องจากโนอาจะนำข้อความไปอ่านออกเสียงผ่านระบบ Text-to-Speech ทันที หากมีอิโมจิ ระบบจะอ่านชื่อรูปภาพออกมา ทำให้เสียงพูดสะดุดและฟังไม่เป็นธรรมชาติ ให้ตอบด้วยข้อความตัวอักษรภาษาไทยที่สุภาพเป็นธรรมชาติเท่านั้น
- [กฎสำคัญเรื่องสไตล์การพูด - ห้ามสอนผู้ใช้พูด]: ให้พูดเฉพาะคำตอบของตนเองเท่านั้น ห้ามสอนผู้ใช้พูด ห้ามแนะนำประโยคสั่งการต่อท้าย เช่น "ถ้าอยากให้บันทึกให้พูดว่า...", "หากต้องการ... ให้พูดว่า...", "สามารถสั่งว่า..." โดยเด็ดขาด ให้ตอบเฉพาะผลลัพธ์หรือคำตอบของตนเองอย่างตรงไปตรงมาและกระชับ
- ห้ามพูดถึงคำว่า AI, LLM, Gemini, OpenAI, Claude, Grok, API หรือคำศัพท์เทคนิคระบบ และไม่ต้องแนะนำตัวว่าเป็นระบบโมเดลใดๆ
- กฎเรื่องบทสนทนา: ให้อ่านและจับบริบทของคนทั่วไปในชีวิตประจำวัน (ถามไถ่, กินข้าวหรือยัง, เหนื่อยไหม, อากาศดีไหม) ห้ามทักเรื่องเดิมๆ ซ้ำซาก (เช่น จิบกาแฟ เขียนโค้ด) ถ้าผู้ใช้ไม่ได้พูดถึง
6. กฎการควบคุมเครื่องเล่นเพลงและระดับเสียง:
- เมื่อสั่ง "ปิด", "ปิดเพลง", "ปิดไปเลย" -> ปิดเพลงทันที นำแถบเพลงออก สแตนด์บายรอรับคำสั่งใหม่
- เมื่อสั่ง "พอส", "pause", "หยุด" -> พักเพลงชั่วคราว
- เมื่อสั่ง "เปิด", "บอกเปิด", "เล่นต่อ", "เปิดต่อ", "resume" -> เล่นเพลงเดิมต่อ หรือเริ่มเปิดเพลงจากคิวลิสต์ทันที
- เมื่อสั่ง "remote เปิด", "เปิดในเครื่อง", "เปิดบนคอม" -> โนอา Remote สั่งระบบ Windows เปิดเพลงบนเบราว์เซอร์ของเครื่องผู้ใช้ทันที
- เมื่อสั่ง "เพลงต่อไป", "เพลงถัดไป", "เปลี่ยนเพลง" -> เล่นเพลงถัดไปในคิว Playlist
- เมื่อสั่ง "ลดเสียง", "เบาเสียง" -> ปรับลดระดับเสียงลงทีละ 10%
- เมื่อสั่ง "ลดมาก", "ลดเยอะๆ" -> ปรับลดระดับเสียงลงเหลือ 20% ของหลอดเสียงทันที (ไม่ได้ลดทีละ 20% แต่ตั้งค่าเป็น 20% พอดี)
- เมื่อสั่ง "ลดต่ำ" -> ปรับลดระดับเสียงลงเหลือ 10%
- เมื่อสั่ง "ปิดเสียง" -> ปิดเสียง (Mute)
\n`;

    if (personality.speaking_style) {
      prompt += `[สไตล์การพูดเฉพาะ]: ${personality.speaking_style}\n\n`;
    }

    if (personality.system_prompt && personality.system_prompt.trim()) {
      prompt += `[คำสั่งเพิ่มเติมเฉพาะบุคคล]: ${personality.system_prompt.trim()}\n\n`;
    }

    const activeMems = memories
      .filter(m => m.status !== 'archived')
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 8);

    if (activeMems.length > 0) {
        prompt += `--- เรื่องที่จำได้เกี่ยวกับเพื่อนคนนี้ (ดึงมาใช้อ้างอิงอย่างเหมาะสมและเป็นธรรมชาติ) ---\n`;
      activeMems.forEach(m => {
        prompt += `- ${m.content}\n`;
      });
      prompt += `\n`;
    }

    // Knowledge Base Injection with Relevance Priority
    if (knowledge.length > 0) {
      prompt += `--- ข้อมูลและความรู้เสริม (Knowledge Base - นำมาใช้อ้างอิงตอบอย่างแม่นยำ) ---\n`;
      const sortedKnowledge = [...knowledge].sort((a, b) => {
        if (!userQuery) return 0;
        const q = userQuery.toLowerCase();
        const aScore = (q.includes(a.title.toLowerCase()) ? 5 : 0) + (q.includes(a.content.slice(0, 30).toLowerCase()) ? 2 : 0);
        const bScore = (q.includes(b.title.toLowerCase()) ? 5 : 0) + (q.includes(b.content.slice(0, 30).toLowerCase()) ? 2 : 0);
        return bScore - aScore;
      });

      sortedKnowledge.slice(0, 10).forEach(k => {
        prompt += `【${k.title}】: ${k.content}\n\n`;
      });
    }

    // Few-Shot Prompt Calibration (Dynamic Ranking & Prioritization)
    if (examples.length > 0) {
      prompt += `--- ตัวอย่างบทสนทนาและสไตล์การตอบที่ถูกต้อง (Few-Shot Training Examples) ---\n`;
      prompt += `[คำสั่งสำคัญสูงสุด]: ตัวอย่างด้านล่างนี้คือคำตอบและน้ำเสียงที่ผู้ใช้เทรนไว้ด้วยตนเอง หากผู้ใช้ถามคำถามที่ตรงหรือคล้ายกับตัวอย่าง ให้ตอบตามแนวทางนี้เป็นอันดับ 1 เสมอ!\n\n`;

      const sortedExamples = [...examples].sort((a, b) => {
        let scoreA = (a.rating ?? 5) * 2;
        let scoreB = (b.rating ?? 5) * 2;
        if (userQuery) {
          const q = userQuery.toLowerCase();
          if (q.includes(a.user_query.toLowerCase()) || a.user_query.toLowerCase().includes(q)) scoreA += 10;
          if (q.includes(b.user_query.toLowerCase()) || b.user_query.toLowerCase().includes(q)) scoreB += 10;
        }
        return scoreB - scoreA;
      });

      sortedExamples.slice(0, 6).forEach((ex, idx) => {
        prompt += `[ตัวอย่างที่ ${idx + 1} คะแนนความพึงพอใจ: ${ex.rating ?? 5}/5]\nผู้ใช้: "${ex.user_query}"\nโนอาต้องตอบ: "${ex.expected_response}"\n\n`;
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

  // Dispatch prompt and messages to the configured LLM provider
  private async dispatchToLLM(
    messages: ChatMessage[],
    systemPrompt: string,
    settings: import('../../types').AppSettings
  ): Promise<string> {
    try {
      if (settings.llm_provider === 'grok' && settings.grok_api_key) {
        try {
          return await this.callGrok(messages, systemPrompt, settings.grok_api_key, settings.grok_model || 'grok-2-latest');
        } catch (grokErr: any) {
          if (grokErr?.message === 'GROK_QUOTA_EXHAUSTED' || grokErr?.message?.includes('429')) {
            console.warn('[AIService] Grok quota exhausted, falling back to backup provider');
            if (settings.gemini_api_key) {
              const fallbackText = await this.callGemini(messages, systemPrompt, settings.gemini_api_key, settings.gemini_model);
              return `ข้อจำกัดโควต้าของ Grok เต็มชั่วคราวค่ะ สลับมาตอบด้วย Gemini ให้แทนนะคะ:\n\n${fallbackText}`;
            } else if (settings.openai_api_key) {
              const fallbackText = await this.callOpenAI(messages, systemPrompt, settings.openai_api_key, settings.openai_model || 'gpt-4o');
              return `ข้อจำกัดโควต้าของ Grok เต็มชั่วคราวค่ะ สลับมาตอบด้วย OpenAI ให้แทนนะคะ:\n\n${fallbackText}`;
            } else {
              return `โควต้าของ Grok เต็มชั่วคราวค่ะ (Rate limit reached) กรุณารอสักครู่ หรือเพิ่ม Gemini API Key ในหน้าตั้งค่าเพื่อให้ใช้งานต่อเนื่องได้ค่ะ`;
            }
          }
          throw grokErr;
        }
      } else if (settings.llm_provider === 'meta' && settings.meta_api_key) {
        try {
          return await this.callMeta(messages, systemPrompt, settings.meta_api_key, settings.meta_model || 'openai/gpt-oss-120b', settings.meta_provider || 'groq');
        } catch (metaErr: any) {
          if (metaErr?.message?.includes('GROQ_QUOTA_EXHAUSTED') || metaErr?.message?.includes('429')) {
            console.warn('[AIService] Groq quota exhausted, falling back to backup provider');
            if (settings.gemini_api_key) {
              const fallbackText = await this.callGemini(messages, systemPrompt, settings.gemini_api_key, settings.gemini_model);
              return `ข้อจำกัดโควต้าของ Groq หมดชั่วคราวแล้วค่ะ โนอาเลยขอสลับมาตอบด้วย Gemini ให้ก่อนเพื่อไม่ให้บทสนทนาสะดุดนะคะ:\n\n${fallbackText}`;
            } else if (settings.openai_api_key) {
              const fallbackText = await this.callOpenAI(messages, systemPrompt, settings.openai_api_key, settings.openai_model || 'gpt-4o');
              return `ข้อจำกัดโควต้าของ Groq หมดชั่วคราวแล้วค่ะ โนอาเลยขอสลับมาตอบด้วย OpenAI ให้ก่อนนะคะ:\n\n${fallbackText}`;
            }
          }
          throw metaErr;
        }
      } else if (settings.llm_provider === 'gemini' && settings.gemini_api_key) {
        return await this.callGemini(messages, systemPrompt, settings.gemini_api_key, settings.gemini_model);
      } else if (settings.llm_provider === 'openai' && settings.openai_api_key) {
        return await this.callOpenAI(messages, systemPrompt, settings.openai_api_key, settings.openai_model || 'gpt-4o');
      } else if (settings.llm_provider === 'claude' && settings.claude_api_key) {
        return await this.callClaude(messages, systemPrompt, settings.claude_api_key, settings.claude_model);
      } else if (settings.grok_api_key) {
        return await this.callGrok(messages, systemPrompt, settings.grok_api_key, settings.grok_model || 'grok-2-latest');
      } else if (settings.meta_api_key) {
        return await this.callMeta(messages, systemPrompt, settings.meta_api_key, settings.meta_model || 'openai/gpt-oss-120b', settings.meta_provider || 'groq');
      } else if (settings.gemini_api_key) {
        return await this.callGemini(messages, systemPrompt, settings.gemini_api_key, settings.gemini_model);
      } else if (settings.openai_api_key) {
        return await this.callOpenAI(messages, systemPrompt, settings.openai_api_key, settings.openai_model || 'gpt-4o');
      }
    } catch (err: any) {
      console.warn('API call error, falling back:', err);
      return `ขออภัยค่ะ สัญญาณโมเดล ${settings.llm_provider} ขัดข้องชั่วคราว (${err?.message || 'Error'}) ลองถามใหม่อีกครั้งนะคะ`;
    }

    const latest = messages.filter(m => m.role === 'user').pop()?.content || '';
    return this.generateSmartDemoResponse(latest);
  }

  // Strip emojis, stickers, and pictographic symbols so TTS reads smoothly without speaking Unicode names
  public stripEmojisAndStickers(text: string): string {
    if (!text) return '';
    return text
      // Strip Unicode Extended_Pictographic and emoji/symbol ranges
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{25A0}-\u{25FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}]/gu, '')
      // Clean up multiple spaces or spaces before punctuation
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+([:;,?.!])/g, '$1')
      .replace(/^[ \t]+(?=[^\s\-\*\d])/gm, '')
      .replace(/[ \t]+$/gm, '')
      .trim();
  }

  // Detailed Chat Interface returning content and training provenance tags
  public async chatDetailed(messages: ChatMessage[]): Promise<{
    content: string;
    training_source?: 'few_shot' | 'knowledge';
    training_label?: string;
  }> {
    const latestUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

    // 1. Tool execution check first (Quick intent matching: weather, music, reminders)
    const toolResult = await this.tryExecuteToolIntent(latestUserMessage);
    if (toolResult) {
      return { content: this.stripEmojisAndStickers(toolResult) };
    }

    // 2. Direct Intent & Semantic Matcher (Training Studio Integration: 100% precision)
    const directTrainingMatch = this.findMatchingTrainedKnowledgeOrExample(latestUserMessage);
    if (directTrainingMatch) {
      return {
        content: this.stripEmojisAndStickers(directTrainingMatch.content),
        training_source: directTrainingMatch.type,
        training_label: directTrainingMatch.label,
      };
    }

    // 3. Call configured LLM Provider with dynamic prompt injection
    const settings = db.getSettings();
    const systemPrompt = this.buildSystemPrompt(latestUserMessage);

    const content = await this.dispatchToLLM(messages, systemPrompt, settings);
    return { content: this.stripEmojisAndStickers(content) };
  }

  public async chat(messages: ChatMessage[]): Promise<string> {
    const res = await this.chatDetailed(messages);
    return this.stripEmojisAndStickers(res.content);
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
          return data.candidates?.[0]?.content?.parts?.[0]?.text || 'ขออภัยค่ะ ไม่พบคำตอบ';
        }

        const err = await res.json().catch(() => ({}));
        lastError = new Error(err.error?.message || `HTTP ${res.status}`);
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Gemini API call failed');
  }

  // xAI Grok (Grok-2, Grok-beta) with live Quota & Rate Limit Inspection
  public async callGrok(messages: ChatMessage[], systemPrompt: string, apiKey: string, model: string): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    ];

    const selectedModel = model || 'grok-2-latest';
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: formattedMessages,
        temperature: 0.7,
      }),
    });

    // Inspect xAI Rate Limit Headers
    const remReqHeader = res.headers.get('x-ratelimit-remaining-requests');
    const limitReqHeader = res.headers.get('x-ratelimit-limit-requests');
    const resetReqHeader = res.headers.get('x-ratelimit-reset-requests');
    const remTokensHeader = res.headers.get('x-ratelimit-remaining-tokens');
    const limitTokensHeader = res.headers.get('x-ratelimit-limit-tokens');

    const remainingRequests = remReqHeader ? parseInt(remReqHeader, 10) : undefined;
    const limitRequests = limitReqHeader ? parseInt(limitReqHeader, 10) : undefined;
    const remainingTokens = remTokensHeader ? parseInt(remTokensHeader, 10) : undefined;
    const limitTokens = limitTokensHeader ? parseInt(limitTokensHeader, 10) : undefined;

    let status: 'ok' | 'near_limit' | 'exhausted' = 'ok';
    if (res.status === 429) {
      status = 'exhausted';
    } else if (remainingRequests !== undefined) {
      if (remainingRequests <= 0) {
        status = 'exhausted';
      } else if (remainingRequests <= 5) {
        status = 'near_limit';
      }
    }

    const quotaInfo: import('../../types').ProviderQuotaInfo = {
      provider: 'grok',
      remainingRequests,
      limitRequests,
      remainingTokens,
      limitTokens,
      resetTime: resetReqHeader || undefined,
      status,
      lastUpdated: new Date().toLocaleTimeString('th-TH'),
      message: status === 'exhausted'
        ? 'โควต้าคำขอของ Grok หมดแล้วชั่วคราว (Rate limit reached)'
        : status === 'near_limit'
        ? `โควต้า Grok ใกล้หมดแล้ว (เหลือ ${remainingRequests} คำขอ)`
        : `โควต้าพร้อมใช้งาน (เหลือ ${remainingRequests ?? 'ปกติ'} คำขอ)`
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('boai-quota-update', { detail: quotaInfo }));
    }

    if (res.status === 429) {
      throw new Error('GROK_QUOTA_EXHAUSTED');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
        throw new Error('GROK_QUOTA_EXHAUSTED');
      }
      throw new Error(msg);
    }

    const data = await res.json();
    let text = data.choices?.[0]?.message?.content || 'ไม่ได้รับคำตอบจาก Grok';

    // If quota is near limit, append friendly warning
    if (status === 'near_limit' && remainingRequests !== undefined) {
      text += `\n\n*(ปล. โควต้า Grok ใกล้หมดแล้วนะแก เหลืออีกประมาณ ${remainingRequests} คำขอก่อนรีเซ็ต)*`;
    }

    return text;
  }

  // Meta / Groq (Ultra-Fast) or OpenRouter
  public async callMeta(messages: ChatMessage[], systemPrompt: string, apiKey: string, model: string, provider: 'groq' | 'openrouter' = 'groq'): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    ];

    const endpoint = provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.groq.com/openai/v1/chat/completions';

    const defaultModel = provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'openai/gpt-oss-120b';
    const selectedModel = model || defaultModel;

    // For Groq, if the requested model is decommissioned or not accessible, auto-try proven active models
    const candidateModels = provider === 'groq'
      ? Array.from(new Set([
          selectedModel,
          'openai/gpt-oss-120b',
          'openai/gpt-oss-20b',
          'qwen/qwen3.8-27b',
        ]))
      : [selectedModel];

    let lastError: any = null;

    for (const tryModel of candidateModels) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: tryModel,
            messages: formattedMessages,
            temperature: 0.7,
          }),
        });

        // Parse Groq rate-limits
        if (provider === 'groq') {
          const remainingReq = res.headers.get('x-ratelimit-remaining-requests');
          const limitReq = res.headers.get('x-ratelimit-limit-requests');
          const resetReq = res.headers.get('x-ratelimit-reset-requests');
          if (remainingReq) {
            const rem = parseInt(remainingReq, 10);
            const lim = limitReq ? parseInt(limitReq, 10) : undefined;
            const quotaInfo: ProviderQuotaInfo = {
              provider: 'meta',
              remainingRequests: rem,
              limitRequests: lim,
              resetTime: resetReq || undefined,
              status: rem <= 5 ? 'near_limit' : 'ok',
              lastUpdated: new Date().toISOString(),
              message: `Groq (${tryModel}) เหลือ: ${rem}/${lim || '?'} คำขอ`,
            };
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('boai-quota-update', { detail: quotaInfo }));
            }
          }
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMsg = err.error?.message || `HTTP ${res.status}`;
          // If model doesn't exist or was decommissioned, try next candidate
          if (res.status === 404 || res.status === 400 || errMsg.includes('does not exist') || errMsg.includes('decommissioned')) {
            console.warn(`[AIService] Groq model "${tryModel}" unavailable: ${errMsg}. Trying fallback model...`);
            lastError = new Error(errMsg);
            continue;
          }
          if (res.status === 429) {
            throw new Error(`GROQ_QUOTA_EXHAUSTED: ${errMsg}`);
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        // If we succeeded with a fallback model different from original, auto-save settings
        if (tryModel !== model && provider === 'groq') {
          const cur = db.getSettings();
          db.saveSettings({ ...cur, meta_model: tryModel });
          console.info(`[AIService] Auto-migrated Groq model to "${tryModel}"`);
        }

        return data.choices?.[0]?.message?.content || 'ไม่ได้รับข้อความจากโมเดล';
      } catch (err: any) {
        if (err.message?.includes('GROQ_QUOTA_EXHAUSTED')) {
          throw err;
        }
        lastError = err;
      }
    }

    throw lastError || new Error('ไม่สามารถเรียกใช้งานโมเดล Groq ได้');
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
      if (provider === 'grok') {
        const key = customKey || settings.grok_api_key;
        if (!key) {
          return { success: false, message: 'ยังไม่ได้ระบุ Grok API Key (xAI)' };
        }
        const resp = await this.callGrok([testMsg], personality.system_prompt, key, settings.grok_model || 'grok-2-latest');
        return { success: true, message: resp.trim(), model: settings.grok_model || 'grok-2-latest' };
      }

      if (provider === 'meta') {
        const key = customKey || settings.meta_api_key;
        if (!key) {
          return { success: false, message: 'ยังไม่ได้ระบุ Meta/Groq API Key (เช่น gsk_...)' };
        }
        const activeModel = settings.meta_model || 'openai/gpt-oss-120b';
        const resp = await this.callMeta([testMsg], personality.system_prompt, key, activeModel, settings.meta_provider || 'groq');
        const finalSettings = db.getSettings();
        return {
          success: true,
          message: resp.trim(),
          model: finalSettings.meta_model || activeModel,
        };
      }

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

    // 0. Real-time Local Clock & Date (100% accurate, no hallucination)
    const isClockQuery = /(?:กี่โมง|เวลากี่โมง|ตอนนี้กี่โมง|เวลาตอนนี้|ดูนาฬิกา|นาฬิกา|เวลาเท่าไหร่|เวลาเท่าไร|บอกเวลา|วันอะไร|วันที่เท่าไหร่|วันที่เท่าไร|วันนี้วันอะไร|time|clock)/i.test(text);
    if (isClockQuery && !lower.includes('ตั้งปลุก') && !lower.includes('เตือน')) {
      const now = new Date();
      const thaiDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
      const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      const dayName = thaiDays[now.getDay()];
      const dateNum = now.getDate();
      const monthName = thaiMonths[now.getMonth()];
      const yearBE = now.getFullYear() + 543;
      const hours = now.getHours();
      const mins = now.getMinutes();
      const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} น.`;

      let periodStr = '';
      if (hours >= 5 && hours < 11) periodStr = 'ช่วงเช้า';
      else if (hours >= 11 && hours < 13) periodStr = 'ช่วงเที่ยง';
      else if (hours >= 13 && hours < 16) periodStr = 'ช่วงบ่าย';
      else if (hours >= 16 && hours < 19) periodStr = 'ช่วงเย็น';
      else if (hours >= 19 && hours < 24) periodStr = 'ช่วงค่ำ';
      else periodStr = 'ช่วงดึก';

      return `ตอนนี้เวลา ${timeStr} (${periodStr}) ${dayName}ที่ ${dateNum} ${monthName} พ.ศ. ${yearBE} ค่ะ`;
    }

    // 1. Windows Remote / Native System Control Intent
    if (/(?:remote\s*ได้จริงไหม|รีโมท\s*ได้จริงไหม|remote\s*ได้ไหม|รีโมท\s*ได้ไหม|remote\s*เครื่องฉัน|รีโมท\s*เครื่องเรา)/i.test(text)) {
      return `โนอาสามารถ Remote สั่งการระบบบนเครื่องคอมพิวเตอร์ของคุณได้จริงค่ะ\n\nสิ่งที่โนอาสั่งการได้บน Windows:\n1. Remote สั่งเปิดเพลง/คลิป/เว็บลิงก์ บนเบราว์เซอร์ของเครื่องโดยตรง ("remote เปิดเพลง...")\n2. สั่งล็อคหน้าจอคอมพิวเตอร์เพื่อความปลอดภัย ("ล็อคหน้าจอ" หรือ "Lock Screen")\n3. สั่งเปิดโปรแกรมระบบ เช่น เครื่องคิดเลข (Calculator), Notepad, หรือ Task Manager\n4. สั่งสลับโหมดหน้าต่างลอยจิ๋ว (Mini Mode)\n5. ส่งแจ้งเตือนระดับ Windows Notification ถึงหน้าจอคุณ\n\n(เป็นการสั่งการระบบในเครื่องของคุณค่ะ ไม่ใช่การรีโมทหน้าจอข้ามเครื่องแบบ AnyDesk นะคะ)`;
    }

    // Direct Windows Remote Actions
    if (/(?:ล็อคหน้าจอ|ล็อกหน้าจอ|ล็อคคอม|lock\s*screen)/i.test(text)) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSystemAction) {
        await (window as any).electronAPI.executeSystemAction('lock');
      }
      return `ล็อคหน้าจอคอมพิวเตอร์ให้เรียบร้อยแล้วค่ะ`;
    }

    if (/(?:เปิดเครื่องคิดเลข|เปิดแคลคูเลเตอร์|open\s*calculator|เปิด\s*calculator)/i.test(text)) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSystemAction) {
        await (window as any).electronAPI.executeSystemAction('calc');
      }
      return `เปิดเครื่องคิดเลข (Calculator) ให้เรียบร้อยแล้วค่ะ`;
    }

    if (/(?:เปิด\s*notepad|เปิดโน้ตแพด|เปิดสมุดจด)/i.test(text)) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSystemAction) {
        await (window as any).electronAPI.executeSystemAction('notepad');
      }
      return `เปิด Notepad ให้เรียบร้อยแล้วค่ะ`;
    }

    if (/(?:เปิด\s*task\s*manager|เปิดทาสก์เมเนเจอร์)/i.test(text)) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.executeSystemAction) {
        await (window as any).electronAPI.executeSystemAction('taskmgr');
      }
      return `เปิด Task Manager ให้เรียบร้อยแล้วค่ะ`;
    }

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

    // 2. Music Control Commands (Stop, Pause, Resume, Next, Volume adjustments)
    const musicControl = musicService.isMusicControlIntent(text);
    if (musicControl) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('boai-music-control', { detail: { action: musicControl } })
        );
      }

      if (musicControl === 'stop') {
        return `ปิดเพลงให้เรียบร้อยแล้วค่ะ`;
      }
      if (musicControl === 'pause') {
        return `พักเพลงไว้ชั่วคราวแล้วนะคะ`;
      }
      if (musicControl === 'resume') {
        return `เปิดเพลงต่อให้แล้วนะคะ`;
      }
      if (musicControl === 'next') {
        return `เปลี่ยนเป็นเพลงถัดไปให้แล้วค่ะ`;
      }
      if (musicControl === 'volume_substantial_decrease') {
        return `ปรับลดเสียงลงเหลือ 20% ของหลอดเสียงให้แล้วนะคะ`;
      }
      if (musicControl === 'volume_low') {
        return `ปรับลดเสียงต่ำลงแล้วค่ะ`;
      }
      if (musicControl === 'volume_decrease') {
        return `เบาเสียงเพลงลงแล้วค่ะ`;
      }
      if (musicControl === 'volume_increase') {
        return `เร่งเสียงเพลงแล้วค่ะ`;
      }
      if (musicControl === 'mute') {
        return `ปิดเสียงเพลงแล้วค่ะ (Muted)`;
      }
      if (musicControl === 'unmute') {
        return `เปิดเสียงเพลงกลับมาให้แล้วค่ะ`;
      }
    }

    // 3. Music / Audio Stream & YouTube Song Request
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
      }

      if (isRemoteRequest) {
        return `เปิดเพลง "${songInfo.query}" บนเบราว์เซอร์ให้เรียบร้อยแล้วค่ะ`;
      }

      return `เปิดเพลง "${songInfo.query}" เรียบร้อยแล้วค่ะ`;
    }

    // 4. Memory Save Intent (Explicit Memory Recording)
    const memorySaveMatch = text.match(/(?:ช่วยจำว่า|จำไว้ว่า|จำไว้นะว่า|จำไว้|จำว่า|บันทึกไว้ว่า|บันทึกว่า|จดไว้ว่า|จดว่า|จำข้อมูลว่า|บันทึกข้อมูลว่า)\s*(.+)/i);
    if (memorySaveMatch) {
      const factToSave = memorySaveMatch[1].trim();
      if (factToSave.length >= 2) {
        let category: import('../../types').MemoryCategory = 'preference';
        if (/(?:กิน|ดื่ม|อาหาร|ขนม|กาแฟ|ชา)/i.test(factToSave)) category = 'food';
        else if (/(?:แพ้|ยา|โรค|ป่วย|หมอ)/i.test(factToSave)) category = 'health';
        else if (/(?:งาน|เขียนโค้ด|โปรเจกต์|บริษัท|เรียน)/i.test(factToSave)) category = 'work';
        else if (/(?:ตื่น|นอน|ออกกำลังกาย|วิ่ง)/i.test(factToSave)) category = 'routine';
        else if (/(?:ชื่อ|เกิด|อายุ|อยู่|บ้าน)/i.test(factToSave)) category = 'personal';

        db.addMemory(factToSave, category, 5, 100, true);
        return `บันทึกความทรงจำเรียบร้อยแล้วค่ะว่า "${factToSave}" โนอาจดจำไว้ในสมองถาวรแล้วนะคะ`;
      }
    }

    // 5. Memory Query / Recall Intent
    if (/(?:จำอะไรเกี่ยวกับ|จำอะไรได้บ้าง|จำอะไรได้บ้างเกี่ยวกับ|ข้อมูลของฉัน|ประวัติของฉัน|จำข้อมูลฉันได้ไหม|รู้จักเรายังไง|เราชอบอะไร|เราแพ้อะไร|จำเราได้ไหม)/i.test(text)) {
      const memories = db.getMemories(false).filter(m => m.status !== 'archived');
      if (memories.length > 0) {
        const listStr = memories.slice(0, 5).map((m, idx) => `${idx + 1}. ${m.content}`).join('\n');
        return `โนอาจำเรื่องของคุณได้ดังนี้ค่ะ:\n${listStr}`;
      } else {
        return `ตอนนี้ยังไม่มีข้อมูลความทรงจำที่บันทึกไว้ค่ะ`;
      }
    }

    // 6. Reminders & Work Schedule (Deletion, Completion, Export, LINE Push, Query, Save)
    // 6.0 Inquiry on whether task removal is actually deleted in system
    const isQuestionAboutDeletion = /(?:ยังไม่ได้.*(?:รึป่าว|หรือเปล่า|รึเปล่า|ไหม|มั้ย)|หรือยัง|รึยัง|ทำไม.*(?:ไม่ออก|ไม่ลบ))/i.test(text);
    if (isQuestionAboutDeletion && /(?:งาน|ตารางงาน|ระบบ|แจ้งเตือน)/i.test(text) && /(?:ออก|ลบ)/i.test(text)) {
      const reminders = db.getReminders();
      return `ใช่ค่ะ ก่อนหน้านี้ระบบยังไม่ได้ลบออกจากฐานข้อมูลจริง แต่ตอนนี้โนอาได้อัปเดตระบบให้ลบออกจากระบบจริงได้แล้วค่ะ (ปัจจุบันมีงานในตารางทั้งหมด ${reminders.length} รายการค่ะ)`;
    }

    // 6.1 Clear All Reminders / Schedule
    // Covers: "เอาตารางงานออก", "ลบตารางงานออก", "เคลียร์ตารางงาน", "เอาตารางออก", "ลบตารางออก", "ลบตารางงานทั้งหมด", "เอางานในตารางงานออก", "เอางานออกจากระบบ", "ล้างตารางงาน"
    let cleanClearText = text.trim();
    cleanClearText = cleanClearText.replace(/^(?:ไอ้โนอา|ไอโนอา|น้องโนอา|คุณโนอา|โนอาห์|โนอา|noar\s*ai|noar)\s*[,.:;]?\s*/gi, '');
    cleanClearText = cleanClearText.replace(/^(?:ช่วย|รบกวน|กรุณา|วาน|ให้)?\s*/gi, '');
    cleanClearText = cleanClearText.replace(/(?:นะแก|นะจ๊ะ|หน่อยนะ|หน่อยดิ|หน่อยสิ|หน่อยครับ|หน่อยค่ะ|หน่อย|ให้หน่อยนะ|ให้หน่อยครับ|ให้หน่อยค่ะ|ให้หน่อยดิ|ให้หน่อยสิ|ให้หน่อย|ให้เราหน่อย|ให้ฉันหน่อย|ด้วยนะ|ด้วยครับ|ด้วยค่ะ|ด้วย|ทีครับ|ทีค่ะ|ที|ซิ|ซี่)$/gi, '').trim();

    const isClearAllSchedule = (
      /(?:ลบ|เคลียร์|ล้าง|เอา)\s*(?:การ)?(?:แจ้งเตือน|ตารางงาน|นัด|รายการเตือน|ตาราง|คิวงาน)\s*(?:ทั้งหมด|หมดเลย|ทุกอัน|ออกให้หมด|ออกหมด)/i.test(text) ||
      (
        !/(?:มี|ดู|เช็ค|ตรวจ|บอก|ขอดู|มีอะไร|แสดง|บันทึก|ช่วยเตือน|เตือนฉันตอน|ลงตารางงานว่า|\d+)/i.test(cleanClearText) &&
        (
          /(?:เอา|ลบ|เคลียร์|ล้าง)\s*(?:การ)?(?:แจ้งเตือน|ตารางงาน|นัด|รายการเตือน|ตาราง|คิวงาน)\s*(?:ออก|ทิ้ง)?$/i.test(cleanClearText) ||
          /(?:เอา|ลบ|เคลียร์|ล้าง)\s*(?:งาน)?(?:ในตารางงาน|ในระบบ|ในตาราง|ออกจากตารางงาน|ออกจากระบบ)\s*(?:ออก|ทิ้ง)?$/i.test(cleanClearText)
        )
      )
    );

    if (isClearAllSchedule) {
      const current = db.getReminders();
      if (current.length === 0) {
        return `ตอนนี้ไม่มีรายการแจ้งเตือนหรือตารางงานในระบบอยู่แล้วค่ะ`;
      }
      db.saveReminders([]);
      return `ลบและนำรายการตารางงานออกจากระบบเรียบร้อยแล้วค่ะ`;
    }

    // 6.2 Delete Completed Tasks ("ลบงานที่ทำเสร็จแล้วออก", "เคลียร์งานที่เสร็จแล้ว")
    const isDeleteCompleted = /(?:ลบ|เคลียร์|เอา|ล้าง)\s*(?:รายการ)?\s*(?:งาน|การแจ้งเตือน|ตารางงาน|นัด)?\s*(?:ที่)?(?:ทำ)?เสร็จ(?:แล้ว)?\s*(?:ออก(?:จาก(?:ตารางงาน|ระบบ)?)?|ทิ้ง|หมด)?/i.test(text);
    if (isDeleteCompleted) {
      const res = db.removeReminderSmart({ type: 'completed' });
      if (res.status === 'empty') {
        return `ตอนนี้ไม่มีรายการแจ้งเตือนหรือตารางงานในระบบอยู่แล้วค่ะ`;
      }
      if (res.status === 'not_found') {
        return `ตอนนี้ไม่มีรายการงานที่ทำเสร็จแล้วค้างอยู่ในระบบค่ะ (เหลืองานที่ต้องทำอีก ${res.remainingCount} รายการ)`;
      }
      return `ลบรายการงานที่ทำเสร็จแล้ว (${res.deletedCount} รายการ) ออกจากระบบเรียบร้อยแล้วค่ะ (เหลืองานที่ต้องทำอีก ${res.remainingCount} รายการ)`;
    }

    // 6.3 Delete by Index ("ลบรายการที่ 1 ออก", "เอาอันที่ 2 ออก", "เอางานลำดับที่ 1 ออก")
    const deleteIndexMatch = text.match(/(?:ลบ|เอา|ยกเลิก|ตัด|เคลียร์)\s*(?:รายการที่|อันที่|งานที่|ข้อที่|ลำดับที่|รายการ|อัน|งาน|ข้อ|เบอร์)\s*(\d+)\s*(?:ออก(?:จาก(?:ตารางงาน|ระบบ|เครื่อง)?)?|ทิ้ง|ให้หน่อย|ด้วย)?$/i);
    if (deleteIndexMatch) {
      const idx = parseInt(deleteIndexMatch[1], 10);
      const res = db.removeReminderSmart({ type: 'index', index: idx });
      if (res.status === 'empty') {
        return `ตอนนี้ไม่มีรายการแจ้งเตือนหรือตารางงานในระบบอยู่แล้วค่ะ`;
      }
      if (res.status === 'not_found') {
        return `ไม่พบรายการที่ ${idx} ในระบบค่ะ (ในตารางงานมีทั้งหมด ${res.remainingCount} รายการ)`;
      }
      const remCountText = res.remainingCount > 0 ? `เหลืองานในตารางอีก ${res.remainingCount} รายการค่ะ` : `ไม่มีงานค้างในระบบแล้วค่ะ`;
      return `ลบรายการที่ ${idx} "${res.deletedItem?.title}" ออกจากระบบเรียบร้อยแล้วค่ะ (${remCountText})`;
    }

    // 6.4 Delete Specific Task by keyword ("ลบงานประชุมออกจากตารางงาน", "เอางานส่งรายงานออก")
    const isDeleteTask = (
      /(?:ลบ|เอา|ยกเลิก|ตัด)\s*(?:รายการ|การแจ้งเตือน|ตารางงาน|นัด|งาน|สิ่งที่ต้องทำ)?\s*(.+?)\s*(?:ออก(?:จาก(?:ตารางงาน|ระบบ|เครื่อง)?)?|ทิ้ง|ให้หน่อย|ด้วย)$/i.test(text) ||
      /(?:เอางาน|ลบงาน|เอารายการ|ลบรายการ)\s+(?!ใน|ออก)(.+?)\s*(?:ออกจากตารางงาน|ออกจากระบบ|ออก|ทิ้ง)/i.test(text)
    ) && !/(?:บันทึก|ช่วยเตือน|เตือนฉันตอน|ลงตาราง)/i.test(text);

    if (isDeleteTask) {
      let clean = text.trim();
      clean = clean.replace(/^(?:ไอ้โนอา|ไอโนอา|น้องโนอา|คุณโนอา|โนอาห์|โนอา|noar\s*ai|noar)\s*[,.:;]?\s*/gi, '');
      clean = clean.replace(/(?:นะแก|นะจ๊ะ|หน่อยนะ|หน่อยดิ|หน่อยสิ|หน่อยครับ|หน่อยค่ะ|หน่อย|ให้หน่อยนะ|ให้หน่อยครับ|ให้หน่อยค่ะ|ให้หน่อยดิ|ให้หน่อยสิ|ให้หน่อย|ให้เราหน่อย|ให้ฉันหน่อย|ด้วยนะ|ด้วยครับ|ด้วยค่ะ|ด้วย|ทีครับ|ทีค่ะ|ที|ซิ|ซี่)$/gi, '');
      clean = clean.replace(/\s*(?:ออก(?:จาก(?:ตารางงาน|ระบบ|เครื่อง)?)?|ทิ้ง|ออกไป)$/gi, '');
      clean = clean.replace(/^(?:ช่วย|รบกวน|กรุณา|วาน)?\s*(?:ลบ|เอา|ยกเลิก|เคลียร์|ตัด)\s*/gi, '');
      clean = clean.replace(/^(?:รายการ|การแจ้งเตือน|ตารางงาน|นัด|คิวงาน|สิ่งที่ต้องทำ)\s*/gi, '');
      clean = clean.replace(/^งาน\s*(?:ใน(?:ตารางงาน|ระบบ)?)?\s*/gi, '');
      clean = clean.replace(/^(?:ในตารางงาน|ในระบบ)\s*/gi, '');
      clean = clean.trim();

      const res = db.removeReminderSmart({ type: 'keyword', keyword: clean });
      if (res.status === 'empty') {
        return `ตอนนี้ไม่มีรายการแจ้งเตือนหรือตารางงานในระบบอยู่แล้วค่ะ`;
      }
      if (res.status === 'deleted') {
        const remCountText = res.remainingCount > 0 ? `เหลืองานในตารางอีก ${res.remainingCount} รายการค่ะ` : `ไม่มีงานค้างในระบบแล้วค่ะ`;
        return `ลบงาน "${res.deletedItem?.title}" ออกจากระบบเรียบร้อยแล้วค่ะ (${remCountText})`;
      }
      if (res.status === 'need_selection') {
        let msg = `ในตารางงานมี ${res.allReminders?.length} รายการ ต้องการให้ลบรายการไหนคะ:\n`;
        msg += (res.allReminders || []).map((r, i) => `${i + 1}. [${r.time}] ${r.title}${r.location ? ` (สถานที่: ${r.location})` : ''}`).join('\n');
        return msg;
      }
      if (res.status === 'multiple_matches') {
        let msg = `พบงานที่ตรงกับคำว่า "${res.keyword}" จำนวน ${res.matches?.length} รายการ ต้องการให้ลบรายการไหนคะ:\n`;
        msg += (res.matches || []).map((r, i) => `${i + 1}. [${r.time}] ${r.title}${r.location ? ` (สถานที่: ${r.location})` : ''}`).join('\n');
        return msg;
      }
      if (res.status === 'not_found') {
        return `ไม่พบรายการงานที่ตรงกับ "${res.keyword}" ในตารางงานค่ะ`;
      }
    }

    // 6.5 Complete Task Intent ("ทำงานประชุมเสร็จแล้ว", "ทำรายการที่ 1 เสร็จแล้ว", "ประชุมทีมเสร็จแล้ว")
    const completeMatch = text.match(/(?:ทำ(?:งาน)?|เสร็จ)?\s*(?:รายการที่|อันที่|งานที่|ข้อที่|ลำดับที่)?\s*(\d+)?\s*(?:งาน|รายการ|นัด|เรื่อง)?\s*(.+?)?\s*(?:เสร็จแล้ว|เสร็จสิ้น|เรียบร้อยแล้ว)/i);
    if (completeMatch && !/(?:บันทึก|ช่วยเตือน|เตือนฉันตอน|ลงตาราง)/i.test(text)) {
      const idx = completeMatch[1] ? parseInt(completeMatch[1], 10) : undefined;
      let subject = (completeMatch[2] || '').trim();
      subject = subject.replace(/^(?:ไอ้โนอา|ไอโนอา|น้องโนอา|คุณโนอา|โนอาห์|โนอา|noar\s*ai|noar)\s*[,.:;]?\s*/gi, '');
      subject = subject.replace(/^(?:ทำ|ทำงาน|เรื่อง|งาน|รายการ)\s*/gi, '').trim();

      const res = db.completeReminderSmart({ index: idx, keyword: subject });
      if (res.status === 'empty') {
        return `ตอนนี้ไม่มีรายการแจ้งเตือนหรือตารางงานในระบบอยู่แล้วค่ะ`;
      }
      if (res.status === 'completed') {
        const pendingText = res.remainingPendingCount > 0 ? `เหลืองานที่ต้องทำอีก ${res.remainingPendingCount} รายการค่ะ` : `เคลียร์งานครบทุกรายการแล้วค่ะ`;
        return `อัปเดตสถานะงาน "${res.item?.title}" เป็นเสร็จสิ้นแล้วค่ะ (${pendingText})`;
      }
      if (res.status === 'already_completed') {
        return `งาน "${res.item?.title}" มีสถานะเสร็จสิ้นอยู่แล้วค่ะ`;
      }
      if (res.status === 'need_selection') {
        let msg = `มีงานที่ยังไม่เสร็จ ${res.allPending?.length} รายการ ต้องการระบุรายการไหนคะ:\n`;
        msg += (res.allPending || []).map((r, i) => `${i + 1}. [${r.time}] ${r.title}${r.location ? ` (สถานที่: ${r.location})` : ''}`).join('\n');
        return msg;
      }
      if (res.status === 'not_found') {
        return `ไม่พบรายการงานดังกล่าวในตารางงานค่ะ`;
      }
    }

    // 6.6 Export Reminders & Work Schedule (CSV Download)
    const isExportSchedule = (
      /(?:export|ส่งออก|ดาวน์โหลด|download)\s*(?:ตารางงาน|การแจ้งเตือน|แจ้งเตือน|ตาราง|กำหนดการ|คิวงาน|reminders?|schedule|ไฟล์)?/i.test(text) ||
      /(?:ตารางงาน|การแจ้งเตือน|แจ้งเตือน|reminders?|schedule)\s*(?:export|ส่งออก|ดาวน์โหลด)/i.test(text) ||
      /(?:export|ส่งออก)\s*(?:ให้(?:เรา|หน่อย|โนอา|ด้วย)?)/i.test(text)
    );

    if (isExportSchedule) {
      const reminders = db.getReminders();
      if (reminders.length === 0) {
        return `ตอนนี้ยังไม่มีรายการแจ้งเตือนหรือตารางงานสำหรับ Export ค่ะ`;
      }

      const csv = db.exportRemindersCSV();
      const todayStr = new Date().toISOString().split('T')[0];
      db.downloadExportFile(csv, `noar_schedule_${todayStr}.csv`, 'text/csv;charset=utf-8;');

      return `ส่งออกตารางงานและการแจ้งเตือนทั้งหมด (${reminders.length} รายการ) เป็นไฟล์ CSV ให้เรียบร้อยแล้วค่ะ`;
    }

    // 6.7 Send Schedule to LINE Official Account (Strict rule: ONLY send when explicitly requested to send to LINE)
    const isSendScheduleToLine = (
      /(?:ส่ง|แชร์|ฟอร์เวิร์ด|forward|push)\s*(?:ตารางงาน|การแจ้งเตือน|ตาราง|กำหนดการ|คิวงาน|แจ้งเตือน|reminders?|schedule|สิ่งที่ต้องทำ)?\s*(?:ของ)?(?:วันนี้|พรุ่งนี้|เมื่อวาน|วันที่\s*\d+|สัปดาห์นี้|เดือนนี้)?\s*(?:ไป(?:ยัง|ที่)?)?\s*(?:line|ไลน์)/i.test(text) ||
      /(?:line|ไลน์)\s*(?:ส่ง|แชร์)?\s*(?:ตารางงาน|การแจ้งเตือน|ตาราง|กำหนดการ|คิวงาน|แจ้งเตือน)?/i.test(text) ||
      /(?:ส่ง|ช่วยส่ง)\s*(?:ตาราง(?:งาน)?|การแจ้งเตือน|คิวงาน)\s*(?:ของ)?(?:วันนี้|พรุ่งนี้|วันที่\s*\d+)?\s*(?:เข้า|ไปที่|ไปใน|ไป)\s*(?:line|ไลน์)/i.test(text)
    ) && /(?:line|ไลน์)/i.test(text);

    if (isSendScheduleToLine) {
      const lineRes = await lineService.sendScheduleToLine(text);
      return lineRes.message;
    }

    // 6.8 Query / List Reminders & Work Schedule (Standardized pattern display)
    const isScheduleQuery = (
      /(?:มี|ดู|เช็ค|ตรวจ|บอก|ขอ|สรุป|เปิด|เอา.*มาดู|ขอดู|แสดง)\s*(?:รายการ)?\s*(?:การ)?(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|ตาราง|กำหนดการ|คิวงาน)/i.test(text) ||
      /(?:เอา|ขอ|เปิด|ดึง)\s*(?:ตารางงาน|ตาราง|การแจ้งเตือน|คิวงาน)\s*(?:มาดู|มาตรวจ|มาเช็ค|ออกมา)/i.test(text) ||
      /(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|ตาราง|กำหนดการ|คิวงาน|สิ่งที่ต้องทำ)\s*(?:มีอะไรบ้าง|อะไรบ้าง|มีไหม|มีมั้ย|ทั้งหมด|วันนี้มีอะไร|มีอะไร)/i.test(text) ||
      /(?:รายการ\s*(?:การ)?(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|สิ่งที่ต้องทำ))/i.test(text) ||
      /(?:ตอนนี้|ตินนี้|วันนี้|เรา)\s*(?:มี|ต้องทำ|มีอะไร)\s*(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|งาน)?\s*(?:อะไรบ้าง|ไหม|มั้ย)/i.test(text) ||
      /(?:reminders?|schedule|task)\s*(?:list|check|view|show|what)/i.test(text)
    ) && !/(?:บันทึก.*ให้หน่อย|ช่วยเตือนว่า|ช่วยเตือน|เตือนให้หน่อย|ตั้งเตือน|เตือนฉันตอน|เตือนตอน|ลงตาราง)/i.test(text);

    if (isScheduleQuery) {
      const reminders = db.getReminders();
      if (reminders.length === 0) {
        return `ตอนนี้คุณยังไม่มีรายการแจ้งเตือนหรือตารางงานที่บันทึกไว้ค่ะ`;
      }

      const pending = reminders.filter(r => !r.completed);
      const completed = reminders.filter(r => r.completed);

      let reply = `รายการแจ้งเตือนและตารางงานของคุณมีดังนี้ค่ะ:\n`;
      if (pending.length > 0) {
        reply += `\n[รายการที่ต้องทำ (${pending.length} รายการ)]:\n`;
        reply += pending.map((r, i) => `${i + 1}. [${r.time}] ${r.title}${r.location ? ` (สถานที่: ${r.location})` : ''}`).join('\n');
      }
      if (completed.length > 0) {
        reply += `\n\n[เสร็จสิ้นแล้ว (${completed.length} รายการ)]:\n`;
        reply += completed.map((r, i) => `${i + 1}. [${r.time}] ${r.title}${r.location ? ` (สถานที่: ${r.location})` : ''}`).join('\n');
      }
      return reply;
    }

    // 6.9 Save / Record Reminders & Work Schedule (Standardized extraction: งานอะไร, เมื่อไหร่, ที่ไหน)
    const isScheduleSave = (
      /(?:บันทึก.*ให้หน่อย|ช่วยเตือนว่า|ช่วยเตือน|เตือนให้หน่อย|ตั้งเตือนว่า|ตั้งเตือน|บันทึกเตือน|บันทึกตารางงาน|ลงตารางงาน|เพิ่มตารางงาน|บันทึกนัด|เตือนฉันตอน|เตือนตอน|เตือนเราตอน|ช่วยบันทึก|บันทึกการแจ้งเตือน|บันทึกนัดหมาย)/i.test(text) ||
      /(?:บันทึกว่า|ลงนัดว่า)\s*(.+)/i.test(text)
    );

    if (isScheduleSave) {
      const { what, when, where } = this.extractScheduleDetails(text);
      const newRem = db.addReminder(what, when, where);
      return `บันทึกตารางงานเรียบร้อยแล้วค่ะ: [${newRem.time}] ${newRem.title}${newRem.location ? ` (สถานที่: ${newRem.location})` : ''}`;
    }

    // 7. Storage & Memory Quota Management (Clear Storage, Check Storage Usage)
    if (/(?:ลบ|เคลียร์|ล้าง|clear)\s*(?:แคช|cache|storage|พื้นที่|ข้อมูลแชท|ประวัติแชท|ความจุ)/i.test(text)) {
      db.clearChatStorage();
      await db.clearCacheStorage();
      const info = await db.getStorageUsageInfo();
      return `เคลียร์ประวัติแชทและล้างแคชข้อมูลชั่วคราวให้เรียบร้อยแล้วค่ะ ตอนนี้พื้นที่ใช้งานลดลงเหลือ ${info.formattedTotal} จากโควต้าสูงสุด ${info.formattedMax} (คิดเป็น ${info.usagePercentage}%) ค่ะ`;
    }

    if (/(?:เช็ค|ตรวจ|ดู|เหลือ|เท่าไหร่|เต็มไหม|เต็มมั้ย)\s*(?:[\u0E00-\u0E7Fa-zA-Z\s]{0,15})\s*(?:พื้นที่|storage|ความจุ|เมม|กิกะไบต์|gb)/i.test(text) ||
        /(?:พื้นที่|storage|ความจุ|เมม)\s*(?:[\u0E00-\u0E7Fa-zA-Z\s]{0,15})\s*(?:เหลือเท่าไหร่|เต็มไหม|เต็มมั้ย|เท่าไหร่|เป็นไง|กี่\s*gb|ใช้ไปเท่าไหร่)/i.test(text)) {
      const info = await db.getStorageUsageInfo();
      return `ตอนนี้ใช้งานพื้นที่จัดเก็บไปแล้ว ${info.formattedTotal} จากโควต้าสูงสุดที่ตั้งไว้ ${info.formattedMax} (คิดเป็น ${info.usagePercentage}%) ค่ะ\n\n[รายละเอียดการใช้งาน]:\n- ประวัติแชท: ${info.categories[0].formatted}\n- ความจำ & ข้อมูลเทรน: ${info.categories[1].formatted}\n- ตารางงาน & แจ้งเตือน: ${info.categories[2].formatted}\n- แคช & บันทึกระบบ: ${info.categories[3].formatted}`;
    }

    return null;
  }

  // Extract schedule / reminder: What (งานอะไร), When (เมื่อไหร่), Where (ที่ไหน) from natural speech
  private extractScheduleDetails(text: string): { what: string; when: string; where?: string } {
    let clean = text.trim();

    // 1. Remove wake words and prompt prefixes
    clean = clean.replace(/^(?:ไอ้โนอา|ไอโนอา|น้องโนอา|คุณโนอา|โนอาห์|โนอา|noar\s*ai|noar)\s*[,.:;]?\s*/gi, '');
    clean = clean.replace(/(?:นะแก|นะจ๊ะ|หน่อยนะ|หน่อยดิ|หน่อยสิ|หน่อยครับ|หน่อยค่ะ|หน่อย|ให้หน่อยนะ|ให้หน่อยครับ|ให้หน่อยค่ะ|ให้หน่อยดิ|ให้หน่อยสิ|ให้หน่อย|ให้เราหน่อย|ให้ฉันหน่อย|ด้วยนะ|ด้วยครับ|ด้วยค่ะ|ด้วย|ได้ไหม|ได้มั้ย|ทีครับ|ทีค่ะ|ที|ซิ|ซี่)$/gi, '');
    clean = clean.replace(/^(?:ช่วย|รบกวน|กรุณา|วาน)?\s*(?:บันทึกตารางงานว่า|บันทึกตารางงาน|บันทึกการแจ้งเตือนว่า|บันทึกการแจ้งเตือน|บันทึกนัดว่า|บันทึกนัด|บันทึกเตือนว่า|บันทึกเตือน|บันทึกว่า|บันทึก|ช่วยเตือนว่า|ช่วยเตือน|ตั้งเตือนว่า|ตั้งเตือน|เตือนฉันว่า|เตือนเราว่า|เตือนฉันตอน|เตือนเราตอน|เตือนฉัน|เตือนเรา|เตือนว่า|เตือน|ลงตารางงานว่า|ลงตารางงาน|เพิ่มตารางงานว่า|เพิ่มตารางงาน|ลงนัดว่า|ลงนัด)\s*/gi, '');

    let when = '';
    let where = '';
    let what = clean;

    // 2. Extract Date / Relative Day (e.g. วันนี้, พรุ่งนี้, มะรืนนี้, วันศุกร์นี้, วันจันทร์)
    let dayPart = '';
    const dayMatch = what.match(/(?:วันพรุ่งนี้|พรุ่งนี้|มะรืนนี้|วันนี้|วันจันทร์|วันอังคาร|วันพุธ|วันพฤหัสบดี|วันพฤหัส|วันศุกร์|วันเสาร์|วันอาทิตย์)(?:\s*(?:นี้|หน้า))?/i);
    if (dayMatch) {
      dayPart = dayMatch[0].trim();
      what = what.replace(dayMatch[0], ' ');
    }

    // 3. Extract Time (When) FIRST before location
    const preciseTimeMatch = what.match(/(?:ตอน|เวลา)?\s*([0-2]?[0-9][.:][0-5][0-9]\s*(?:น\.|นาฬิกา)?)/i);
    const thaiColloquialMatch = what.match(/(?:ตอน|เวลา)?\s*([0-2]?[0-9]\s*(?:โมงเช้า|โมงเย็น|โมงครึ่ง|โมง|ทุ่ม|น\.|นาฬิกา)|บ่าย\s*(?:โมง|สอง|สาม|สี่|[1-4])(?:\s*(?:โมง|ครึ่ง))?|เที่ยง(?:ตรง|วัน|คืน)?|สองทุ่ม|สามทุ่ม|สี่ทุ่ม|ห้าทุ่ม|หัวค่ำ|เช้าตรู่|เช้า|สาย|บ่าย|เย็น(?:นี้)?|ค่ำ|ดึก)/i);

    if (preciseTimeMatch) {
      let t = preciseTimeMatch[1].trim();
      if (!t.endsWith('น.') && !t.endsWith('นาฬิกา') && /\d/.test(t)) t += ' น.';
      when = (dayPart ? `${dayPart} ` : '') + t;
      what = what.replace(preciseTimeMatch[0], ' ');
    } else if (thaiColloquialMatch && thaiColloquialMatch[0].trim().length > 1) {
      let t = thaiColloquialMatch[0].trim();
      if (!t.startsWith('ตอน') && !t.startsWith('เวลา') && !dayPart) {
        t = 'ตอน' + t;
      }
      when = (dayPart ? `${dayPart} ` : '') + t;
      what = what.replace(thaiColloquialMatch[0], ' ');
    } else if (dayPart) {
      when = dayPart;
    } else {
      when = 'เร็วๆ นี้';
    }

    // 4. Extract Location (Where)
    const locationMatch = what.match(/(?:ที่|ณ)\s*([^,.\n!?]+)/i);
    if (locationMatch) {
      const rawLoc = locationMatch[1].trim();
      const actionRegex = /(กิน|ทาน|นัด|คุย|พบ|ประชุม|เจอ|ส่ง|รับ|ทำ|ไป|ดู|ซื้อ|สัมภาษณ์|หา|ตรวจ|มี|เรียน|สอน)/;
      const splitMatch = rawLoc.match(actionRegex);
      if (splitMatch && splitMatch.index && splitMatch.index > 0) {
        const locOnly = rawLoc.substring(0, splitMatch.index).trim();
        const restAction = rawLoc.substring(splitMatch.index).trim();
        where = locOnly;
        what = what.replace(locationMatch[0], ' ' + restAction + ' ');
      } else {
        const words = rawLoc.split(/\s+/);
        if (words.length > 4) {
          where = words.slice(0, 3).join(' ');
          const rest = words.slice(3).join(' ');
          what = what.replace(locationMatch[0], ' ' + rest + ' ');
        } else {
          where = rawLoc;
          what = what.replace(locationMatch[0], ' ');
        }
      }

      where = where.replace(/^(?:ที่|ณ)\s*/, '').trim();
      if (/^(?:มี|ต้องทำ|เคย|รัก|เสร็จ|ดี|สุด|จริง)$/i.test(where)) {
        where = '';
      }
    }

    // 5. Clean What (Action / Event)
    what = what.replace(/^(?:มี|จะไป|ไป|เรื่อง|งาน|นัด|สิ่งที่ต้องทำ)\s*/gi, '');
    what = what.replace(/\s*(?:ตอน|เวลา|ที่|ณ)\s*$/gi, '');
    what = what.replace(/\s{2,}/g, ' ').trim();

    if (!what || what.length < 2) {
      what = 'กิจกรรมที่ต้องทำ';
    }

    return {
      what,
      when: when || 'เร็วๆ นี้',
      where: where || undefined,
    };
  }

  // Smart Offline/Local Demo Generator adhering to Personality
  private generateSmartDemoResponse(userText: string): string {
    const lower = userText.toLowerCase();

    if (lower.includes('สวัสดี') || lower.includes('หวัดดี') || lower.includes('hi') || lower.includes('hello')) {
      return `สวัสดีค่ะ มีอะไรให้โนอาช่วยบอกได้เลยนะคะ`;
    }

    if (lower.includes('ทำอะไรได้บ้าง') || lower.includes('ช่วยอะไร')) {
      return `โนอาช่วยเปิดเพลง ตรวจสภาพอากาศ บันทึกเตือนความจำ และตอบคำถามต่างๆ ได้ค่ะ`;
    }

    if (lower.includes('ชื่ออะไร') || lower.includes('ใคร')) {
      return `โนอาค่ะ ผู้ช่วย AI ประจำเครื่องของคุณค่ะ`;
    }

    return `รับทราบค่ะ เรื่อง "${userText}" มีอะไรให้ช่วยเพิ่มเติมบอกได้เลยนะคะ`;
  }
}

export const aiService = AIService.getInstance();
