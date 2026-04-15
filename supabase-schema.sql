-- ════════════════════════════════════════
--  naidi-svoe  —  Supabase SQL Schema
--  Выполни в SQL Editor на supabase.com
-- ════════════════════════════════════════

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fotostrana_id    VARCHAR(64) UNIQUE,           -- ID юзера с Фотостраны (когда подключим)
  email            VARCHAR(255) UNIQUE,           -- почта для напоминаний
  name             VARCHAR(100) NOT NULL,         -- имя из анкеты
  birth_date       DATE NOT NULL,                 -- дата рождения
  zodiac_sign      VARCHAR(30) NOT NULL,          -- знак зодиака
  zodiac_emoji     VARCHAR(4) NOT NULL,           -- эмодзи знака
  element          VARCHAR(20) NOT NULL,          -- стихия
  planet           VARCHAR(30) NOT NULL,          -- планета-покровитель
  num_life_path    INTEGER NOT NULL,              -- число жизненного пути (1-9)
  city             VARCHAR(100),                  -- город (опционально)
  hidden_cards     JSONB DEFAULT '[]'::jsonb,     -- скрытые карточки
  email_confirmed  BOOLEAN DEFAULT FALSE,         -- подтвердил ли почту
  reminders_on     BOOLEAN DEFAULT TRUE,          -- согласен получать напоминания
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица лога ежедневных открытий
CREATE TABLE IF NOT EXISTS daily_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  opened_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Таблица очереди email-напоминаний
CREATE TABLE IF NOT EXISTS email_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  email            VARCHAR(255) NOT NULL,
  type             VARCHAR(30) NOT NULL,          -- 'welcome' | 'daily_reminder' | 'reactivation'
  scheduled_for    TIMESTAMPTZ NOT NULL,
  sent_at          TIMESTAMPTZ,
  status           VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрых запросов
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_fotostrana_id  ON users(fotostrana_id);
CREATE INDEX IF NOT EXISTS idx_daily_log_user_date  ON daily_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_email_queue_status   ON email_queue(status, scheduled_for);

-- RLS: разрешаем сервисному ключу всё, анонимному — только вставку
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Политика: service_role обходит RLS автоматически
-- Политика для anon: может создать юзера и читать по id
CREATE POLICY "anon can insert user"
  ON users FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon can read own user by id"
  ON users FOR SELECT TO anon
  USING (true);

CREATE POLICY "anon can update own user"
  ON users FOR UPDATE TO anon
  USING (true);

CREATE POLICY "service can all on daily_log"
  ON daily_log FOR ALL TO service_role
  USING (true);

CREATE POLICY "anon can insert daily_log"
  ON daily_log FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "anon can read daily_log"
  ON daily_log FOR SELECT TO anon
  USING (true);

CREATE POLICY "service can all on email_queue"
  ON email_queue FOR ALL TO service_role
  USING (true);

CREATE POLICY "anon can insert email_queue"
  ON email_queue FOR INSERT TO anon
  WITH CHECK (true);
