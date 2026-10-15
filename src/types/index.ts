export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type LLMProvider = 'gemini' | 'grok' | 'meta' | 'openai' | 'claude';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface StyleTuning {
  wittiness: number; // 0-100 (ความกวน/มุก)
  friendliness: number; // 0-100 (ความเป็นกันเอง)
  formality: number; // 0-100 (ความสุภาพ)
  conciseness: number; // 0-100 (ความกระชับ)
}

export interface PersonalityConfig {
  name: string;
  system_prompt: string;
  speaking_style: string;
  formality_level: number; // 1 to 5
  tuning?: StyleTuning;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  source: 'manual' | 'file';
  file_name?: string;
  created_at: string;
}

export interface ExampleTrainingItem {
  id: string;
  user_query: string;
  expected_response: string;
  notes?: string;
  rating?: number; // Upvotes / score: e.g. 1 to 5 or net thumbs up
  category?: string;
}

export interface TrainingDataset {
  version: string;
  exported_at: string;
  personality: PersonalityConfig;
  examples: ExampleTrainingItem[];
  knowledge: KnowledgeItem[];
}

export type MemoryCategory = 'preference' | 'personal' | 'work' | 'routine' | 'health' | 'food' | 'other';

export interface MemoryItem {
  id: string;
  content: string;
  category: MemoryCategory;
  importance: number; // 1 to 5
  confidence: number; // 0 to 100
  verified: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string; // Optional expiration ISO string
  status?: 'active' | 'archived';
}

export interface MemoryAuditLog {
  id: string;
  memory_id?: string;
  action: 'created' | 'updated' | 'verified' | 'conflicted' | 'pruned' | 'archived' | 'deleted';
  description: string;
  timestamp: string;
}

export interface MemoryPendingAction {
  id: string;
  type: 'new_fact' | 'conflict';
  fact: string;
  category: MemoryCategory;
  confidence: number;
  existing_memory_id?: string;
  existing_content?: string;
}

export interface MusicTrackState {
  title: string;
  artist?: string;
  isPlaying: boolean;
  url?: string;
  videoId?: string;
  embedUrl?: string;
  audioStreamUrl?: string;
  playbackMode?: 'stream' | 'youtube';
  source: 'youtube_music' | 'direct_stream';
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  title: string;
  artist?: string;
  videoId?: string;
  audioStreamUrl?: string;
  playbackMode: 'stream' | 'youtube';
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens?: number;
  pending_memory?: MemoryPendingAction;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  wake_word: string;
  alternate_names: string[];
  sensitivity: number; // 0-100
  always_listening: boolean;
  llm_provider: LLMProvider;
  claude_api_key: string;
  openai_api_key: string;
  gemini_api_key: string;
  claude_model: string;
  openai_model: string;
  gemini_model: string;
  grok_api_key?: string;
  grok_model?: string;
  meta_api_key?: string;
  meta_model?: string;
  meta_provider?: 'groq' | 'openrouter';
  input_device_id: string;
  output_device_id: string;
  auto_start: boolean;
  privacy_mode: boolean;
  tts_rate: number;
  tts_pitch: number;
  tts_voice: string;
  tts_engine: 'natural_female' | 'openai' | 'grok' | 'browser';
  openai_tts_voice: 'nova' | 'shimmer' | 'alloy' | 'echo' | 'fable' | 'onyx';
  openai_tts_model: 'tts-1' | 'tts-1-hd';
  grok_tts_voice?: 'leo' | 'rex' | 'ara' | 'eve' | 'sal';
  vad_timeout_ms: number;
  mini_mode_hotkey?: string;
  theme?: 'dark' | 'light';
}

export interface ProviderQuotaInfo {
  provider: LLMProvider;
  remainingRequests?: number;
  limitRequests?: number;
  remainingTokens?: number;
  limitTokens?: number;
  resetTime?: string;
  status: 'ok' | 'near_limit' | 'exhausted';
  lastUpdated: string;
  message?: string;
}

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  requires_confirmation: boolean;
  status: 'ready' | 'active' | 'disabled';
}

export interface ReminderItem {
  id: string;
  title: string;
  time: string;
  completed: boolean;
}

