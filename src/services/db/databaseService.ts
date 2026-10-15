import {
  AppSettings,
  ChatMessage,
  Conversation,
  ExampleTrainingItem,
  KnowledgeItem,
  MemoryItem,
  PersonalityConfig,
  ReminderItem
} from '../../types';

const STORAGE_KEYS = {
  SETTINGS: 'boai_settings',
  CONVERSATIONS: 'boai_conversations',
  MESSAGES: 'boai_messages',
  MEMORIES: 'boai_memories',
  KNOWLEDGE: 'boai_knowledge',
  EXAMPLES: 'boai_examples',
  PERSONALITY: 'boai_personality',
  REMINDERS: 'boai_reminders',
};

const DEFAULT_SETTINGS: AppSettings = {
  wake_word: 'โบ้',
  alternate_names: ['ไอ้โบ้', 'ไอโบ้', 'น้องโบ', 'โบ', 'บักโบ้', 'Bo AI', 'โบไอ', 'Hey Bo'],
  sensitivity: 75,
  always_listening: true,
  llm_provider: 'gemini',
  claude_api_key: import.meta.env.VITE_CLAUDE_API_KEY || '',
  openai_api_key: import.meta.env.VITE_OPENAI_API_KEY || '',
  gemini_api_key: import.meta.env.VITE_GEMINI_API_KEY || '',
  claude_model: import.meta.env.VITE_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  openai_model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o',
  gemini_model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest',
  input_device_id: 'default',
  output_device_id: 'default',
  auto_start: true,
  privacy_mode: true,
  tts_rate: 1.0,
  tts_pitch: 1.0,
  tts_voice: 'th-TH',
  tts_engine: 'natural_female',
  openai_tts_voice: 'nova',
  openai_tts_model: 'tts-1-hd',
  vad_timeout_ms: 3000,
};

const DEFAULT_PERSONALITY: PersonalityConfig = {
  name: 'โบ้',
  system_prompt: `คุณคือ "โบ้" เพื่อนสนิทคู่หูของผู้ใช้ เป็นคนจริงใจ อารมณ์ดี ฉลาด เป็นกันเอง คุยสบายๆ เหมือนเพื่อนแท้ที่นั่งข้างๆ ไม่พูดทางการแบบคอลเซ็นเตอร์ ไม่ประดิษฐ์คำ ตอบกระชับ ได้ใจความ ตรงประเด็นทันที ช่วยคิด ช่วยเตือน คุยเล่นได้ทุกเรื่อง และไม่พูดถึงชื่อโมเดลหรือระบบ AI หรือ Gemini หรือ Claude เด็ดขาด`,
  speaking_style: 'เป็นเพื่อนสนิท อารมณ์ดี จริงใจ สบายๆ คุยเป็นธรรมชาติเหมือนเพื่อนคุยกัน',
  formality_level: 1,
};

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem_1',
    content: 'ผู้ใช้ชอบทำงานในสภาพแวดล้อม Dark Theme และเน้นการพิมพ์/สั่งการเสียงภาษาไทยเป็นหลัก',
    category: 'preference',
    importance: 5,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mem_2',
    content: 'ชอบดื่มกาแฟดริปตอนเช้าเวลา 08:30 น. ก่อนเริ่มทำงานเขียนโค้ด',
    category: 'routine',
    importance: 4,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'mem_3',
    content: 'กำลังพัฒนาโปรเจกต์ Personal AI Desktop Assistant ด้วย Electron, React และ TypeScript',
    category: 'work',
    importance: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const DEFAULT_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'kn_1',
    title: 'คู่มือระบบ Wake Word และเสียงคำสั่ง',
    content: 'ผู้ใช้สามารถเรียก "น้องโบ" เพื่อเปิดโหมดรับฟังเสียงคำสั่ง เมื่อไฟสถานะเปลี่ยนเป็นสีฟ้า Neon Cyan แสดงว่าพร้อมรับฟังคำสั่งเสียง จากนั้นสามารถพูดสั่งการได้ทันที เช่น "เปิดเพลง", "ช่วยสรุปตารางงานวันนี้", "สภาพอากาศเป็นอย่างไร"',
    source: 'manual',
    created_at: new Date().toISOString(),
  },
  {
    id: 'kn_2',
    title: 'สเปคและขอบเขตงาน Bo AI v1.0',
    content: 'Bo AI เป็น Desktop Assistant ทำงานใน System Tray รันบน Windows 10/11 ใช้สถาปัตยกรรม Privacy-first จัดเก็บฐานข้อมูล SQLite ภายในเครื่อง',
    source: 'manual',
    created_at: new Date().toISOString(),
  }
];

