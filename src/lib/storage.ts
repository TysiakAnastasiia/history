import type { SupabaseClient } from '@supabase/supabase-js'

export type Theme = 'system' | 'light' | 'dark'

export interface Profile {
  xp: number
  /** рекорд бліцу */
  blitz: number
  /** найдовша серія правильних відповідей */
  bestStreak: number
  /** id прочитаних розділів теорії */
  read: string[]
  /** id питань, на які остання відповідь була неправильна (для «роботи над помилками») */
  mistakes: string[]
  sound: boolean
  animations: boolean
  bigText: boolean
  theme: Theme
}

export const DEFAULT_PROFILE: Profile = {
  xp: 0,
  blitz: 0,
  bestStreak: 0,
  read: [],
  mistakes: [],
  sound: true,
  animations: true,
  bigText: false,
  theme: 'system',
}

// Єдиний інтерфейс сховища: екрани не знають, де лежать дані.
export interface Store {
  mode: 'local' | 'cloud'
  load(): Promise<Profile>
  save(p: Profile): Promise<void>
  attempt(itemId: string, game: string, correct: boolean): Promise<void>
}

const KEY = 'history-profile'

export const localStore: Store = {
  mode: 'local',
  async load() {
    try {
      return { ...DEFAULT_PROFILE, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
    } catch {
      return DEFAULT_PROFILE
    }
  },
  async save(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p))
    } catch {
      /* приватний режим тощо: працюємо без збереження */
    }
  },
  async attempt() {
    /* локально історію спроб не ведемо */
  },
}

// ---- Хмара (етап 2: підключається після екрана входу) ----

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
let client: Promise<SupabaseClient | null> | null = null

/** Клієнт Supabase вантажиться лише коли потрібен (бібліотека важка). null — ключі не задані. */
export function getSupabase() {
  client ??=
    url && key
      ? import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key))
      : Promise.resolve(null)
  return client
}

export function cloudStore(sb: SupabaseClient, uid: string): Store {
  return {
    mode: 'cloud',
    async load() {
      const { data } = await sb
        .from('profiles')
        .select('xp,blitz_record,settings')
        .eq('id', uid)
        .maybeSingle()
      if (!data) return DEFAULT_PROFILE
      return { ...DEFAULT_PROFILE, ...(data.settings ?? {}), xp: data.xp, blitz: data.blitz_record }
    },
    async save(p) {
      const { xp, blitz, ...settings } = p
      await sb.from('profiles').upsert({
        id: uid,
        xp,
        blitz_record: blitz,
        settings,
        updated_at: new Date().toISOString(),
      })
    },
    async attempt(itemId, game, correct) {
      await sb.from('attempts').insert({ user_id: uid, item_id: itemId, game, correct })
    },
  }
}
