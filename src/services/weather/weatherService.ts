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
  // Forecast fields
  isForecast?: boolean;
  targetDayLabel?: string;
  tempMax?: number;
  tempMin?: number;
  rainProbability?: number;
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

// 77 Thai provinces & major cities dictionary
const THAI_PROVINCES: Array<{ key: string; name: string }> = [
  { key: 'กรุงเทพ', name: 'กรุงเทพมหานคร' },
  { key: 'กทม', name: 'กรุงเทพมหานคร' },
  { key: 'bangkok', name: 'Bangkok' },
  { key: 'เชียงใหม่', name: 'เชียงใหม่' },
  { key: 'chiang mai', name: 'Chiang Mai' },
  { key: 'chiangmai', name: 'Chiang Mai' },
  { key: 'เชียงราย', name: 'เชียงราย' },
  { key: 'ภูเก็ต', name: 'ภูเก็ต' },
  { key: 'phuket', name: 'Phuket' },
  { key: 'ชลบุรี', name: 'ชลบุรี' },
  { key: 'พัทยา', name: 'พัทยา' },
  { key: 'pattaya', name: 'Pattaya' },
  { key: 'ขอนแก่น', name: 'ขอนแก่น' },
  { key: 'โคราช', name: 'นครราชสีมา' },
  { key: 'นครราชสีมา', name: 'นครราชสีมา' },
  { key: 'สงขลา', name: 'สงขลา' },
  { key: 'หาดใหญ่', name: 'หาดใหญ่' },
  { key: 'กระบี่', name: 'กระบี่' },
  { key: 'krabi', name: 'Krabi' },
  { key: 'หัวหิน', name: 'หัวหิน' },
  { key: 'อยุธยา', name: 'พระนครศรีอยุธยา' },
  { key: 'นนทบุรี', name: 'นนทบุรี' },
  { key: 'ปทุมธานี', name: 'ปทุมธานี' },
  { key: 'สมุทรปราการ', name: 'สมุทรปราการ' },
  { key: 'สมุทรสาคร', name: 'สมุทรสาคร' },
  { key: 'สมุทรสงคราม', name: 'สมุทรสงคราม' },
  { key: 'นครปฐม', name: 'นครปฐม' },
  { key: 'ระยอง', name: 'ระยอง' },
  { key: 'จันทบุรี', name: 'จันทบุรี' },
  { key: 'ตราด', name: 'ตราด' },
  { key: 'กาญจนบุรี', name: 'กาญจนบุรี' },
  { key: 'ราชบุรี', name: 'ราชบุรี' },
  { key: 'สุพรรณบุรี', name: 'สุพรรณบุรี' },
  { key: 'เพชรบุรี', name: 'เพชรบุรี' },
  { key: 'ประจวบคีรีขันธ์', name: 'ประจวบคีรีขันธ์' },
  { key: 'สุราษฎร์ธานี', name: 'สุราษฎร์ธานี' },
  { key: 'สมุย', name: 'เกาะสมุย' },
  { key: 'เกาะสมุย', name: 'เกาะสมุย' },
  { key: 'นครศรีธรรมราช', name: 'นครศรีธรรมราช' },
  { key: 'ชุมพร', name: 'ชุมพร' },
  { key: 'ระนอง', name: 'ระนอง' },
  { key: 'พังงา', name: 'พังงา' },
  { key: 'ตรัง', name: 'ตรัง' },
  { key: 'พัทลุง', name: 'พัทลุง' },
  { key: 'สตูล', name: 'สตูล' },
  { key: 'ปัตตานี', name: 'ปัตตานี' },
  { key: 'ยะลา', name: 'ยะลา' },
  { key: 'นราธิวาส', name: 'นราธิวาส' },
  { key: 'อุบลราชธานี', name: 'อุบลราชธานี' },
  { key: 'อุบล', name: 'อุบลราชธานี' },
  { key: 'อุดรธานี', name: 'อุดรธานี' },
  { key: 'อุดร', name: 'อุดรธานี' },
  { key: 'ลำปาง', name: 'ลำปาง' },
  { key: 'ลำพูน', name: 'ลำพูน' },
  { key: 'แพร่', name: 'แพร่' },
  { key: 'น่าน', name: 'น่าน' },
  { key: 'พะเยา', name: 'พะเยา' },
  { key: 'แม่ฮ่องสอน', name: 'แม่ฮ่องสอน' },
  { key: 'พิษณุโลก', name: 'พิษณุโลก' },
  { key: 'สุโขทัย', name: 'สุโขทัย' },
  { key: 'ตาก', name: 'ตาก' },
  { key: 'กำแพงเพชร', name: 'กำแพงเพชร' },
  { key: 'พิจิตร', name: 'พิจิตร' },
  { key: 'เพชรบูรณ์', name: 'เพชรบูรณ์' },
  { key: 'นครสวรรค์', name: 'นครสวรรค์' },
  { key: 'อุทัยธานี', name: 'อุทัยธานี' },
  { key: 'สระบุรี', name: 'สระบุรี' },
  { key: 'ลพบุรี', name: 'ลพบุรี' },
  { key: 'สิงห์บุรี', name: 'สิงห์บุรี' },
  { key: 'ชัยนาท', name: 'ชัยนาท' },
  { key: 'อ่างทอง', name: 'อ่างทอง' },
  { key: 'นครนายก', name: 'นครนายก' },
  { key: 'ปราจีนบุรี', name: 'ปราจีนบุรี' },
  { key: 'สระแก้ว', name: 'สระแก้ว' },
  { key: 'ฉะเชิงเทรา', name: 'ฉะเชิงเทรา' },
  { key: 'บุรีรัมย์', name: 'บุรีรัมย์' },
  { key: 'สุรินทร์', name: 'สุรินทร์' },
  { key: 'ศรีสะเกษ', name: 'ศรีสะเกษ' },
  { key: 'ร้อยเอ็ด', name: 'ร้อยเอ็ด' },
  { key: 'มหาสารคาม', name: 'มหาสารคาม' },
  { key: 'กาฬสินธุ์', name: 'กาฬสินธุ์' },
  { key: 'ชัยภูมิ', name: 'ชัยภูมิ' },
  { key: 'เลย', name: 'เลย' },
  { key: 'หนองคาย', name: 'หนองคาย' },
  { key: 'บึงกาฬ', name: 'บึงกาฬ' },
  { key: 'หนองบัวลำภู', name: 'หนองบัวลำภู' },
  { key: 'สกลนคร', name: 'สกลนคร' },
  { key: 'นครพนม', name: 'นครพนม' },
  { key: 'มุกดาหาร', name: 'มุกดาหาร' },
  { key: 'ยโสธร', name: 'ยโสธร' },
  { key: 'อำนาจเจริญ', name: 'อำนาจเจริญ' },
  // International cities
  { key: 'โตเกียว', name: 'Tokyo' },
  { key: 'tokyo', name: 'Tokyo' },
  { key: 'โอซาก้า', name: 'Osaka' },
  { key: 'osaka', name: 'Osaka' },
  { key: 'โซล', name: 'Seoul' },
  { key: 'seoul', name: 'Seoul' },
  { key: 'สิงคโปร์', name: 'Singapore' },
  { key: 'singapore', name: 'Singapore' },
  { key: 'ลอนดอน', name: 'London' },
  { key: 'london', name: 'London' },
  { key: 'ปารีส', name: 'Paris' },
  { key: 'paris', name: 'Paris' },
  { key: 'นิวยอร์ก', name: 'New York' },
  { key: 'new york', name: 'New York' },
  { key: 'ไทเป', name: 'Taipei' },
  { key: 'taipei', name: 'Taipei' },
  { key: 'ฮ่องกง', name: 'Hong Kong' },
  { key: 'hong kong', name: 'Hong Kong' },
];

