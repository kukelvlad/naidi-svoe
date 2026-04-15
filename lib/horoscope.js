// ─────────────────────────────────────────────────────
//  lib/horoscope.js  —  Гороскоп от freehoroscopeapi.com
//  Бесплатно, без ключа
// ─────────────────────────────────────────────────────

// Маппинг русских названий знаков на английские для API
const SIGN_MAP = {
  'Овен': 'aries', 'Телец': 'taurus', 'Близнецы': 'gemini',
  'Рак': 'cancer', 'Лев': 'leo', 'Дева': 'virgo',
  'Весы': 'libra', 'Скорпион': 'scorpio', 'Стрелец': 'sagittarius',
  'Козерог': 'capricorn', 'Водолей': 'aquarius', 'Рыбы': 'pisces',
}

export async function getDailyHoroscope(zodiacSignRu) {
  const signEn = SIGN_MAP[zodiacSignRu]
  if (!signEn) return null

  // Попытка 1: freehoroscopeapi.com (без ключа)
  try {
    const url = `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${signEn}`
    const res = await fetch(url, {
      next: { revalidate: 86400 }, // кэш на сутки
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.data?.horoscope) return data.data.horoscope
    }
  } catch (e) {
    console.error('freehoroscopeapi error:', e.message)
  }

  // Попытка 2: API Ninjas (с ключом)
  try {
    const url = `https://api.api-ninjas.com/v1/horoscope?zodiac=${signEn}`
    const res = await fetch(url, {
      headers: { 'X-Api-Key': process.env.API_NINJAS_KEY },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.horoscope) return data.horoscope
    }
  } catch (e) {
    console.error('API Ninjas horoscope error:', e.message)
  }

  return null // вернём null — recommendations.js подставит дефолтный текст
}
