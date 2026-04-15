// ─────────────────────────────────────────────────────
//  pages/api/cron-emails.js
//  GET /api/cron-emails  (вызывается Vercel Cron каждый час)
//  Отправляет письма из очереди email_queue
// ─────────────────────────────────────────────────────

import { supabaseAdmin } from '../../lib/supabase.js'
import { getEmailTemplate } from '../../lib/email.js'

export default async function handler(req, res) {
  // Защита от случайных вызовов
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = supabaseAdmin()
  const now = new Date().toISOString()

  // Берём pending письма у которых scheduled_for <= now
  const { data: queue, error } = await db
    .from('email_queue')
    .select('*, users(name, zodiac_sign, zodiac_emoji, planet)')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(50) // батчами по 50

  if (error) {
    console.error('Email queue fetch error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  if (!queue?.length) {
    return res.status(200).json({ sent: 0, message: 'Нет писем для отправки' })
  }

  let sent = 0
  let failed = 0

  for (const item of queue) {
    const user = item.users
    const template = getEmailTemplate(item.type, {
      name: user?.name || 'друг',
      zodiac: user?.zodiac_sign,
      emoji: user?.zodiac_emoji,
      planet: user?.planet,
    })

    try {
      // Отправляем через Supabase встроенный email или Resend
      // Для MVP используем Supabase Auth Admin email
      // В продакшне подключить Resend: resend.com (бесплатно 3000 писем/мес)
      const emailSent = await sendEmail({
        to: item.email,
        subject: template.subject,
        html: template.html,
      })

      if (emailSent) {
        await db.from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id)
        sent++
      } else {
        throw new Error('Email send returned false')
      }
    } catch (e) {
      console.error(`Failed to send email ${item.id}:`, e.message)
      await db.from('email_queue')
        .update({ status: 'failed' })
        .eq('id', item.id)
      failed++
    }
  }

  return res.status(200).json({ sent, failed, total: queue.length })
}

// ── Отправка письма ───────────────────────────────────
// MVP: через Resend (бесплатно 3000/мес, легко подключить)
// Добавь RESEND_API_KEY в .env.local
async function sendEmail({ to, subject, html }) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // В режиме разработки — просто логируем
    console.log(`[DEV EMAIL] To: ${to}\nSubject: ${subject}\n`)
    return true
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Найди своё <noreply@naidi-svoe.ru>',
      to: [to],
      subject,
      html,
    }),
  })

  return res.ok
}
