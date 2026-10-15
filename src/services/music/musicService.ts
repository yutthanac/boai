export interface SongRequest {
  query: string;
  url: string;
  videoId?: string;
  embedUrl: string;
  audioStreamUrl?: string;
  playbackMode: 'stream' | 'youtube';
}

// Curated live streaming stations for instant, ad-free, 100% audible playback
const CURATED_AUDIO_STREAMS: Record<string, { title: string; url: string }> = {
  lofi: {
    title: 'Lofi Chill Beats 24/7 (Relax / Study)',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
  },
  chill: {
    title: 'Chillout Lounge & Ambient Vibes',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
  },
  acoustic: {
    title: 'Acoustic Guitar & Coffeehouse Cafe',
    url: 'https://stream.zeno.fm/ynupfk4wzq8uv',
  },
  retro: {
    title: 'Retro Chill & Synth Grooves',
    url: 'https://ice1.somafm.com/secretagent-128-mp3',
  },
};

export class MusicService {
  private static instance: MusicService;

  private constructor() {}

  public static getInstance(): MusicService {
    if (!MusicService.instance) {
      MusicService.instance = new MusicService();
    }
    return MusicService.instance;
  }

  // Extract song, artist, or genre from user voice/text prompt
  public extractSongQuery(text: string): string {
    let clean = text.trim();

    // Strip common Thai and English conversational prefix/suffix phrases
    const phrasesToRemove = [
      /play\s+(?:the\s+)?song/gi,
      /play\s+(?:the\s+)?music/gi,
      /play\s+(?:me\s+)?/gi,
      /in\s+youtube\s+music/gi,
      /on\s+youtube\s+music/gi,
      /from\s+youtube\s+music/gi,
      /youtube\s+music/gi,
      /song/gi,
      /music/gi,
      /ขอเปลี่ยนเพลงเป็น/gi,
      /ขอเปลี่ยนเพลง/gi,
      /ขอเปลี่ยนเป็น/gi,
      /เปลี่ยนเพลงเป็น/gi,
      /เปลี่ยนเพลง/gi,
      /เปลี่ยนเป็น/gi,
      /ช่วยเปิดเพลง/gi,
      /ช่วยเปิด/gi,
      /เปิดเพลง/gi,
      /เล่นเพลง/gi,
      /ฟังเพลง/gi,
      /ขอเพลง/gi,
      /หาเพลง/gi,
      /ใน\s*youtube\s*music/gi,
      /บน\s*youtube\s*music/gi,
      /ใน\s*ยูทูปมิวสิค/gi,
      /บน\s*ยูทูปมิวสิค/gi,
      /ใน\s*ยูทูป/gi,
      /บน\s*ยูทูป/gi,
      /ยูทูปมิวสิค/gi,
      /ยูทูป/gi,
      /ให้ฟังหน่อย/gi,
      /ให้ฟังที/gi,
      /ให้หน่อยนะ/gi,
      /ให้หน่อย/gi,
      /หน่อยนะ/gi,
      /หน่อยสิ/gi,
      /หน่อย/gi,
      /ทีครับ/gi,
      /ทีค่ะ/gi,
      /ทีดิ/gi,
      /ทีแก/gi,
      /ที/gi,
      /remote\s*เปิดในเครื่องเรา/gi,
      /remote\s*เปิดในเครื่อง/gi,
      /remote\s*เปิด/gi,
      /รีโมท\s*เปิดในเครื่อง/gi,
      /รีโมท\s*เปิด/gi,
      /remote/gi,
      /รีโมท/gi,
      /ในเครื่องเรา/gi,
      /ในเครื่อง/gi,
      /บนเครื่อง/gi,
      /ในคอม/gi,
      /บนคอม/gi,
      /บนเบราว์เซอร์/gi,
      /ในเบราว์เซอร์/gi,
      /เบราว์เซอร์/gi,
      /บอกเปิด/gi,
      /ช่วยเปิด/gi,
      /เปิดสิ/gi,
      /เปิดเลย/gi,
      /เปิดดิ/gi,
      /ไอ้โบว์/gi,
      /ไอโบว์/gi,
      /น้องโบว์/gi,
      /โบว์/gi,
      /ไอ้โบ้/gi,
      /ไอโบ้/gi,
      /น้องโบ/gi,
      /บักโบ้/gi,
      /ไอ้โบ/gi,
      /ไอโบ/gi,
      /โบไอ/gi,
      /โลไอ/gi,
      /โบ้/gi,
      /bo ai/gi,
      /boai/gi,
    ];

    for (const regex of phrasesToRemove) {
      clean = clean.replace(regex, '').trim();
    }

    clean = clean.replace(/^[-\s,.:;]+|[-\s,.:;]+$/g, '').trim();

    // Fallback if user just said "เปิดเพลง" with no specific title
    if (!clean || clean.length < 2) {
      return 'Lofi Chill Beats';
    }

    return clean;
  }

