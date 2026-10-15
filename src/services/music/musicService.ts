export interface SongRequest {
  query: string;
  url: string;
}

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
      /ช่วยเปิดเพลง/gi,
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
      /สักเพลง/gi,
      /เพลง/gi,
    ];

    for (const regex of phrasesToRemove) {
      clean = clean.replace(regex, '').trim();
    }

    clean = clean.replace(/^[-\s,.:;]+|[-\s,.:;]+$/g, '').trim();

    // Fallback if user just said "เปิดเพลง" with no specific title
    if (!clean || clean.length < 2) {
      return 'เพลงเพราะๆ ฟังสบายๆ';
    }

    return clean;
  }

  // Generate YouTube Music Search & Direct Play URL
  public getYouTubeMusicUrl(query: string): string {
    return `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
  }

  // Open YouTube Music in browser or Electron external app
  public openMusic(query: string): SongRequest {
    const song = this.extractSongQuery(query);
    const url = this.getYouTubeMusicUrl(song);

    try {
      if ((window as any).electronAPI?.openExternal) {
        (window as any).electronAPI.openExternal(url);
      } else if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.warn('[MusicService] Failed to open external link:', e);
    }

    return { query: song, url };
  }

  // Check if text has music playback intent
  public isMusicIntent(text: string): boolean {
    const lower = text.toLowerCase();
    const musicKeywords = [
      'เปิดเพลง', 'เล่นเพลง', 'ฟังเพลง', 'ขอเพลง', 'หาเพลง',
      'youtube music', 'youtubemusic', 'ยูทูปมิวสิค', 'ยูทูบมิวสิค',
      'play music', 'play song', 'lofi', 'เพลง'
    ];

    return musicKeywords.some(k => lower.includes(k));
  }
}

export const musicService = MusicService.getInstance();
