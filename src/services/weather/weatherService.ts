export interface LiveWeatherData {
  city: string;
  country?: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  conditionText: string;
  emoji: string;
  advice: string;
  windSpeed: number;
  time: string;
}

interface CacheEntry {
  data: LiveWeatherData;
  timestamp: number;
}

// WMO Weather Interpretation Codes (WW)
export function interpretWmoCode(code: number): { condition: string; emoji: string; advice: string } {
  switch (code) {
    case 0:
      return { condition: 'ท้องฟ้าแจ่มใส แดดดี', emoji: '☀️', advice: 'ฟ้าโปร่งมากแก อากาศกำลังดี ออกไปทำกิจกรรมหรือตากผ้าได้สบายเลย' };
    case 1:
      return { condition: 'ท้องฟ้าโปร่งเป็นส่วนใหญ่', emoji: '🌤️', advice: 'แดดร่มลมตกกำลังดี อากาศแจ่มใส ชิลๆ เลยแก' };
    case 2:
      return { condition: 'มีเมฆบางส่วน', emoji: '⛅', advice: 'มีเมฆบังแดดให้บางช่วง ไม่ร้อนจนเกินไป กำลังสบาย' };
    case 3:
      return { condition: 'เมฆครึ้มหนาแน่น', emoji: '☁️', advice: 'ฟ้าครึ้มเมฆเยอะหน่อย แดดไม่แรง' };
    case 45:
    case 48:
      return { condition: 'มีหมอกหนา', emoji: '🌫️', advice: 'ทัศนวิสัยลดลง ถ้าต้องเดินทางขับรถอย่าลืมเปิดไฟหน้าระวังด้วยนะแก' };
    case 51:
      return { condition: 'ฝนตกปรอยๆ เบาๆ', emoji: '🌦️', advice: 'มีละอองฝนตกปรอยๆ ถ้าจะออกไปไหนพกร่มไว้หน่อยนะแก เดี๋ยวผมเปียก' };
    case 53:
    case 55:
      return { condition: 'ฝนตกปรอยๆ ปานกลาง', emoji: '🌦️', advice: 'ฝนตกปรอยๆ ต่อเนื่อง พกร่มติดตัวไปด้วยนะแก' };
    case 56:
    case 57:
      return { condition: 'ฝนละอองเย็นจัด', emoji: '🌧️', advice: 'ฝนตกแถมลมเย็น อย่าลืมใส่เสื้อคลุมด้วยนะแก' };
    case 61:
      return { condition: 'ฝนตกเล็กน้อย', emoji: '🌧️', advice: 'มีฝนตกเบาๆ พกร่มกันฝนไว้ด้วยนะแก' };
    case 63:
      return { condition: 'ฝนตกปานกลาง', emoji: '🌧️', advice: 'ฝนตกพอสมควรเลย หลบฝนในร่มก่อน หรือกางร่มให้ดีนะ' };
    case 65:
      return { condition: 'ฝนตกหนัก', emoji: '🌧️⛈️', advice: 'ฝนเทกระหน่ำเลยแก! ระวังถนนลื่น น้ำขัง เดินทางปลอดภัยนะ' };
    case 66:
    case 67:
      return { condition: 'ฝนตกเย็นจัด', emoji: '🌧️❄️', advice: 'ฝนตกหนาวเหน็บ รักษาร่างกายให้อบอุ่นด้วยนะ' };
    case 71:
    case 73:
    case 75:
      return { condition: 'หิมะตก', emoji: '❄️', advice: 'หิมะโปรยปราย หนาวมาก ใส่เสื้อหนาๆ ดื่มอะไรร้อนๆ นะ' };
    case 80:
    case 81:
      return { condition: 'ฝนซู่ตกเป็นระลอก', emoji: '🌦️', advice: 'ฝนตกเป็นพักๆ เหมือนฝนไล่ช้าง พกร่มไว้ให้อุ่นใจนะแก' };
    case 82:
      return { condition: 'ฝนตกซู่กระหน่ำ', emoji: '⛈️', advice: 'ฝนตกแรงมาก ระวังเปียกและหาที่หลบฝนก่อนนะแก' };
    case 95:
      return { condition: 'พายุฝนฟ้าคะนอง', emoji: '⛈️⚡', advice: 'ฟ้าร้องฟ้าผ่าแรง อย่าอยู่ใต้ต้นไม้ใหญ่หรือที่โล่งแจ้งนะแก ปลอดภัยไว้ก่อน!' };
    case 96:
    case 99:
      return { condition: 'พายุฝนฟ้าคะนอง มีลูกเห็บตก', emoji: '⛈️🧊', advice: 'พายุแรงและมีลูกเห็บตก หลบในอาคารที่มั่นคงนะแก!' };
    default:
      return { condition: 'สภาพอากาศทั่วไป', emoji: '🌤️', advice: 'อย่าลืมดื่มน้ำเยอะๆ และดูแลสุขภาพด้วยนะแก' };
  }
}

