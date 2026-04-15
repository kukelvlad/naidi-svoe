// ─────────────────────────────────────────────────────
//  pages/api/recommendations.js
//  GET /api/recommendations?userId=xxx
//  Возвращает 16 персональных рекомендаций на сегодня
// ─────────────────────────────────────────────────────

import { supabaseAdmin } from '../../lib/supabase.js'
import { buildRecommendations } from '../../lib/recommendations.js'
import { getMoonPhase } from '../../lib/moonphase.js'
import { getDailyHoroscope } from '../../lib/horoscope.js'
import { scheduleDailyReminder } from '../../lib/email.js'
import { getPlanetOfDay, getDayNumber, getSeason, DAY_NUMBER_THEMES } from '../../lib/astro.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const db = supabaseAdmin()

  // Получаем пользователя
  const { data: user, error } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return res.status(404).json({ error: 'Пользователь не найден' })
  }

  // Обновляем last_seen
  await db.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)

  // Логируем визит сегодня (UPSERT — один лог в день)
  await db.from('daily_log').upsert(
    { user_id: userId, date: new Date().toISOString().slice(0, 10) },
    { onConflict: 'user_id,date' }
  )

  // Ставим напоминание на завтра — только если его ещё нет
  // Проверяем один раз: не было ли уже письма на завтра
  if (user.email && user.reminders_on) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().slice(0, 10) // 'YYYY-MM-DD'

    const { data: alreadyQueued } = await db
      .from('email_queue')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'daily_reminder')
      .gte('scheduled_for', tomorrowDate + 'T00:00:00Z')
      .lte('scheduled_for', tomorrowDate + 'T23:59:59Z')
      .maybeSingle()

    if (!alreadyQueued) {
      await scheduleDailyReminder({ userId, email: user.email })
    }
  }

  // Параллельно получаем фазу луны и гороскоп
  const [moonPhase, horoscope] = await Promise.allSettled([
    getMoonPhase(),
    getDailyHoroscope(user.zodiac_sign),
  ])

  const moon = moonPhase.status === 'fulfilled' ? moonPhase.value : { key: 'waxing', ru: 'Растущая луна', icon: '🌓' }
  const horoscopeText = horoscope.status === 'fulfilled' ? horoscope.value : null

  // Строим рекомендации
  const today = new Date()
  const cards = buildRecommendations({
    user,
    moonPhase: moon.key,
    horoscope: horoscopeText,
  })

  // Фильтруем скрытые карточки
  const hiddenIds = user.hidden_cards || []
  const visibleCards = cards.filter(c => !hiddenIds.includes(c.id))

  return res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      zodiac_sign: user.zodiac_sign,
      zodiac_emoji: user.zodiac_emoji,
      element: user.element,
      planet: user.planet,
      num_life_path: user.num_life_path,
    },
    meta: {
      date: today.toISOString().slice(0, 10),
      moon: moon,
      day_number: getDayNumber(today),
      planet_of_day: getPlanetOfDay(today),
      season: getSeason(today),
      day_theme: DAY_NUMBER_THEMES[getDayNumber(today)],
    },
    cards: visibleCards,
    hidden_count: hiddenIds.length,
  })
}
