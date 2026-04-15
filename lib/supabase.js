import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Клиент для браузера (anon key)
export const supabase = createClient(url, anonKey)

// Клиент для серверных запросов (service role — обходит RLS)
export const supabaseAdmin = () => createClient(url, serviceKey)
