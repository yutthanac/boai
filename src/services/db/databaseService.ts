import {
  AppSettings,
  ChatMessage,
  Conversation,
  ExampleTrainingItem,
  KnowledgeItem,
  MemoryItem,
  MemoryCategory,
  MemoryAuditLog,
  TrainingDataset,
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
  AUDIT_LOGS: 'boai_memory_audit_logs',
};

const DEFAULT_SETTINGS: AppSettings = {
  wake_word: 'โบ้',
  alternate_names: ['ไอ้โบ้', 'ไอโบ้', 'น้องโบ', 'โบ', 'บักโบ้', 'ไอ้โบว์', 'ไอโบว์', 'น้องโบว์', 'โบว์', 'Bo AI', 'โบไอ', 'Hey Bo'],
  sensitivity: 75,
  always_listening: true,
  llm_provider: 'gemini',
  claude_api_key: import.meta.env.VITE_CLAUDE_API_KEY || '',
  openai_api_key: import.meta.env.VITE_OPENAI_API_KEY || '',
  gemini_api_key: import.meta.env.VITE_GEMINI_API_KEY || '',
  claude_model: import.meta.env.VITE_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  openai_model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o',
  gemini_model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest',
  grok_api_key: import.meta.env.VITE_GROK_API_KEY || '',
  grok_model: import.meta.env.VITE_GROK_MODEL || 'grok-2-latest',
  meta_api_key: import.meta.env.VITE_META_API_KEY || import.meta.env.VITE_GROQ_API_KEY || '',
  meta_model: import.meta.env.VITE_META_MODEL || 'openai/gpt-oss-120b',
  meta_provider: 'groq',
  input_device_id: 'default',
  output_device_id: 'default',
  auto_start: true,
  privacy_mode: true,
  tts_rate: 1.20,
  tts_pitch: 1.0,
  tts_voice: 'th-TH',
  tts_engine: 'natural_female',
  openai_tts_voice: 'nova',
  openai_tts_model: 'tts-1-hd',
  vad_timeout_ms: 3000,
  mini_mode_hotkey: 'Alt+Space',
  theme: 'dark',
};

const DEFAULT_PERSONALITY: PersonalityConfig = {
  name: 'โบ้',
  system_prompt: `คุณคือ "โบ้" ผู้ช่วย AI ประจำ Desktop ตอบตรงประเด็น สั้น กระชับ ได้ใจความทันที ไม่เกริ่นยืดยาว สุภาพ เป็นมิตร ลงท้าย "ค่ะ / นะคะ" ไม่พูดคำว่า "แก" และไม่พูดถึงชื่อโมเดลหรือระบบ AI ใดๆ`,
  speaking_style: 'สุภาพ กระชับ ตรงประเด็น เป็นมิตร ลงท้าย ค่ะ/นะคะ',
  formality_level: 2,
  tuning: {
    wittiness: 50,
    friendliness: 85,
    formality: 40,
    conciseness: 90,
  },
};

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem_1',
    content: 'ชอบการพูดคุยที่เป็นกันเอง สนุกสนาน จริงใจ สบายๆ เหมือนเพื่อนแท้ที่เข้าใจกัน',
    category: 'preference',
    importance: 5,
    confidence: 98,
    verified: true,
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
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
  },
  {
    id: 'kn_music_control',
    title: 'กฎการควบคุมเครื่องเล่นเพลงและระดับเสียง (Music & Volume Rules)',
    content: 'การควบคุมเพลงของโบ้:\n1. "ปิด" / "ปิดเพลง" / "ปิดไปเลย" -> ปิดเพลงทันที นำแถบเพลงออก สแตนด์บายรอรับคำสั่งใหม่\n2. "พอส" / "pause" / "หยุด" -> พักเพลงชั่วคราว คงแถบเพลงไว้\n3. "เปิด" / "บอกเปิด" / "เล่นต่อ" / "เปิดต่อ" / "resume" -> สั่งเปิดเพลง เล่นเพลงต่อ หรือเริ่มเล่นจากคิวลิสต์ทันที\n4. "เพลงต่อไป" / "เพลงถัดไป" / "เปลี่ยนเพลง" -> สลับเล่นเพลงถัดไปในคิว Playlist\n5. "ลดเสียง" / "เบาเสียง" -> ปรับลดระดับเสียงลงทีละ 10%\n6. "ลดมาก" / "ลดเยอะๆ" -> ปรับระดับเสียงลงเหลือ 20% ของหลอดเสียงทันที (ไม่ได้ลดทีละ 20% แต่ตั้งค่าเป็น 20% พอดี)\n7. "ลดต่ำ" -> ปรับระดับเสียงลงเหลือ 10% ของหลอดเสียง\n8. "ปิดเสียง" (Mute) / "เปิดเสียง" (Unmute)\n9. "remote เปิด" / "เปิดในเครื่อง" / "เปิดบนคอม" -> โบ้ Remote สั่งระบบ Windows เปิดหน้าต่างเพลงบนเบราว์เซอร์หลักของเครื่องผู้ใช้โดยตรง',
    source: 'manual',
    created_at: new Date().toISOString(),
  }
];