const DEFAULT_EXAMPLES: ExampleTrainingItem[] = [
  {
    id: 'ex_1',
    user_query: 'น้องโบ วันนี้อากาศที่กรุงเทพเป็นยังไงบ้าง?',
    expected_response: 'วันนี้ที่กรุงเทพฯ ท้องฟ้าแจ่มใส อุณหภูมิประมาณ 32°C มีเมฆบางส่วน ช่วงบ่ายอาจมีโอกาสฝนตกเล็กน้อย 20% อย่าลืมพกร่มติดตัวนะคะ!',
    notes: 'ตอบกระชับ ให้ข้อมูลครบและเตือนอย่างอบอุ่น'
  },
  {
    id: 'ex_2',
    user_query: 'ช่วยเปิดเพลงให้ฟังหน่อย',
    expected_response: 'ได้เลยค่ะ กำลังเปิดเพลงแนว Lo-fi ผ่อนคลายสำหรับการทำงานให้นะคะ มีอะไรให้น้องโบช่วยเพิ่มบอกได้เสมอค่ะ',
    notes: 'ตอบรับคำสั่งควบคุมมีเดียทันที'
  }
];

const DEFAULT_REMINDERS: ReminderItem[] = [
  { id: 'rem_1', title: 'ประชุมวางแผนโครงการ Bo AI สัปดาห์นี้', time: '14:00 น.', completed: false },
  { id: 'rem_2', title: 'พักสายตาและดื่มน้ำ 1 แก้ว', time: '16:00 น.', completed: true },
];

