import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '../types'

export const DEFAULT: Profile = { xp: 0, blitz: 0, snd: true, anim: true, big: false }

// Єдиний інтерфейс сховища: ігри не знають, де лежать дані.
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
      return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
    } catch {
      return DEFAULT
    }
  },
  async save(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p))
    } catch {
      /* ignore */
    }
  },
  async attempt() {
    /* локально історію спроб не ведемо */
  },
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export function cloudStore(uid: string): Store {
  const sb = supabase!
  return {
    mode: 'cloud',
    async load() {
      const { data } = await sb
        .from('profiles')
        .select('xp,blitz_record,settings')
        .eq('id', uid)
        .maybeSingle()
      if (!data) return DEFAULT
      return { ...DEFAULT, ...(data.settings || {}), xp: data.xp, blitz: data.blitz_record }
    },
    async save(p) {
      await sb.from('profiles').upsert({
        id: uid,
        xp: p.xp,
        blitz_record: p.blitz,
        settings: { snd: p.snd, anim: p.anim, big: p.big },
      })
    },
    async attempt(itemId, game, correct) {
      await sb.from('attempts').insert({ user_id: uid, item_id: itemId, game, correct })
    },
  }
}