  // Generate YouTube Music Search & Direct Play URL
  public getYouTubeMusicUrl(query: string): string {
    return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
  }

  // Search real YouTube Video ID for bulletproof embedding
  public async searchVideoId(query: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.searchYouTube) {
        const id = await (window as any).electronAPI.searchYouTube(query);
        if (id) return id;
      }
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return data.videoId || null;
      }
    } catch (e) {
      console.warn('[MusicService] Failed to search videoId:', e);
    }
    return null;
  }

  // Resolve music request for direct audible playback
  public async openMusic(query: string, openExternalTab = false): Promise<SongRequest> {
    const song = this.extractSongQuery(query);
    const lower = song.toLowerCase();
    const externalUrl = this.getYouTubeMusicUrl(song);

    // Check if query matches chill/lofi stream for immediate zero-delay playback
    const isLofiOrChill = (
      lower.includes('lofi') ||
      lower.includes('chill') ||
      lower.includes('สบาย') ||
      lower.includes('เพราะ') ||
      lower.includes('คาเฟ่') ||
      lower === 'lofi chill beats'
    );

    let audioStreamUrl: string | undefined;
    let playbackMode: 'stream' | 'youtube' = 'youtube';
    let videoId: string | undefined;

    if (isLofiOrChill) {
      playbackMode = 'stream';
      if (lower.includes('acoustic') || lower.includes('กีตาร์') || lower.includes('คาเฟ่')) {
        audioStreamUrl = CURATED_AUDIO_STREAMS.acoustic.url;
      } else if (lower.includes('ambient') || lower.includes('lounge')) {
        audioStreamUrl = CURATED_AUDIO_STREAMS.chill.url;
      } else {
        audioStreamUrl = CURATED_AUDIO_STREAMS.lofi.url;
      }
    } else {
      // Resolve real video ID from YouTube
      const foundId = await this.searchVideoId(song);
      if (foundId) {
        videoId = foundId;
      }
    }

    // Embed URL using real Video ID for guaranteed playback
    const embedUrl = videoId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`
      : `https://www.youtube-nocookie.com/embed/rFZHOHl-L8A?autoplay=1&enablejsapi=1`;

    if (openExternalTab) {
      try {
        if ((window as any).electronAPI?.openExternal) {
          (window as any).electronAPI.openExternal(externalUrl);
        } else if (typeof window !== 'undefined') {
          window.open(externalUrl, '_blank', 'noopener,noreferrer');
        }
      } catch (e) {
        console.warn('[MusicService] Failed to open external link:', e);
      }
    }

    return {
      query: song,
      url: externalUrl,
      videoId,
      embedUrl,
      audioStreamUrl,
      playbackMode,
    };
  }

  // Detect user commands to stop, pause, resume, change volume, or skip
  public isMusicControlIntent(text: string): MusicControlIntent | null {
    let raw = text.toLowerCase().trim();

    // Strip leading conversational vocatives / polite prefixes (e.g., "ไอ้โบว์", "โบ้", "น้องโบ", "ช่วยลดเสียงหน่อย")
    raw = raw.replace(/^(?:ไอ้โบว์|ไอโบว์|น้องโบว์|โบว์|ไอ้โบ้|ไอโบ้|น้องโบ|บักโบ้|โบ้|ไอ้โบ|ไอโบ|bo\s*ai|boai|ช่วย|ช่วยหน่อย|รบกวน|กรุณา)\s*[,.:;]?\s*/gi, '').trim();

    // Do NOT capture as local control if user specifically asked for remote PC browser playback
    if (/(?:remote|รีโมท|ในเครื่อง|บนเครื่อง|ในคอม|บนคอม|เบราว์เซอร์)/i.test(raw)) {
      return null;
    }

    // 1. Mute ("ปิดเสียง") - check before stop so "ปิดเสียง" doesn't trigger stop
    if (
      /^(?:(?<![เแ])ปิดเสียง|(?<![เแ])ปิดเสียงเพลง|เงียบเสียง|mute|ปิดลำโพง)$/i.test(raw) ||
      /(?:(?<![เแ])ปิดเสียงเพลง|(?<![เแ])ปิดเสียง|เงียบเสียง|mute|ปิดลำโพง)/i.test(raw)
    ) {
      return 'mute';
    }

    // 2. Stop / Close Music completely ("บอกปิด", "ปิด", "ปิดเพลง", "ปิดไปเลย")
    // CRITICAL: Must use (?<![เแ]) so that "เปิดเพลง" (which has 'เ' before 'ป') is NEVER matched as "ปิดเพลง"!
    if (
      /^(?:บอกปิด|บอกปิดเพลง|(?<![เแ])ปิด|(?<![เแ])ปิดเพลง|(?<![เแ])ปิดเลย|(?<![เแ])ปิดไปเลย|(?<![เแ])ปิดเพลงไปเลย|(?<![เแ])ปิดเพลงเลย|หยุดเพลง|เลิกเปิดเพลง|หยุดเปิดเพลง|หยุดเล่นเพลง|เลิกฟังเพลง)(?:ที|หน่อย|ดิ|นะ|สิ)?$/i.test(raw) ||
      /(?:(?<![เแ])ปิดเพลง|หยุดเพลง|เลิกเปิดเพลง|(?<![เแ])ปิดเพลงไปเลย|(?<![เแ])ปิดเพลงเลย|หยุดเปิดเพลง|(?<![เแ])ปิดไปเลย|หยุดเล่นเพลง|เลิกฟังเพลง)(?:ที|หน่อย|ดิ|นะ|สิ)?/i.test(raw)
    ) {
      return 'stop';
    }

    // 3. Pause / Hold ("พอส คือพอส")
    if (
      /^(?:พอส|พอสเพลง|pause|หยุด|หยุดก่อน|หยุดไว้ก่อน|หยุดแป๊บ|พักเพลง|พักไว้ก่อน|หยุดชั่วคราว)$/i.test(raw) ||
      /(?:พอสเพลง|พอส|pause|หยุดชั่วคราว|หยุดไว้ก่อน|หยุดแป๊บ|พักเพลง|พักไว้ก่อน|หยุดก่อน)/i.test(raw)
    ) {
      return 'pause';
    }

    // 4. Resume / Play Continued ("เล่นต่อ คือเล่นต่อ", "บอกเปิด", "เปิด")
    if (
      /^(?:เปิด|บอกเปิด|เปิดสิ|เปิดเลย|เปิดดิ|เปิดหน่อย|เปิดขึ้นมา|ช่วยเปิด|เล่นต่อ|เปิดต่อ|เล่นเพลงต่อ|เปิดเพลงต่อ|resume|play ต่อ|ฟังต่อ|เล่นต่อสิ|เปิดต่อสิ)$/i.test(raw) ||
      /(?:เล่นต่อ|เปิดต่อ|เล่นเพลงต่อ|เปิดเพลงต่อ|resume|play ต่อ|ฟังต่อ|เล่นเพลงเดิมต่อ|เล่นต่อสิ)/i.test(raw)
    ) {
      return 'resume';
    }

    // 5. Next / Skip Track in List ("เลือกเพลงต่อไปมาเล่นในลิส")
    if (
      /^(?:เพลงต่อไป|เพลงถัดไป|ข้าม|ข้ามเพลง|เปลี่ยนเพลง|ต่อไป|next|next track|next song)$/i.test(raw) ||
      /(?:เพลงต่อไป|เพลงถัดไป|ข้ามเพลง|เปลี่ยนเพลง|next track|next song|เพลงต่อไปในลิส|เพลงต่อไปในลิสต์|สลับเพลงในลิส|เปิดเพลงถัดไป|เลือกเพลงต่อไป|เล่นเพลงต่อไป)/i.test(raw)
    ) {
      return 'next';
    }

    // 6. Volume Substantial Decrease ("ลดมาก" / "ลดเยอะๆ" -> ปรับลดเหลือ 20% ของหลอดเสียงทันที ตามคำสั่งผู้ใช้ ไม่ใช่ลดทีละ 20%)
    if (
      /^(?:ลดมาก|ลดเยอะๆ|ลดเยอะ|เบามาก|เบามากๆ|เบาเยอะๆ|ลดเสียงมาก|ลดเสียงเยอะ|ลดเหลือ\s*20%?)$/i.test(raw) ||
      /(?:ลดเสียงมาก|ลดมาก|ลดเยอะๆ|เบาเสียงมากๆ|เบาลงเยอะๆ|ลดเสียงลงเยอะๆ|ลดเหลือ\s*20|เบาเยอะๆ|ลดเสียงเยอะ)/i.test(raw)
    ) {
      return 'volume_substantial_decrease';
    }

    // 7. Volume Low ("ลดต่ำ" -> ลดลงเหลือ 10% ของหลอดเสียง)
    if (
      /^(?:ลดต่ำ|ลดเสียงต่ำ|เสียงต่ำ|ปรับเสียงต่ำ|เสียงต่ำสุด|เบาสุด)$/i.test(raw) ||
      /(?:ลดต่ำ|ลดเสียงต่ำ|เสียงต่ำสุด|เบาสุด|ลดเสียงเบาสุด|ปรับเสียงต่ำ|เปิดเสียงต่ำ|เสียงเบาสุด)/i.test(raw)
    ) {
      return 'volume_low';
    }

    // 8. Unmute ("เปิดเสียง")
    if (
      /^(?:เปิดเสียง|เปิดเสียงเพลง|unmute|คืนเสียง)$/i.test(raw) ||
      /(?:เปิดเสียงเพลง|เปิดเสียง|unmute|คืนเสียง)/i.test(raw)
    ) {
      return 'unmute';
    }

    // 9. Volume Decrease by 10% ("ลดเสียง" / "เบาเสียง")
    if (
      /^(?:ลดเสียง|เบาเสียง|ลดเสียงลง|เบาลง|หรี่เสียง)$/i.test(raw) ||
      /(?:ลดเสียง|เบาเสียง|ลดเสียงลงหน่อย|เบาลงหน่อย|ลดเสียงที|เบาเสียงที|ลดเสียงหน่อย|หรี่เสียง)/i.test(raw)
    ) {
      return 'volume_decrease';
    }

    // 10. Volume Increase by 10% ("เพิ่มเสียง" / "เร่งเสียง")
    if (
      /^(?:เพิ่มเสียง|เร่งเสียง|ดังขึ้น|ขยายเสียง)$/i.test(raw) ||
      /(?:เพิ่มเสียง|เร่งเสียง|ดังขึ้นหน่อย|เพิ่มเสียงหน่อย|ดังขึ้นที|เร่งเสียงหน่อย|ขยายเสียง|เปิดดังขึ้น)/i.test(raw)
    ) {
      return 'volume_increase';
    }

    return null;
  }

  // Check if text is a new song playback request or remote PC launch
  public isMusicIntent(text: string): boolean {
    let raw = text.toLowerCase().trim();
    raw = raw.replace(/^(?:ไอ้โบ้|ไอโบ้|น้องโบ|บักโบ้|โบ้|bo\s*ai|boai|ช่วย|ช่วยหน่อย|รบกวน|กรุณา)\s*[,.:;]?\s*/gi, '').trim();

    // Check if user explicitly asked to stop, pause, skip, or change volume
    const control = this.isMusicControlIntent(text);
    if (control && control !== 'resume') {
      return false;
    }

    const musicKeywords = [
      'เปิดเพลง', 'เล่นเพลง', 'ฟังเพลง', 'ขอเพลง', 'หาเพลง',
      'youtube music', 'youtubemusic', 'ยูทูปมิวสิค', 'ยูทูบมิวสิค',
      'play music', 'play song', 'lofi',
      'remote เปิด', 'รีโมทเปิด', 'remote', 'รีโมท',
      'เปิดในเครื่อง', 'เปิดบนเครื่อง', 'เปิดในคอม', 'เปิดบนคอม',
      'เปิด youtube', 'เปิดยูทูป'
    ];

    if (musicKeywords.some(k => raw.includes(k))) {
      return true;
    }

    // Short opening commands like "เปิด", "บอกเปิด", "เปิดสิ", "เปิดเลย", "เปิดดิ", "เปิดหน่อย"
    if (/^(?:เปิด|บอกเปิด|เปิดสิ|เปิดเลย|เปิดดิ|เปิดหน่อย|เปิดขึ้นมา|play)$/i.test(raw)) {
      return true;
    }

    return false;
  }
}

