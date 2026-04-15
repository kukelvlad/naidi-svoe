// ─────────────────────────────────────────────────────
//  lib/moonphase.js  —  Фаза луны от USNO Navy (бесплатно, без ключа)
// ─────────────────────────────────────────────────────

export async function getMoonPhase(date = new Date()) {
  try {
    const yyyy = date.getFullYear()
    const mm   = String(date.getMonth() + 1).padStart(2, '0')
    const dd   = String(date.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    const url = `https://aa.usno.navy.mil/api/moon/phases/date?date=${dateStr}&nump=4`
    const res = await fetch(url, { next: { revalidate: 86400 } }) // кэш на сутки
    if (!res.ok) throw new Error('USNO API error')

    const data = await res.json()
    const phases = data.phasedata || []

    // Определяем текущую фазу по ближайшей первичной фазе
    const today = date.getTime()
    let closestPhase = null
    let minDiff = Infinity

    for (const p of phases) {
      const phaseDate = new Date(`${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`)
      const diff = Math.abs(phaseDate.getTime() - today)
      if (diff < minDiff) {
        minDiff = diff
        closestPhase = p
      }
    }

    if (!closestPhase) return getLocalMoonPhase(date)

    const daysDiff = (today - new Date(`${closestPhase.year}-${String(closestPhase.month).padStart(2,'0')}-${String(closestPhase.day).padStart(2,'0')}`).getTime()) / 86400000

    const phaseMap = {
      'New Moon':      { key: 'new',     ru: 'Новолуние',          icon: '🌑' },
      'First Quarter': { key: 'waxing',  ru: 'Растущая луна',      icon: '🌓' },
      'Full Moon':     { key: 'full',    ru: 'Полнолуние',          icon: '🌕' },
      'Last Quarter':  { key: 'waning',  ru: 'Убывающая луна',     icon: '🌗' },
    }

    const phase = phaseMap[closestPhase.phase] || { key: 'waxing', ru: 'Растущая луна', icon: '🌓' }

    // Уточняем: если прошло > 3 дней после фазы — промежуточная
    if (daysDiff > 3) {
      if (phase.key === 'new')    return { key: 'waxing', ru: 'Растущая луна',  icon: '🌒' }
      if (phase.key === 'full')   return { key: 'waning', ru: 'Убывающая луна', icon: '🌖' }
    }

    return phase
  } catch (e) {
    console.error('Moon phase fetch error:', e.message)
    return getLocalMoonPhase(date) // fallback к локальному расчёту
  }
}

// Локальный расчёт фазы луны как fallback
function getLocalMoonPhase(date = new Date()) {
  const known = new Date('2000-01-06T18:14:00Z') // известное новолуние
  const synodic = 29.53058867 // лунный месяц в днях
  const diff = (date.getTime() - known.getTime()) / 86400000
  const phase = ((diff % synodic) + synodic) % synodic

  if (phase < 1.85)  return { key: 'new',    ru: 'Новолуние',      icon: '🌑' }
  if (phase < 7.38)  return { key: 'waxing', ru: 'Растущая луна',  icon: '🌒' }
  if (phase < 9.22)  return { key: 'waxing', ru: 'Первая четверть',icon: '🌓' }
  if (phase < 14.77) return { key: 'waxing', ru: 'Растущая луна',  icon: '🌔' }
  if (phase < 16.61) return { key: 'full',   ru: 'Полнолуние',     icon: '🌕' }
  if (phase < 22.15) return { key: 'waning', ru: 'Убывающая луна', icon: '🌖' }
  if (phase < 23.99) return { key: 'waning', ru: 'Последняя четверть', icon: '🌗' }
  return { key: 'waning', ru: 'Убывающая луна', icon: '🌘' }
}