const DEFAULT_EXAMPLES: ExampleTrainingItem[] = [
  {
    id: 'ex_1',
    user_query: 'น้องโบ วันนี้อากาศที่กรุงเทพเป็นยังไงบ้าง?',
    expected_response: 'วันนี้ที่กรุงเทพฯ ท้องฟ้าแจ่มใส อุณหภูมิประมาณ 32°C มีโอกาสฝนตกเล็กน้อย 20% ค่ะ',
    notes: 'ตอบกระชับ ให้ข้อมูลครบตรงประเด็น',
    rating: 5,
    category: 'weather',
  },
  {
    id: 'ex_2',
    user_query: 'ช่วยเปิดเพลงให้ฟังหน่อย',
    expected_response: 'เปิดเพลงให้เรียบร้อยแล้วค่ะ 🎵🎧',
    notes: 'ตอบรับคำสั่งเปิดเพลงทันที สั้นกระชับ',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_open_short',
    user_query: 'เปิด',
    expected_response: 'เปิดเพลงต่อให้แล้วนะคะ 🎵▶️',
    notes: 'บอกเปิดคือสั่งเปิดเพลงทันที',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_open_tell',
    user_query: 'บอกเปิด',
    expected_response: 'เปิดเพลงต่อให้แล้วนะคะ 🎵▶️',
    notes: 'สั่งบอกเปิด คือเริ่มเล่นเพลงทันที',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_remote',
    user_query: 'ให้โบ้ remote เปิดในเครื่องเราได้ไหม',
    expected_response: 'เปิดเพลงบนเบราว์เซอร์ในเครื่องให้เรียบร้อยแล้วค่ะ 🖥️🎵',
    notes: 'Remote สั่งเปิดเบราว์เซอร์บนเครื่อง Windows ของผู้ใช้',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_remote_command',
    user_query: 'remote เปิดในเครื่อง',
    expected_response: 'เปิดเพลงบนเบราว์เซอร์ในเครื่องให้เรียบร้อยแล้วค่ะ 🖥️🎵',
    notes: 'สั่ง Remote เปิดเพลงบนเครื่อง',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_stop',
    user_query: 'ปิดเพลง',
    expected_response: 'ปิดเพลงให้เรียบร้อยแล้วค่ะ ⏹️',
    notes: 'ปิดเพลง ปิดแถบเพลงทันที',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_stop_short',
    user_query: 'ปิด',
    expected_response: 'ปิดเพลงให้เรียบร้อยแล้วค่ะ ⏹️',
    notes: 'บอกปิดคือปิดเพลงทันที',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_pause',
    user_query: 'พอส',
    expected_response: 'พักเพลงไว้ชั่วคราวแล้วนะคะ ⏸️',
    notes: 'พอส คือพอส หยุดชั่วคราว',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_resume',
    user_query: 'เล่นต่อ',
    expected_response: 'เปิดเพลงต่อให้แล้วนะคะ 🎵▶️',
    notes: 'เล่นต่อ คือเล่นต่อ เล่นเพลงเดิมต่อ',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_next',
    user_query: 'เพลงต่อไป',
    expected_response: 'เปลี่ยนเป็นเพลงถัดไปให้แล้วค่ะ ⏭️🎵',
    notes: 'เลือกเพลงต่อไปมาเล่นในลิสต์คิว',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_vol_down',
    user_query: 'ลดเสียง',
    expected_response: 'เบาเสียงเพลงลงแล้วค่ะ 🔉',
    notes: 'ลดเสียงลงทีละ 10%',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_vol_much',
    user_query: 'ลดมาก',
    expected_response: 'ปรับลดเสียงลงเหลือ 20% ของหลอดเสียงให้แล้วนะคะ 🔉',
    notes: 'ลดมาก คือลดลงเหลือ 20% ของหลอดเสียงทันที',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_vol_low',
    user_query: 'ลดต่ำ',
    expected_response: 'ปรับลดเสียงต่ำลงแล้วค่ะ 🔈',
    notes: 'ลดต่ำ คือลดลงเหลือ 10% ของหลอดเสียง',
    rating: 5,
    category: 'music',
  },
  {
    id: 'ex_music_mute',
    user_query: 'ปิดเสียง',
    expected_response: 'ปิดเสียงเพลงแล้วค่ะ (Muted) 🔇',
    notes: 'ปิดเสียง (Mute)',
    rating: 5,
    category: 'music',
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
        if (!parsed.llm_provider) {
          parsed.llm_provider = 'gemini';
        }
        if (!parsed.meta_model || parsed.meta_model === 'llama-3.3-70b-versatile') {
          parsed.meta_model = 'openai/gpt-oss-120b';
        }
        if (!parsed.meta_api_key && DEFAULT_SETTINGS.meta_api_key) {
          parsed.meta_api_key = DEFAULT_SETTINGS.meta_api_key;
        }
        parsed.wake_word = 'โบ้';
        parsed.tts_engine = 'natural_female';
        if (!parsed.tts_rate || parsed.tts_rate <= 1.05) {
          parsed.tts_rate = 1.20;
        }
        parsed.alternate_names = Array.from(new Set([
          ...(parsed.alternate_names || []),
          'ไอ้โบ้', 'ไอโบ้', 'น้องโบ', 'โบ', 'บักโบ้', 'ไอ้โบว์', 'ไอโบว์', 'น้องโบว์', 'โบว์', 'Bo AI'
        ]));
        this.saveSettings(parsed);
      } catch (_) {}
    }
    const rawPers = localStorage.getItem(STORAGE_KEYS.PERSONALITY);
    if (!rawPers || rawPers.includes('เพื่อนสนิทคู่หู') || rawPers.includes('แก') || rawPers.includes('หางเสียง')) {
      this.savePersonality(DEFAULT_PERSONALITY);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEMORIES)) {
      this.saveMemories(DEFAULT_MEMORIES);
    } else {
      const existingMems = this.getMemories(true);
      const cleaned = existingMems.filter(
        m => !m.content.includes('กาแฟ') && !m.content.includes('เขียนโค้ด') && !m.content.includes('ดริป')
      );
      if (cleaned.length !== existingMems.length) {
        this.saveMemories(cleaned.length > 0 ? cleaned : DEFAULT_MEMORIES);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.KNOWLEDGE)) {
      this.saveKnowledge(DEFAULT_KNOWLEDGE);
    } else {
      const currentKn = this.getKnowledge();
      const currentIds = new Set(currentKn.map(k => k.id));
      const missingKn = DEFAULT_KNOWLEDGE.filter(k => !currentIds.has(k.id));
      if (missingKn.length > 0) {
        this.saveKnowledge([...currentKn, ...missingKn]);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXAMPLES)) {
      this.saveExamples(DEFAULT_EXAMPLES);
    } else {
      const currentEx = this.getExamples();
      const defaultMap = new Map(DEFAULT_EXAMPLES.map(e => [e.id, e]));
      let hasUpdates = false;
      const updatedEx = currentEx.map(ex => {
        const def = defaultMap.get(ex.id);
        if (def && (ex.expected_response.includes('แก') || ex.expected_response.includes('ชิลๆ'))) {
          hasUpdates = true;
          return { ...ex, expected_response: def.expected_response, notes: def.notes };
        }
        return ex;
      });
      const currentIds = new Set(updatedEx.map(e => e.id));
      const missingEx = DEFAULT_EXAMPLES.filter(e => !currentIds.has(e.id));
      if (hasUpdates || missingEx.length > 0) {
        this.saveExamples([...updatedEx, ...missingEx]);
      }
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
          content: 'สวัสดีค่ะ โบ้พร้อมรับคำสั่งแล้วนะคะ เรียก "โบ้" แล้วสั่งการหรือพูดคุยได้เลยค่ะ',
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
  public getMemories(includeArchived = false): MemoryItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMORIES);
    const list: MemoryItem[] = raw ? JSON.parse(raw) : [];
    if (!includeArchived) {
      return list.filter(m => m.status !== 'archived');
    }
    return list;
  }

  public saveMemories(memories: MemoryItem[]): void {
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
  }

  public addMemory(
    content: string,
    category: MemoryCategory = 'other',
    importance = 3,
    confidence = 85,
    verified = false,
    expires_at?: string
  ): MemoryItem {
    const memories = this.getMemories(true);
    const newMem: MemoryItem = {
      id: 'mem_' + Date.now(),
      content: content.trim(),
      category,
      importance,
      confidence,
      verified,
      status: 'active',
      expires_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memories.unshift(newMem);
    this.saveMemories(memories);
    this.logMemoryAudit('created', `เพิ่มความจำใหม่: "${content.slice(0, 40)}..."`, newMem.id);
    return newMem;
  }

  public deleteMemory(id: string): void {
    const memories = this.getMemories(true);
    const target = memories.find(m => m.id === id);
    const filtered = memories.filter(m => m.id !== id);
    this.saveMemories(filtered);
    if (target) {
      this.logMemoryAudit('deleted', `ลบความจำ: "${target.content.slice(0, 40)}..."`, id);
    }
  }

  public purgeMemory(id: string): void {
    this.deleteMemory(id);
  }

  public updateMemory(updated: MemoryItem): void {
    const memories = this.getMemories(true).map(m =>
      m.id === updated.id ? { ...updated, updated_at: new Date().toISOString() } : m
    );
    this.saveMemories(memories);
    this.logMemoryAudit('updated', `อัปเดตข้อมูลความจำ: "${updated.content.slice(0, 40)}..."`, updated.id);
  }

  public verifyMemory(id: string): void {
    const memories = this.getMemories(true).map(m => {
      if (m.id === id) {
        return { ...m, verified: true, confidence: 100, updated_at: new Date().toISOString() };
      }
      return m;
    });
    this.saveMemories(memories);
    this.logMemoryAudit('verified', `ยืนยันความถูกต้องของความจำ ID: ${id}`, id);
  }

  public archiveMemory(id: string): void {
    const memories = this.getMemories(true).map(m => {
      if (m.id === id) {
        return { ...m, status: 'archived' as const, updated_at: new Date().toISOString() };
      }
      return m;
    });
    this.saveMemories(memories);
    this.logMemoryAudit('archived', `ย้ายความจำ ID: ${id} ไปที่คลังเก่า (Archived)`, id);
  }

  public pruneExpiredMemories(): { prunedCount: number } {
    const memories = this.getMemories(true);
    const now = new Date().getTime();
    let count = 0;
    const updated = memories.map(m => {
      if (m.expires_at && new Date(m.expires_at).getTime() < now && m.status !== 'archived') {
        count++;
        this.logMemoryAudit('pruned', `ล้างความจำที่หมดอายุอัตโนมัติ: "${m.content.slice(0, 30)}..."`, m.id);
        return { ...m, status: 'archived' as const };
      }
      return m;
    });
    if (count > 0) {
      this.saveMemories(updated);
    }
    return { prunedCount: count };
  }

  // Detect memory conflicts (e.g. coffee vs tea, awake time, dark vs light theme)
  public detectMemoryConflict(newFact: string): { conflict: boolean; conflictingMemory?: MemoryItem; reason?: string } {
    const activeMemories = this.getMemories(false);
    const lower = newFact.toLowerCase();

    // Heuristics for common Thai preference conflicts
    const conflictPairs: Array<{ keywords: string[]; topic: string }> = [
      { keywords: ['กาแฟ', 'ชา', 'มัทฉะ', 'โกโก้', 'ไม่ดื่มกาแฟ', 'เลิกดื่มกาแฟ'], topic: 'เครื่องดื่ม' },
      { keywords: ['dark theme', 'light theme', 'ธีมมืด', 'ธีมสว่าง'], topic: 'ธีมหน้าจอ' },
      { keywords: ['นอนดึก', 'นอนเร็ว', 'ตื่นเช้า', 'ตื่นสาย'], topic: 'เวลานอน/ตื่น' },
      { keywords: ['อาหารเจ', 'กินเจ', 'มังสวิรัติ', 'กินเนื้อ', 'ไม่กินเนื้อ'], topic: 'การกิน' },
      { keywords: ['ออกกำลังกาย', 'ไม่ออกกำลังกาย', 'วิ่ง', 'เข้ายิม'], topic: 'กิจกรรมสุขภาพ' },
    ];

    for (const pair of conflictPairs) {
      const matchInNew = pair.keywords.some(k => lower.includes(k));
      if (matchInNew) {
        const found = activeMemories.find(m =>
          pair.keywords.some(k => m.content.toLowerCase().includes(k)) &&
          m.content.trim() !== newFact.trim()
        );
        if (found) {
          return {
            conflict: true,
            conflictingMemory: found,
            reason: `ตรวจพบข้อมูลเกี่ยวกับ "${pair.topic}" ซึ่งขัดแย้งกับความจำเดิม`,
          };
        }
      }
    }

    return { conflict: false };
  }

  // Audit Logs
  public getMemoryAuditLogs(): MemoryAuditLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  }

  public logMemoryAudit(action: MemoryAuditLog['action'], description: string, memoryId?: string): void {
    const logs = this.getMemoryAuditLogs();
    const newLog: MemoryAuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      memory_id: memoryId,
      action,
      description,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep max 200 logs
    if (logs.length > 200) logs.pop();
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
  }

  public clearMemoryAuditLogs(): void {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
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

  public addExample(user_query: string, expected_response: string, notes?: string, category = 'general'): ExampleTrainingItem {
    const items = this.getExamples();
    const newItem: ExampleTrainingItem = {
      id: 'ex_' + Date.now(),
      user_query,
      expected_response,
      notes,
      rating: 5,
      category,
    };
    items.unshift(newItem);
    this.saveExamples(items);
    return newItem;
  }

  public updateExampleRating(id: string, delta: number): void {
    const items = this.getExamples().map(e => {
      if (e.id === id) {
        const current = e.rating ?? 5;
        const next = Math.max(1, Math.min(10, current + delta));
        return { ...e, rating: next };
      }
      return e;
    });
    this.saveExamples(items);
  }

  public deleteExample(id: string): void {
    const items = this.getExamples().filter(e => e.id !== id);
    this.saveExamples(items);
  }

  // Export / Import Training Dataset (Roadmap 1)
  public exportTrainingDataset(): string {
    const dataset: TrainingDataset = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      personality: this.getPersonality(),
      examples: this.getExamples(),
      knowledge: this.getKnowledge(),
    };
    return JSON.stringify(dataset, null, 2);
  }

  public importTrainingDataset(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.personality) this.savePersonality(data.personality);
      if (Array.isArray(data.examples)) this.saveExamples(data.examples);
      if (Array.isArray(data.knowledge)) this.saveKnowledge(data.knowledge);
      return true;
    } catch (e) {
      console.error('Failed to import training dataset:', e);
      return false;
    }
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

  public addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    training_source?: 'few_shot' | 'knowledge',
    training_label?: string
  ): ChatMessage {
    const msgs = this.getMessages();
    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      conversation_id: conversationId,
      role,
      content,
      training_source,
      training_label,
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
