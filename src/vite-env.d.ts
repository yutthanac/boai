/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_MODEL?: string;
  readonly VITE_CLAUDE_API_KEY?: string;
  readonly VITE_CLAUDE_MODEL?: string;
  readonly VITE_OPEN_METEO_BASE_URL?: string;
  readonly VITE_OPEN_METEO_GEO_URL?: string;
  readonly VITE_DEFAULT_CITY?: string;
  readonly VITE_DEFAULT_LATITUDE?: string;
  readonly VITE_DEFAULT_LONGITUDE?: string;
  readonly VITE_WEATHER_TIMEZONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
