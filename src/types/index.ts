export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type LLMProvider = 'claude' | 'openai' | 'gemini';

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

export interface PersonalityConfig {
  name: string;
  system_prompt: string;
  speaking_style: string;
  formality_level: number; // 1 to 5
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
}

export interface MemoryItem {
  id: string;
  content: string;
  category: 'preference' | 'personal' | 'work' | 'routine' | 'other';
  importance: number; // 1 to 5
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens?: number;
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
  input_device_id: string;
  output_device_id: string;
  auto_start: boolean;
  privacy_mode: boolean;
  tts_rate: number;
  tts_pitch: number;
  tts_voice: string;
  vad_timeout_ms: number;
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
