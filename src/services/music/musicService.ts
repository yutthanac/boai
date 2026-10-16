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

    // 1. Initial cleanup of common Thai and English vocatives and playback command prefixes
    const prefixesToRemove = [
      /^(?:ไอ้โบว์|ไอโบว์|น้องโบว์|โบว์|ไอ้โบ้|ไอโบ้|น้องโบ|บักโบ้|โบ้|ไอ้โบ|ไอโบ|โบไอ|โลไอ|bo\s*ai|boai)\s*[,.:;]?\s*/gi,
      /^(?:ช่วย|รบกวน|กรุณา|วาน|บอก)\s*/gi,
      /^(?:ขอเปลี่ยนเพลงเป็น|ขอเปลี่ยนเพลง|ขอเปลี่ยนเป็น|เปลี่ยนเพลงเป็น|เปลี่ยนเพลง|เปลี่ยนเป็น)\s*/gi,
      /^(?:ช่วยเปิดเพลง|ช่วยหาเพลง|ช่วยเปิด|เปิดเพลง|เล่นเพลง|ฟังเพลง|ขอเพลง|หาเพลง|เปิดให้ฟังหน่อย|เปิดให้หน่อย|เล่นให้หน่อย|เล่นให้ฟังหน่อย)\s*/gi,
      /^(?:play\s+(?:the\s+)?song|play\s+(?:the\s+)?music|play\s+(?:me\s+)?|play)\s*/gi,
    ];

    for (const regex of prefixesToRemove) {
      clean = clean.replace(regex, '').trim();
    }

    // 2. Comprehensive Contextual Suffix Stripper (Ordered from longest/most specific to shortest)
    const suffixesToRemove = [
      // System & Location context phrases
      /(?:ในระบบเรานะ|บนระบบเรานะ|ในระบบเรา|บนระบบเรา|ในระบบนะ|บนระบบนะ|ในระบบ|บนระบบ)$/gi,
      /(?:บนเครื่องเรานะ|ในเครื่องเรานะ|บนเครื่องเรา|ในเครื่องเรา|บนเครื่องนะ|ในเครื่องนะ|บนเครื่อง|ในเครื่อง)$/gi,
      /(?:บนคอมเรานะ|ในคอมเรานะ|บนคอมเรา|ในคอมเรา|บนคอมนะ|ในคอมนะ|บนคอม|ในคอม)$/gi,
      /(?:บนเบราว์เซอร์เรานะ|ในเบราว์เซอร์เรานะ|บนเบราว์เซอร์เรา|ในเบราว์เซอร์เรา|บนเบราว์เซอร์|ในเบราว์เซอร์|เบราว์เซอร์)$/gi,
      /(?:remote\s*เปิดในเครื่องเรา|remote\s*เปิดในเครื่อง|remote\s*เปิด|รีโมท\s*เปิดในเครื่อง|รีโมท\s*เปิด|remote|รีโมท)$/gi,

      // Conversational politeness & request suffixes
      /(?:ให้เราฟังหน่อยนะ|ให้เราฟังนะ|ให้เราฟังที|ให้ฟังหน่อยนะ|ให้ฟังหน่อยดิ|ให้ฟังหน่อยสิ|ให้ฟังหน่อยครับ|ให้ฟังหน่อยค่ะ|ให้ฟังหน่อย|ให้ฟังนะ|ให้ฟังที)$/gi,
      /(?:ให้หน่อยดิแก|ให้หน่อยนะแก|ให้หน่อยสิแก|ให้หน่อยนะครับ|ให้หน่อยนะคะ|ให้หน่อยนะจ๊ะ|ให้หน่อยนะ|ให้หน่อยดิ|ให้หน่อยสิ|ให้หน่อยครับ|ให้หน่อยค่ะ|ให้หน่อย)$/gi,
      /(?:ฟังเพลินๆ หน่อยนะ|ฟังเพลินๆ นะ|ฟังเพลินๆ|ฟังชิลๆ หน่อยนะ|ฟังชิลๆ นะ|ฟังชิลๆ|ชิลๆ หน่อย|เพราะๆ หน่อย)$/gi,
      /(?:สักเพลงสิแก|สักเพลงนะแก|สักเพลงสิ|สักเพลงนะ|สักเพลง)$/gi,
      /(?:หน่อยนะแก|หน่อยนะจ๊ะ|หน่อยดิแก|หน่อยนะ|หน่อยดิ|หน่อยสิ|หน่อยครับ|หน่อยค่ะ|หน่อย)$/gi,
      /(?:ทีครับ|ทีค่ะ|ทีดิ|ทีแก|ทีสิ|ทีนะ|ที)$/gi,
      /(?:เลยแก|เลยนะ|เลยดิ|เลยสิ|เลย)$/gi,
      /(?:นะแก|นะจ๊ะ|นะครับ|นะคะ|นะ|ดิแก|ดิ|สิแก|สิ|ครับผม|ครับ|ค่ะ)$/gi,

      // YouTube platform mentions
      /(?:ใน\s*youtube\s*music|บน\s*youtube\s*music|จาก\s*youtube\s*music|youtube\s*music)$/gi,
      /(?:ใน\s*ยูทูปมิวสิค|บน\s*ยูทูปมิวสิค|ยูทูปมิวสิค|ใน\s*ยูทูป|บน\s*ยูทูป|ยูทูป|youtube)$/gi,
      /(?:song|music)$/gi,
    ];

    // Iteratively strip suffixes from the end of the query
    let prev = '';
    while (clean !== prev) {
      prev = clean;
      for (const regex of suffixesToRemove) {
        clean = clean.replace(regex, '').trim();
      }
    }

    // 3. Language Boundary & Title Isolation (Thai-English Boundary)
    // If the title starts with an English title (e.g. "See You Again", "Love Me Like You Do", "Shape of You", "Die With A Smile")
    // followed by any trailing Thai conversational words that weren't caught above:
    const englishLeadingMatch = clean.match(/^([a-zA-Z0-9\s'.,!&/()+-]{2,})\s+([\u0E00-\u0E7F\s]+)$/);
    if (englishLeadingMatch) {
      const englishTitle = englishLeadingMatch[1].trim();
      const trailingThai = englishLeadingMatch[2].trim();
      // If trailing Thai contains common prepositions/verbs/particles, isolate the English title
      if (/(?:ใน|บน|ให้|หน่อย|ฟัง|ขอ|เปิด|เล่น|ดิ|นะ|ที|เลย|ชิล|เพราะ|เพลง|ระบบ|เครื่อง|คอม|เบราว์เซอร์)/.test(trailingThai)) {
        clean = englishTitle;
      }
    }

    // Also check if entire query is wrapped in quotes
    clean = clean.replace(/^["'“”‘]+|["'“”’]+$/g, '').trim();
    // Normalize punctuation at ends
    clean = clean.replace(/^[-\s,.:;!#?]+|[-\s,.:;!#?]+$/g, '').trim();
    // Normalize multiple spaces
    clean = clean.replace(/\s{2,}/g, ' ');

    // 4. Smart Song Search Normalizer (popular spelling fixes)
    const normalizedLower = clean.toLowerCase();
    const commonFixes: Record<string, string> = {
      'see you agian': 'See You Again',
      'love me like u do': 'Love Me Like You Do',
      'love me like you': 'Love Me Like You Do',
      'shape of yu': 'Shape of You',
      'die with a smlie': 'Die With A Smile',
      'blinding light': 'Blinding Lights',
      'bad guys': 'Bad Guy',
      'lofi chill beat': 'Lofi Chill Beats',
    };

    if (commonFixes[normalizedLower]) {
      return commonFixes[normalizedLower];
    }

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

    // 2. Pause / Hold ("พอส คือพอส", "หยุดเพลงแป๊บ", "พักเพลง", "pause")
    if (
      /^(?:พอส|พอสเพลง|pause|หยุด|หยุดก่อน|หยุดไว้ก่อน|หยุดแป๊บ|หยุดเพลงแป๊บ|หยุดเพลงไว้ก่อน|หยุดเพลงชั่วคราว|พักเพลง|พักไว้ก่อน|หยุดชั่วคราว)$/i.test(raw) ||
      /(?:พอสเพลง|พอส|pause|หยุดเพลงแป๊บ|หยุดเพลงไว้ก่อน|หยุดเพลงชั่วคราว|หยุดชั่วคราว|หยุดไว้ก่อน|หยุดแป๊บ|พักเพลง|พักไว้ก่อน|หยุดก่อน)/i.test(raw)
    ) {
      return 'pause';
    }

    // 3. Stop / Close Music completely ("บอกปิด", "ปิด", "ปิดเพลง", "ปิดไปเลย")
    // CRITICAL: Must use (?<![เแ]) so that "เปิดเพลง" (which has 'เ' before 'ป') is NEVER matched as "ปิดเพลง"!
    if (
      /^(?:บอกปิด|บอกปิดเพลง|(?<![เแ])ปิด|(?<![เแ])ปิดเพลง|(?<![เแ])ปิดเลย|(?<![เแ])ปิดไปเลย|(?<![เแ])ปิดเพลงไปเลย|(?<![เแ])ปิดเพลงเลย|หยุดเพลง|เลิกเปิดเพลง|หยุดเปิดเพลง|หยุดเล่นเพลง|เลิกฟังเพลง)(?:ที|หน่อย|ดิ|นะ|สิ)?$/i.test(raw) ||
      /(?:(?<![เแ])ปิดเพลง|หยุดเพลง|เลิกเปิดเพลง|(?<![เแ])ปิดเพลงไปเลย|(?<![เแ])ปิดเพลงเลย|หยุดเปิดเพลง|(?<![เแ])ปิดไปเลย|หยุดเล่นเพลง|เลิกฟังเพลง)(?:ที|หน่อย|ดิ|นะ|สิ)?/i.test(raw)
    ) {
      return 'stop';
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
