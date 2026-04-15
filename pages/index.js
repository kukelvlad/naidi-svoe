import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const STEPS = { LOADING: 'loading', REGISTER: 'register', RECS: 'recs' }

export default function Home() {
  const [step, setStep] = useState(STEPS.LOADING)
  const [user, setUser] = useState(null)
  const [recs, setRecs] = useState(null)
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState({ name: '', birth_date: '', email: '' })
  const [zodiacPreview, setZodiacPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [hiddenCards, setHiddenCards] = useState([])

  // Проверяем localStorage на наличие userId
  useEffect(() => {
    const savedId = localStorage.getItem('naidi_user_id')
    if (savedId) {
      loadRecommendations(savedId)
    } else {
      setStep(STEPS.REGISTER)
    }
  }, [])

  // Предпросмотр знака зодиака при вводе даты
  useEffect(() => {
    if (form.birth_date) {
      fetch(`/api/zodiac-preview?date=${form.birth_date}`)
        .then(r => r.json())
        .then(d => setZodiacPreview(d))
        .catch(() => {})
    }
  }, [form.birth_date])

  async function loadRecommendations(userId) {
    setStep(STEPS.LOADING)
    try {
      const res = await fetch(`/api/recommendations?userId=${userId}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      setUser(data.user)
      setRecs(data.cards)
      setMeta(data.meta)
      setHiddenCards(data.user?.hidden_cards || [])
      setStep(STEPS.RECS)
    } catch {
      localStorage.removeItem('naidi_user_id')
      setStep(STEPS.REGISTER)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка регистрации')
      localStorage.setItem('naidi_user_id', data.user.id)
      setUser(data.user)
      loadRecommendations(data.user.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleCard(cardId) {
    const newHidden = hiddenCards.includes(cardId)
      ? hiddenCards.filter(id => id !== cardId)
      : [...hiddenCards, cardId]
    setHiddenCards(newHidden)
    await fetch('/api/update-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, hiddenCards: newHidden }),
    })
  }

  const today = new Date().toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long' })

  // ── LOADING ───────────────────────────────────────────
  if (step === STEPS.LOADING) return (
    <div className={styles.loading}>
      <div className={styles.loadingIcon}>✦</div>
      <p>Загружаем твои открытия…</p>
    </div>
  )

  // ── REGISTER ──────────────────────────────────────────
  if (step === STEPS.REGISTER) return (
    <>
      <Head><title>Найди своё — регистрация</title></Head>
      <div className={styles.registerWrap}>
        <div className={styles.registerBox}>
          <div className={styles.registerIcon}>🌟</div>
          <h1>Найди своё</h1>
          <p className={styles.registerSub}>
            Персональные открытия каждый день — по дате рождения, знаку зодиака и нумерологии
          </p>

          <form onSubmit={handleRegister}>
            <div className={styles.field}>
              <label>Твоё имя</label>
              <input
                type="text" placeholder="Например, Наталья" required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label>Дата рождения</label>
              <input
                type="date" required
                value={form.birth_date}
                onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
              />
            </div>

            {zodiacPreview && (
              <div className={styles.zodiacPill}>
                <span className={styles.zodiacEmoji}>{zodiacPreview.emoji}</span>
                <div>
                  <strong>{zodiacPreview.name} · {zodiacPreview.element} · {zodiacPreview.planet}</strong>
                  <small>Число жизни: {zodiacPreview.lifePathNumber}</small>
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label>Email <span className={styles.optional}>(необязательно)</span></label>
              <input
                type="email" placeholder="Для ежедневных напоминаний в 8:00"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
              <small className={styles.fieldHint}>
                Каждое утро будем присылать напоминание что рекомендации готовы
              </small>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Создаём…' : 'Получить мои рекомендации →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )

  // ── RECOMMENDATIONS ───────────────────────────────────
  return (
    <>
      <Head><title>Найди своё — {user?.name}</title></Head>
      <div className={styles.recsWrap}>

        {/* Header */}
        <div className={styles.recsHeader}>
          <div className={styles.recsHeaderTop}>
            <h2>🌅 Доброе утро, {user?.name}!</h2>
            <span className={styles.dateChip}>{today}</span>
          </div>
          {meta && (
            <div className={styles.metaBar}>
              <span>{user?.zodiac_emoji} {user?.zodiac_sign}</span>
              <span>·</span>
              <span>{meta.moon?.icon} {meta.moon?.ru}</span>
              <span>·</span>
              <span>🪐 {meta.planet_of_day?.ru}</span>
              <span>·</span>
              <span>#{meta.day_number} {meta.day_theme?.word}</span>
            </div>
          )}
          <p className={styles.recsHint}>
            Нажми ✓ на карточке чтобы скрыть её в следующий раз
          </p>
        </div>

        {/* Cards */}
        <div className={styles.cardsList}>
          {recs?.map(card => {
            const isHidden = hiddenCards.includes(card.id)
            return (
              <div key={card.id} className={`${styles.card} ${isHidden ? styles.cardHidden : ''}`}>
                <div className={styles.cardEmoji}>{card.emoji}</div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{card.title}</div>
                  <div className={styles.cardText}>{card.text}</div>
                  <div className={styles.cardSource}>{card.source}</div>
                </div>
                <button
                  className={`${styles.cardToggle} ${isHidden ? '' : styles.cardToggleActive}`}
                  onClick={() => toggleCard(card.id)}
                  title={isHidden ? 'Показывать' : 'Скрыть'}
                >
                  {isHidden ? '✕' : '✓'}
                </button>
              </div>
            )
          })}
        </div>

        {hiddenCards.length > 0 && (
          <p className={styles.hiddenNote}>
            Скрыто карточек: {hiddenCards.length} · Они не будут показываться завтра
          </p>
        )}
      </div>
    </>
  )
}
