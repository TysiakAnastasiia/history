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
  /** обрані цікаві факти */
  favorites: string[]
  /** найкращий результат пробного НМТ, у балах */
  examBest: number
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
  favorites: [],
  examBest: 0,
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

// ---- Локальне сховище браузера ----

/** Прогрес без входу (до появи акаунтів і в режимі без ключів Supabase) */
const GUEST_KEY = 'history-profile'
/** Офлайн-кеш конкретного користувача */
const cacheKey = (uid: string) => `history-profile:${uid}`

function readLocal(key: string): Profile | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

function writeLocal(key: string, p: Profile) {
  try {
    localStorage.setItem(key, JSON.stringify(p))
  } catch {
    /* приватний режим тощо: працюємо без збереження */
  }
}

/** Режим розробки без ключів Supabase: усе лише в браузері */
export const localStore: Store = {
  mode: 'local',
  async load() {
    return readLocal(GUEST_KEY) ?? DEFAULT_PROFILE
  },
  async save(p) {
    writeLocal(GUEST_KEY, p)
  },
  async attempt() {
    /* локально історію спроб не ведемо */
  },
}

// ---- Хмара (Supabase) ----

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

const diff = (now: string[], before: string[]) => ({
  added: now.filter((x) => !before.includes(x)),
  removed: before.filter((x) => !now.includes(x)),
})

/**
 * Хмарне сховище. Джерело правди — база даних:
 * profiles (XP, рекорди, налаштування), lesson_progress (прочитані розділи), favorites (обрані факти).
 * Локальна копія — лише кеш для офлайн-доступу.
 */
export function cloudStore(sb: SupabaseClient, uid: string): Store {
  // Що вже лежить у базі: від цього рахуємо, які рядки додати чи видалити
  let synced: Pick<Profile, 'read' | 'favorites'> = { read: [], favorites: [] }
  // Прогрес без входу переноситься лише один раз, у перший акаунт
  let migrating = false

  return {
    mode: 'cloud',

    async load() {
      try {
        const [prof, read, fav] = await Promise.all([
          sb.from('profiles').select('xp,blitz_record,settings').eq('id', uid).maybeSingle(),
          sb.from('lesson_progress').select('section_id').eq('user_id', uid),
          sb.from('favorites').select('fact_id').eq('user_id', uid),
        ])
        if (prof.error || read.error || fav.error) throw prof.error ?? read.error ?? fav.error

        if (!prof.data) {
          // Перший вхід: переносимо в хмару прогрес, накопичений у браузері без входу
          synced = { read: [], favorites: [] }
          const guest = readLocal(GUEST_KEY)
          migrating = guest !== null
          return guest ?? DEFAULT_PROFILE
        }
        const p: Profile = {
          ...DEFAULT_PROFILE,
          ...(prof.data.settings ?? {}),
          xp: prof.data.xp,
          blitz: prof.data.blitz_record,
          read: read.data.map((r) => r.section_id as string),
          favorites: fav.data.map((f) => f.fact_id as string),
        }
        synced = { read: p.read, favorites: p.favorites }
        writeLocal(cacheKey(uid), p)
        return p
      } catch {
        // Немає інтернету: показуємо останню збережену копію
        const cached = readLocal(cacheKey(uid))
        if (cached) synced = { read: cached.read, favorites: cached.favorites }
        return cached ?? DEFAULT_PROFILE
      }
    },

    async save(p) {
      writeLocal(cacheKey(uid), p)
      // read і favorites — в окремих таблицях; у settings зберігаємо решту
      const { xp, blitz, read: _r, favorites: _f, ...settings } = p
      void _r
      void _f
      const res = await sb.from('profiles').upsert({
        id: uid,
        xp,
        blitz_record: blitz,
        settings,
        updated_at: new Date().toISOString(),
      })
      if (res.error) return // офлайн: спробуємо під час наступного збереження

      const r = diff(p.read, synced.read)
      const f = diff(p.favorites, synced.favorites)
      const ops = await Promise.all([
        r.added.length &&
          sb.from('lesson_progress').upsert(
            r.added.map((section_id) => ({ user_id: uid, section_id })),
            {
              ignoreDuplicates: true,
            },
          ),
        r.removed.length &&
          sb.from('lesson_progress').delete().eq('user_id', uid).in('section_id', r.removed),
        f.added.length &&
          sb.from('favorites').upsert(
            f.added.map((fact_id) => ({ user_id: uid, fact_id })),
            {
              ignoreDuplicates: true,
            },
          ),
        f.removed.length &&
          sb.from('favorites').delete().eq('user_id', uid).in('fact_id', f.removed),
      ])
      if (ops.every((o) => !o || !o.error)) {
        synced = { read: p.read, favorites: p.favorites }
        if (migrating) {
          migrating = false
          try {
            localStorage.removeItem(GUEST_KEY)
          } catch {
            /* немає доступу до сховища — не страшно */
          }
        }
      }
    },

    async attempt(itemId, game, correct) {
      await sb.from('attempts').insert({ user_id: uid, item_id: itemId, game, correct })
    },
  }
}
