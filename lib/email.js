// ─────────────────────────────────────────────────────
//  lib/email.js  —  Отправка email через Supabase
//  Используем встроенный Supabase Auth email или Resend
// ─────────────────────────────────────────────────────

import { supabaseAdmin } from './supabase.js'

// Поставить email в очередь на отправку
export async function scheduleEmail({ userId, email, type, scheduledFor }) {
  const db = supabaseAdmin()
  const { error } = await db.from('email_queue').insert({
    user_id: userId,
    email,
    type,
    scheduled_for: scheduledFor.toISOString(),
    status: 'pending',
  })
  if (error) console.error('scheduleEmail error:', error.message)
  return !error
}

// Поставить welcome-письмо сразу после регистрации
export async function scheduleWelcomeEmail({ userId, email, name }) {
  return scheduleEmail({
    userId,
    email,
    type: 'welcome',
    scheduledFor: new Date(Date.now() + 60 * 1000), // через 1 минуту
  })
}

// Поставить напоминание на следующий день в 8:00 МСК
export async function scheduleDailyReminder({ userId, email }) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0) // 8:00

  return scheduleEmail({
    userId,
    email,
    type: 'daily_reminder',
    scheduledFor: tomorrow,
  })
}

// Шаблоны писем
export function getEmailTemplate(type, { name, zodiac, emoji, planet } = {}) {
  const templates = {
    welcome: {
      subject: `${emoji || '🌟'} ${name}, твои рекомендации готовы!`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF6F0;">
          <h1 style="font-family:Georgia,serif;color:#1C1A2E;font-size:24px;margin-bottom:8px;">
            Добро пожаловать, ${name}! ${emoji || '🌟'}
          </h1>
          <p style="color:#7A7A8A;font-size:15px;line-height:1.7;margin-bottom:20px;">
            Ты зарегистрировался в сервисе персональных рекомендаций «Найди своё».
            Каждый день в 8 утра мы будем присылать тебе 16 открытий — специально для ${zodiac || 'тебя'}.
          </p>
          <div style="background:#1C1A2E;border-radius:16px;padding:20px 24px;margin-bottom:24px;">
            <p style="color:#E8C97A;font-size:13px;margin:0 0 6px;font-weight:bold;text-transform:uppercase;letter-spacing:.08em;">
              Твой знак
            </p>
            <p style="color:#fff;font-size:18px;margin:0;">
              ${emoji} ${zodiac} · День ${planet || ''}
            </p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://naidi-svoe.vercel.app'}"
             style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C97A);color:#1C1A2E;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">
            Открыть рекомендации →
          </a>
          <p style="color:#aaa;font-size:12px;margin-top:24px;line-height:1.6;">
            Если ты не хочешь получать напоминания — просто ответь на это письмо.<br>
            © 2025 Найди своё · Фотострана
          </p>
        </div>
      `,
    },
    daily_reminder: {
      subject: `${emoji || '🌅'} ${name}, твои открытия на сегодня готовы`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF6F0;">
          <h1 style="font-family:Georgia,serif;color:#1C1A2E;font-size:24px;margin-bottom:8px;">
            Доброе утро, ${name}! ${emoji || '🌅'}
          </h1>
          <p style="color:#7A7A8A;font-size:15px;line-height:1.7;margin-bottom:20px;">
            Для ${zodiac || 'тебя'} сегодня готовы персональные рекомендации — 
            твой фильм, книга, слово дня, гороскоп и многое другое.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://naidi-svoe.vercel.app'}"
             style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C97A);color:#1C1A2E;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">
            Открыть мои рекомендации →
          </a>
          <p style="color:#aaa;font-size:12px;margin-top:24px;line-height:1.6;">
            Чтобы отписаться от ежедневных напоминаний — ответь «стоп» на это письмо.<br>
            © 2025 Найди своё · Фотострана
          </p>
        </div>
      `,
    },
    reactivation: {
      subject: `${emoji || '✨'} ${name}, мы скучаем — и у нас есть кое-что для тебя`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FAF6F0;">
          <h1 style="font-family:Georgia,serif;color:#1C1A2E;font-size:24px;margin-bottom:8px;">
            Привет, ${name} ${emoji || '✨'}
          </h1>
          <p style="color:#7A7A8A;font-size:15px;line-height:1.7;margin-bottom:20px;">
            Ты давно не заходил в «Найди своё». А тем временем для ${zodiac || 'тебя'}
            каждый день появляются новые рекомендации — твоя книга, слово дня, добрые новости.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://naidi-svoe.vercel.app'}"
             style="display:inline-block;background:linear-gradient(135deg,#C9A84C,#E8C97A);color:#1C1A2E;font-weight:bold;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">
            Вернуться к открытиям →
          </a>
          <p style="color:#aaa;font-size:12px;margin-top:24px;line-height:1.6;">
            © 2025 Найди своё · Фотострана
          </p>
        </div>
      `,
    },
  }
  return templates[type] || templates.welcome
}
