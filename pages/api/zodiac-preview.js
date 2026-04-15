import { getZodiac, getLifePathNumber } from '../../lib/astro.js'

export default function handler(req, res) {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date required' })
  const zodiac = getZodiac(date)
  const lifePathNumber = getLifePathNumber(date)
  return res.status(200).json({
    name: zodiac.name,
    emoji: zodiac.emoji,
    element: zodiac.element,
    planet: zodiac.planet,
    lifePathNumber,
  })
}