export class WeatherService {
  private static instance: WeatherService;
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

  private baseUrl: string;
  private geoUrl: string;
  private defaultCity: string;
  private defaultLat: number;
  private defaultLon: number;

  private constructor() {
    this.baseUrl = import.meta.env.VITE_OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1';
    this.geoUrl = import.meta.env.VITE_OPEN_METEO_GEO_URL || 'https://geocoding-api.open-meteo.com/v1';
    this.defaultCity = import.meta.env.VITE_DEFAULT_CITY || 'กรุงเทพมหานคร';
    this.defaultLat = parseFloat(import.meta.env.VITE_DEFAULT_LATITUDE || '13.7563');
    this.defaultLon = parseFloat(import.meta.env.VITE_DEFAULT_LONGITUDE || '100.5018');
  }

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  // Geocoding: Search city coordinates via Open-Meteo
  public async searchCityCoordinates(cityName: string): Promise<{ name: string; country: string; lat: number; lon: number } | null> {
    const cleanName = cityName.trim();
    if (!cleanName) return null;

    try {
      const url = `${this.geoUrl}/search?name=${encodeURIComponent(cleanName)}&count=1&language=th&format=json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        return {
          name: item.name || cleanName,
          country: item.country || '',
          lat: item.latitude,
          lon: item.longitude,
        };
      }
    } catch (e) {
      console.warn('[Open-Meteo Geo error]:', e);
    }
    return null;
  }

  // Fetch real-time weather data
  public async getLiveWeather(lat?: number, lon?: number, cityName?: string): Promise<LiveWeatherData | null> {
    const targetLat = lat ?? this.defaultLat;
    const targetLon = lon ?? this.defaultLon;
    const targetCity = cityName || this.defaultCity;

    const cacheKey = `${targetLat.toFixed(2)}_${targetLon.toFixed(2)}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp < this.CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Open-Meteo HTTP ${res.status}`);
      }

      const data = await res.json();
      const current = data.current;
      if (!current) return null;

      const weatherCode = current.weather_code ?? 0;
      const { condition, emoji, advice } = interpretWmoCode(weatherCode);

      const result: LiveWeatherData = {
        city: targetCity,
        temperature: Math.round(current.temperature_2m * 10) / 10,
        apparentTemperature: Math.round(current.apparent_temperature * 10) / 10,
        humidity: current.relative_humidity_2m ?? 0,
        weatherCode,
        conditionText: condition,
        emoji,
        advice,
        windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
        time: current.time || '',
      };

      this.cache.set(cacheKey, { data: result, timestamp: now });
      return result;
    } catch (err) {
      console.error('[Open-Meteo Fetch error]:', err);
      return null;
    }
  }

  // Extract city/province from user prompt
  public extractCityFromPrompt(text: string): string | null {
    const raw = text.toLowerCase();

    // Common Thai and International places
    const popularPlaces = [
      { key: 'เชียงใหม่', search: 'เชียงใหม่' },
      { key: 'chiang mai', search: 'Chiang Mai' },
      { key: 'chiangmai', search: 'Chiang Mai' },
      { key: 'เชียงราย', search: 'เชียงราย' },
      { key: 'chiang rai', search: 'Chiang Rai' },
      { key: 'ภูเก็ต', search: 'ภูเก็ต' },
      { key: 'phuket', search: 'Phuket' },
      { key: 'ชลบุรี', search: 'ชลบุรี' },
      { key: 'chonburi', search: 'Chonburi' },
      { key: 'พัทยา', search: 'พัทยา' },
      { key: 'pattaya', search: 'Pattaya' },
      { key: 'ขอนแก่น', search: 'ขอนแก่น' },
      { key: 'khon kaen', search: 'Khon Kaen' },
      { key: 'khonkaen', search: 'Khon Kaen' },
      { key: 'โคราช', search: 'นครราชสีมา' },
      { key: 'นครราชสีมา', search: 'นครราชสีมา' },
      { key: 'korat', search: 'Nakhon Ratchasima' },
      { key: 'หาดใหญ่', search: 'หาดใหญ่' },
      { key: 'hat yai', search: 'Hat Yai' },
      { key: 'สงขลา', search: 'สงขลา' },
      { key: 'กระบี่', search: 'กระบี่' },
      { key: 'krabi', search: 'Krabi' },
      { key: 'หัวหิน', search: 'หัวหิน' },
      { key: 'hua hin', search: 'Hua Hin' },
      { key: 'อยุธยา', search: 'อยุธยา' },
      { key: 'นนทบุรี', search: 'นนทบุรี' },
      { key: 'ปทุมธานี', search: 'ปทุมธานี' },
      { key: 'สมุทรปราการ', search: 'สมุทรปราการ' },
      { key: 'ระยอง', search: 'ระยอง' },
      { key: 'rayong', search: 'Rayong' },
      { key: 'กาญจนบุรี', search: 'กาญจนบุรี' },
      { key: 'สุราษฎร์ธานี', search: 'สุราษฎร์ธานี' },
      { key: 'สมุย', search: 'เกาะสมุย' },
      { key: 'samui', search: 'Ko Samui' },
      { key: 'อุบล', search: 'อุบลราชธานี' },
      { key: 'อุดร', search: 'อุดรธานี' },
      { key: 'ลำปาง', search: 'ลำปาง' },
      { key: 'กรุงเทพ', search: 'กรุงเทพมหานคร' },
      { key: 'กรุงเทพฯ', search: 'กรุงเทพมหานคร' },
      { key: 'กทม', search: 'กรุงเทพมหานคร' },
      { key: 'bangkok', search: 'Bangkok' },
      { key: 'โตเกียว', search: 'Tokyo' },
      { key: 'tokyo', search: 'Tokyo' },
      { key: 'osaka', search: 'Osaka' },
      { key: 'london', search: 'London' },
      { key: 'ลอนดอน', search: 'London' },
      { key: 'singapore', search: 'Singapore' },
      { key: 'สิงคโปร์', search: 'Singapore' },
      { key: 'seoul', search: 'Seoul' },
      { key: 'โซล', search: 'Seoul' },
      { key: 'paris', search: 'Paris' },
      { key: 'ปารีส', search: 'Paris' },
    ];

    for (const place of popularPlaces) {
      if (raw.includes(place.key)) {
        return place.search;
      }
    }

    // English match: "weather in [City]", "temperature in [City]"
    const enMatch = text.match(/(?:weather|temperature|forecast)\s+(?:in|at|for|around)\s+([a-zA-Z\s]{2,20})/i);
    if (enMatch && enMatch[1]) {
      const candidate = enMatch[1].replace(/today|tomorrow|now|please|\?/gi, '').trim();
      if (candidate.length >= 2) return candidate;
    }

    // English match: "[City] weather", "[City] temperature"
    const enMatchReverse = text.match(/([a-zA-Z\s]{2,20})\s+(?:weather|temperature|forecast)/i);
    if (enMatchReverse && enMatchReverse[1]) {
      const candidate = enMatchReverse[1].replace(/what is the|how is the|tell me|today|tomorrow|\?/gi, '').trim();
      if (candidate.length >= 2) return candidate;
    }

    // Thai pattern matches: "อากาศที่ [เมือง]", "อากาศแถว [เมือง]"
    const match = text.match(/อากาศ(?:ที่|แถว|ของ|บริเวณ)?\s*([ก-๙a-zA-Z\s]{2,20})/);
    if (match && match[1]) {
      const candidate = match[1].replace(/เป็นไง|เป็นอย่างไร|วันนี้|พรุ่งนี้|ไหม|มั้ย|หน่อย|ด้วย/g, '').trim();
      if (candidate.length >= 2 && candidate.length <= 15) {
        return candidate;
      }
    }

    return null;
  }

  // Generate natural companion response with REAL weather data
  public async getFormattedWeatherResponse(userQuery: string): Promise<string> {
    const cityMentioned = this.extractCityFromPrompt(userQuery);
    let targetCity = cityMentioned || this.defaultCity;
    let lat = this.defaultLat;
    let lon = this.defaultLon;

    if (cityMentioned) {
      const geo = await this.searchCityCoordinates(cityMentioned);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
        targetCity = geo.name;
      }
    }

    const weather = await this.getLiveWeather(lat, lon, targetCity);
    if (!weather) {
      return `ขอโทษทีนะแก ตอนนี้โบ้ดึงข้อมูลสภาพอากาศของ ${targetCity} ไม่สำเร็จ สัญญาณเน็ตสะดุด ลองถามใหม่อีกทีนะ`;
    }

    // Build companion response
    const cityName = weather.city;
    const temp = weather.temperature;
    const feel = weather.apparentTemperature;
    const cond = weather.conditionText;
    const emoji = weather.emoji;
    const advice = weather.advice;
    const humidity = weather.humidity;
    const wind = weather.windSpeed;

    return `ตอนนี้สภาพอากาศที่ ${cityName} ${emoji} ${cond} อุณหภูมิประมาณ ${temp}°C (รู้สึกเหมือน ${feel}°C) ความชื้น ${humidity}% ลมพัด ${wind} km/h นะแก ${advice}`;
  }
}

export const weatherService = WeatherService.getInstance();