export type MusicControlIntent =
  | 'stop'
  | 'pause'
  | 'resume'
  | 'next'
  | 'volume_substantial_decrease' // ลดเหลือ 20%
  | 'volume_low'                  // ลดเหลือ 10%
  | 'volume_decrease'              // ลดทีละ 10%
  | 'volume_increase'              // เพิ่มทีละ 10%
  | 'mute'
  | 'unmute';

export const DEFAULT_MUSIC_PLAYLIST: import('../../types').PlaylistItem[] = [
  {
    id: 'pl_1',
    title: 'ยอมแลกอะไรก็ได้ — Tilly Birds',
    artist: 'Tilly Birds',
    videoId: 'Advn74fiZsY',
    playbackMode: 'youtube',
  },
  {
    id: 'pl_2',
    title: 'Lofi Chill Beats 24/7 (Study & Work)',
    artist: 'Lofi Girl / ChilledCow',
    audioStreamUrl: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    playbackMode: 'stream',
  },
  {
    id: 'pl_3',
    title: 'ข้างกัน (City) — Three Man Down ft. ออม TELEx TELEXs',
    artist: 'Three Man Down',
    videoId: '3g3Z7q0qg9c',
    playbackMode: 'youtube',
  },
  {
    id: 'pl_4',
    title: 'Acoustic Coffeehouse Cafe & Soft Guitar',
    artist: 'Coffeehouse Acoustic Radio',
    audioStreamUrl: 'https://stream.zeno.fm/ynupfk4wzq8uv',
    playbackMode: 'stream',
  },
  {
    id: 'pl_5',
    title: 'สายตาหลอกกันไม่ได้ (Eyes Don’t Lie) — INK WARUNTORN',
    artist: 'Ink Waruntorn',
    videoId: 'J_8nE1V1l0Y',
    playbackMode: 'youtube',
  },
  {
    id: 'pl_6',
    title: 'Chillout Lounge & Ambient Grooves',
    artist: 'SomaFM Groove Salad',
    audioStreamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    playbackMode: 'stream',
  },
  {
    id: 'pl_7',
    title: 'บานปลาย (Best Wishes) — BOWKYLION',
    artist: 'BOWKYLION',
    videoId: 'x8m8_ZJ0t5Q',
    playbackMode: 'youtube',
  },
];



export const musicService = MusicService.getInstance();
