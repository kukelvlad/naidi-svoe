// ─────────────────────────────────────────────────────
//  pages/api/register.js
//  POST /api/register
//  Регистрация нового пользователя
// ─────────────────────────────────────────────────────

import { supabaseAdmin } from '../../lib/supabase.js'
import { getZodiac, getLifePathNumber, getDestinyNumber } from '../../lib/astro.js'
import { scheduleWelcomeEmail, scheduleDailyReminder } from '../../lib/email.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, birth_date, email, fotostrana_id, city } = req.body

  // Валидация
  if (!name || !birth_date) {
    return res.status(400).json({ error: 'name и birth_date обязательны' })
  }

  const db = supabaseAdmin()

  // Проверяем существующего юзера по email или fotostrana_id
  if (email || fotostrana_id) {
    const checks = []
    if (email)          checks.push({ email })
    if (fotostrana_id)  checks.push({ fotostrana_id })

    for (const check of checks) {
      const { data: existing } = await db
        .from('users')
        .select('id, email, zodiac_sign, zodiac_emoji, element, planet, num_life_path, name')
        .match(check)
        .single()

      if (existing) {
        // Юзер уже есть — обновляем last_seen и возвращаем данные
        await db.from('users').update({ last_seen_at: new Date().toISOString() }).eq('id', existing.id)
        return res.status(200).json({ user: existing, isNew: false })
      }
    }
  }

  // Считаем астро-данные
  const zodiac         = getZodiac(birth_date)
  const numLifePath    = getLifePathNumber(birth_date)
  const numDestiny     = getDestinyNumber(name)

  // Создаём пользователя
  const { data: user, error } = await db
    .from('users')
    .insert({
      name:          name.trim(),
      birth_date,
      email:         email?.toLowerCase().trim() || null,
      fotostrana_id: fotostrana_id || null,
      city:          city?.trim() || null,
      zodiac_sign:   zodiac.name,
      zodiac_emoji:  zodiac.emoji,
      element:       zodiac.element,
      planet:        zodiac.planet,
      num_life_path: numLifePath,
      food:          zodiac.food,
      compatible:    zodiac.compatible,
    })
    .select()
    .single()

  if (error) {
    console.error('Register error:', error.message)
    return res.status(500).json({ error: 'Ошибка при создании пользователя' })
  }

  // Логируем первый визит
  await db.from('daily_log').insert({ user_id: user.id }).then(() => {})

  // Ставим письма в очередь если есть email
  if (email) {
    const emailData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      zodiac: user.zodiac_sign,
      emoji: user.zodiac_emoji,
      planet: user.planet,
    }
    await scheduleWelcomeEmail(emailData)
    await scheduleDailyReminder({ userId: user.id, email: user.email })
  }

  return res.status(201).json({ user, isNew: true })
}