export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {
    this.initDefaults();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initDefaults() {
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!rawSettings) {
      this.saveSettings(DEFAULT_SETTINGS);
    } else {
      try {
        const parsed = JSON.parse(rawSettings);
        parsed.gemini_api_key = DEFAULT_SETTINGS.gemini_api_key;
        if (!parsed.gemini_model || parsed.gemini_model === 'gemini-3.6-flash') {
          parsed.gemini_model = 'gemini-flash-lite-latest';
        }
        parsed.llm_provider = 'gemini';
        parsed.wake_word = 'โบ้';
        parsed.tts_engine = 'natural_female';
        parsed.alternate_names = Array.from(new Set([
          ...(parsed.alternate_names || []),
          'ไอ้โบ้', 'ไอโบ้', 'น้องโบ', 'โบ', 'บักโบ้', 'Bo AI'
        ]));
        this.saveSettings(parsed);
      } catch (_) {}
    }
    const rawPers = localStorage.getItem(STORAGE_KEYS.PERSONALITY);
    if (!rawPers || rawPers.includes('Desktop') || rawPers.includes('หางเสียง')) {
      this.savePersonality(DEFAULT_PERSONALITY);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEMORIES)) {
      this.saveMemories(DEFAULT_MEMORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.KNOWLEDGE)) {
      this.saveKnowledge(DEFAULT_KNOWLEDGE);
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXAMPLES)) {
      this.saveExamples(DEFAULT_EXAMPLES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.REMINDERS)) {
      this.saveReminders(DEFAULT_REMINDERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)) {
      const initialConv: Conversation = {
        id: 'conv_default',
        title: 'เริ่มต้นพูดคุยกับโบ้',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.saveConversations([initialConv]);
      const initialMsgs: ChatMessage[] = [
        {
          id: 'msg_welcome',
          conversation_id: 'conv_default',
          role: 'assistant',
          content: 'สวัสดีแก! โบ้พร้อมคุยแล้วนะ เรียก "โบ้" หรือ "ไอ้โบ้" แล้วถามมาได้เลย เดี๋ยวตอบให้ทันที!',
          created_at: new Date().toISOString(),
        }
      ];
      this.saveMessages(initialMsgs);
    }
  }

  // Settings
  public getSettings(): AppSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.gemini_model || parsed.gemini_model === 'gemini-3.6-flash') {
        parsed.gemini_model = 'gemini-flash-lite-latest';
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Personality
  public getPersonality(): PersonalityConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.PERSONALITY);
    return raw ? { ...DEFAULT_PERSONALITY, ...JSON.parse(raw) } : DEFAULT_PERSONALITY;
  }

  public savePersonality(personality: PersonalityConfig): void {
    localStorage.setItem(STORAGE_KEYS.PERSONALITY, JSON.stringify(personality));
  }

  // Memories
  public getMemories(): MemoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMORIES);
    return raw ? JSON.parse(raw) : [];
  }

  public saveMemories(memories: MemoryItem[]): void {
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
  }

  public addMemory(content: string, category: MemoryItem['category'] = 'other', importance = 3): MemoryItem {
    const memories = this.getMemories();
    const newMem: MemoryItem = {
      id: 'mem_' + Date.now(),
      content,
      category,
      importance,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memories.unshift(newMem);
    this.saveMemories(memories);
    return newMem;
  }

  public deleteMemory(id: string): void {
    const memories = this.getMemories().filter(m => m.id !== id);
    this.saveMemories(memories);
  }

  public updateMemory(updated: MemoryItem): void {
    const memories = this.getMemories().map(m => m.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : m);
    this.saveMemories(memories);
  }

  // Knowledge Items
  public getKnowledge(): KnowledgeItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE);
    return raw ? JSON.parse(raw) : [];
  }

  public saveKnowledge(items: KnowledgeItem[]): void {
    localStorage.setItem(STORAGE_KEYS.KNOWLEDGE, JSON.stringify(items));
  }

  public addKnowledge(title: string, content: string, source: 'manual' | 'file' = 'manual', fileName?: string): KnowledgeItem {
    const items = this.getKnowledge();
    const newItem: KnowledgeItem = {
      id: 'kn_' + Date.now(),
      title,
      content,
      source,
      file_name: fileName,
      created_at: new Date().toISOString(),
    };
    items.unshift(newItem);
    this.saveKnowledge(items);
    return newItem;
  }

  public deleteKnowledge(id: string): void {
    const items = this.getKnowledge().filter(k => k.id !== id);
    this.saveKnowledge(items);
  }

  // Examples Training
  public getExamples(): ExampleTrainingItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAMPLES);
    return raw ? JSON.parse(raw) : [];
  }

  public saveExamples(items: ExampleTrainingItem[]): void {
    localStorage.setItem(STORAGE_KEYS.EXAMPLES, JSON.stringify(items));
  }

  public addExample(user_query: string, expected_response: string, notes?: string): ExampleTrainingItem {
    const items = this.getExamples();
    const newItem: ExampleTrainingItem = {
      id: 'ex_' + Date.now(),
      user_query,
      expected_response,
      notes,
    };
    items.unshift(newItem);
    this.saveExamples(items);
    return newItem;
  }

  public deleteExample(id: string): void {
    const items = this.getExamples().filter(e => e.id !== id);
    this.saveExamples(items);
  }

  // Reminders
  public getReminders(): ReminderItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveReminders(items: ReminderItem[]): void {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(items));
  }

  public addReminder(title: string, time: string): ReminderItem {
    const items = this.getReminders();
    const newItem: ReminderItem = {
      id: 'rem_' + Date.now(),
      title,
      time,
      completed: false,
    };
    items.unshift(newItem);
    this.saveReminders(items);
    return newItem;
  }

  public toggleReminder(id: string): void {
    const items = this.getReminders().map(r => r.id === id ? { ...r, completed: !r.completed } : r);
    this.saveReminders(items);
  }

  public deleteReminder(id: string): void {
    const items = this.getReminders().filter(r => r.id !== id);
    this.saveReminders(items);
  }

  // Conversations & Messages
  public getConversations(): Conversation[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return raw ? JSON.parse(raw) : [];
  }

  public saveConversations(convs: Conversation[]): void {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs));
  }

  public getMessages(conversationId?: string): ChatMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    const msgs: ChatMessage[] = raw ? JSON.parse(raw) : [];
    if (conversationId) {
      return msgs.filter(m => m.conversation_id === conversationId);
    }
    return msgs;
  }

  public saveMessages(msgs: ChatMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(msgs));
  }

  public addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string): ChatMessage {
    const msgs = this.getMessages();
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      conversation_id: conversationId,
      role,
      content,
      created_at: new Date().toISOString(),
    };
    msgs.push(newMsg);
    this.saveMessages(msgs);
    return newMsg;
  }

  public clearMessages(conversationId?: string): void {
    if (conversationId) {
      const msgs = this.getMessages().filter(m => m.conversation_id !== conversationId);
      this.saveMessages(msgs);
    } else {
      this.saveMessages([]);
    }
  }

  // Backup & Export (as per user's decision for Cloud backup readiness)
  public exportAllData(): string {
    const bundle = {
      exported_at: new Date().toISOString(),
      app_version: '1.0.0',
      settings: this.getSettings(),
      personality: this.getPersonality(),
      memories: this.getMemories(),
      knowledge: this.getKnowledge(),
      examples: this.getExamples(),
      reminders: this.getReminders(),
      conversations: this.getConversations(),
      messages: this.getMessages(),
    };
    return JSON.stringify(bundle, null, 2);
  }

  public importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.settings) this.saveSettings(data.settings);
      if (data.personality) this.savePersonality(data.personality);
      if (data.memories) this.saveMemories(data.memories);
      if (data.knowledge) this.saveKnowledge(data.knowledge);
      if (data.examples) this.saveExamples(data.examples);
      if (data.reminders) this.saveReminders(data.reminders);
      if (data.conversations) this.saveConversations(data.conversations);
      if (data.messages) this.saveMessages(data.messages);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

export const db = DatabaseService.getInstance();