// Stop words that must NEVER be extracted as cities
const WEATHER_STOP_WORDS = new Set([
  'ให้', 'ให้หน่อย', 'หน่อย', 'ดู', 'ช่วย', 'บอก', 'เป็นยังไง', 'เป็นไง', 'เป็นอย่างไร',
  'ไหม', 'มั้ย', 'พรุ่งนี้', 'มะรืนนี้', 'วันนี้', 'ตอนนี้', 'ด้วย', 'สิ', 'นะ', 'ครับ',
  'ค่ะ', 'จ้า', 'ที', 'หน่อยสิ', 'อยากรู้', 'บ้าง', 'วันพรุ่งนี้', 'วันมะรืน', 'พรุ่ง',
  'มะรืน', 'สภาพอากาศ', 'อากาศ', 'อุณหภูมิ', 'ฝนตกไหม', 'ฝนตกมั้ย', 'แดด', 'หนาว',
  'ร้อน', 'แก', 'ไอ้โบ้', 'โบ้', 'น้องโบ', 'ช่วยดู', 'หน่อยนะ', 'ด้วยนะ', 'รึเปล่า', 'หรือเปล่า'
]);

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
    if (!cleanName || cleanName.length < 2 || WEATHER_STOP_WORDS.has(cleanName)) return null;

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

  // Detect time horizon from query
  public detectDayOffset(text: string): { dayOffset: number; label: string } {
    const raw = text.toLowerCase();
    if (raw.includes('มะรืน') || raw.includes('วันมะรืน')) {
      return { dayOffset: 2, label: 'มะรืนนี้' };
    }
    if (raw.includes('พรุ่งนี้') || raw.includes('วันพรุ่งนี้') || raw.includes('tomorrow')) {
      return { dayOffset: 1, label: 'พรุ่งนี้' };
    }
    return { dayOffset: 0, label: 'ตอนนี้' };
  }

  // Fetch real-time weather or daily forecast data from Open-Meteo
  public async getWeather(lat?: number, lon?: number, cityName?: string, dayOffset = 0): Promise<LiveWeatherData | null> {
    const targetLat = lat ?? this.defaultLat;
    const targetLon = lon ?? this.defaultLon;
    const targetCity = cityName || this.defaultCity;

    const cacheKey = `${targetLat.toFixed(2)}_${targetLon.toFixed(2)}_day${dayOffset}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp < this.CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const url = `${this.baseUrl}/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Open-Meteo HTTP ${res.status}`);
      }

      const data = await res.json();
      const current = data.current;
      const daily = data.daily;

      // Forecast for Tomorrow (dayOffset = 1) or Day After Tomorrow (dayOffset = 2)
      if (dayOffset > 0 && daily && daily.time && daily.time.length > dayOffset) {
        const weatherCode = daily.weather_code?.[dayOffset] ?? 0;
        const { condition, emoji, advice } = interpretWmoCode(weatherCode);
        const tempMax = Math.round((daily.temperature_2m_max?.[dayOffset] ?? 32) * 10) / 10;
        const tempMin = Math.round((daily.temperature_2m_min?.[dayOffset] ?? 24) * 10) / 10;
        const rainProb = daily.precipitation_probability_max?.[dayOffset] ?? 0;
        const windMax = Math.round((daily.wind_speed_10m_max?.[dayOffset] ?? 10) * 10) / 10;
        const targetDayLabel = dayOffset === 1 ? 'พรุ่งนี้' : 'มะรืนนี้';

        const result: LiveWeatherData = {
          city: targetCity,
          temperature: tempMax,
          apparentTemperature: tempMax,
          humidity: rainProb,
          weatherCode,
          conditionText: condition,
          emoji,
          advice,
          windSpeed: windMax,
          time: daily.time[dayOffset] || '',
          isForecast: true,
          targetDayLabel,
          tempMax,
          tempMin,
          rainProbability: rainProb,
        };

        this.cache.set(cacheKey, { data: result, timestamp: now });
        return result;
      }

      // Current Weather
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
        isForecast: false,
        targetDayLabel: 'ตอนนี้',
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

    // 1. Direct match against known provinces / cities list
    for (const place of THAI_PROVINCES) {
      if (raw.includes(place.key)) {
        return place.name;
      }
    }

    // 2. English match: "weather in [City]"
    const enMatch = text.match(/(?:weather|temperature|forecast)\s+(?:in|at|for|around)\s+([a-zA-Z\s]{2,20})/i);
    if (enMatch && enMatch[1]) {
      const candidate = enMatch[1].replace(/today|tomorrow|now|please|\?/gi, '').trim();
      if (candidate.length >= 2 && !WEATHER_STOP_WORDS.has(candidate.toLowerCase())) {
        return candidate;
      }
    }

    // 3. Thai pattern matches: "อากาศที่ [เมือง]", "อากาศแถว [เมือง]", "จังหวัด [เมือง]"
    const match = text.match(/(?:อากาศที่|อากาศแถว|อากาศของ|อากาศบริเวณ|จังหวัด|จ\.)\s*([ก-๙a-zA-Z\s]{2,20})/);
    if (match && match[1]) {
      let candidate = match[1]
        .replace(/เป็นไง|เป็นยังไง|เป็นอย่างไร|วันนี้|พรุ่งนี้|มะรืนนี้|ไหม|มั้ย|หน่อย|ด้วย|ให้|สิ/g, '')
        .trim();

      if (
        candidate.length >= 2 &&
        candidate.length <= 15 &&
        !WEATHER_STOP_WORDS.has(candidate)
      ) {
        return candidate;
      }
    }

    return null;
  }

  // Generate natural companion response with REAL weather data
  public async getFormattedWeatherResponse(userQuery: string): Promise<string> {
    const cityMentioned = this.extractCityFromPrompt(userQuery);
    const { dayOffset, label: timeLabel } = this.detectDayOffset(userQuery);

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

    const weather = await this.getWeather(lat, lon, targetCity, dayOffset);
    if (!weather) {
      return `ขอโทษทีนะแก ตอนนี้โบ้ดึงข้อมูลสภาพอากาศของ ${targetCity} ไม่สำเร็จ สัญญาณเน็ตสะดุด ลองถามใหม่อีกทีนะ`;
    }

    const cityName = weather.city;
    const cond = weather.conditionText;
    const emoji = weather.emoji;
    const advice = weather.advice;

    // Tomorrow or Day After Tomorrow Forecast Response
    if (weather.isForecast) {
      const max = weather.tempMax ?? weather.temperature;
      const min = weather.tempMin ?? (weather.temperature - 6);
      const rain = weather.rainProbability ?? 0;
      const wind = weather.windSpeed;

      return `พยากรณ์อากาศ${timeLabel}ที่ ${cityName} ${emoji} ${cond} อุณหภูมิสูงสุดประมาณ ${max}°C ต่ำสุด ${min}°C โอกาสฝนตก ${rain}% ลมพัดแรงสุด ${wind} km/h นะแก ${advice}`;
    }

    // Current Live Weather Response
    const temp = weather.temperature;
    const feel = weather.apparentTemperature;
    const humidity = weather.humidity;
    const wind = weather.windSpeed;

    return `ตอนนี้สภาพอากาศที่ ${cityName} ${emoji} ${cond} อุณหภูมิประมาณ ${temp}°C (รู้สึกเหมือน ${feel}°C) ความชื้น ${humidity}% ลมพัด ${wind} km/h นะแก ${advice}`;
  }
}

export const weatherService = WeatherService.getInstance();
