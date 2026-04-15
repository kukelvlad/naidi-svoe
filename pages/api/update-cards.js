// ─────────────────────────────────────────────────────
//  pages/api/update-cards.js
//  POST /api/update-cards
//  Сохраняет настройки видимости карточек
// ─────────────────────────────────────────────────────

import { supabaseAdmin } from '../../lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, hiddenCards } = req.body

  if (!userId || !Array.isArray(hiddenCards)) {
    return res.status(400).json({ error: 'userId и hiddenCards (array) обязательны' })
  }

  const db = supabaseAdmin()
  const { error } = await db
    .from('users')
    .update({ hidden_cards: hiddenCards })
    .eq('id', userId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ ok: true, hidden_cards: hiddenCards })
}
