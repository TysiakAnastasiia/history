import { createContext, use } from 'react'

export interface AuthApi {
  /**
   * cloud — увійшли, прогрес у хмарі;
   * guest — продовжили без входу, прогрес лише в цьому браузері;
   * local — ключі Supabase не задані (розробка без .env.local)
   */
  mode: 'cloud' | 'guest' | 'local'
  email: string | null
  signOut: () => Promise<void>
  /** з гостьового режиму — на екран входу */
  signIn: () => void
}

export const AuthContext = createContext<AuthApi>({
  mode: 'local',
  email: null,
  signOut: async () => {},
  signIn: () => {},
})

export const useAuth = () => use(AuthContext)

/** Куди Supabase повертає після входу: корінь сайту (локально чи на GitHub Pages) */
export const redirectUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`

/** «Продовжити без входу» запам’ятовується, щоб не питати щоразу */
const GUEST_FLAG = 'history-guest'
export const guestChosen = () => {
  try {
    return localStorage.getItem(GUEST_FLAG) === '1'
  } catch {
    return false
  }
}
export const setGuestChosen = (on: boolean) => {
  try {
    if (on) localStorage.setItem(GUEST_FLAG, '1')
    else localStorage.removeItem(GUEST_FLAG)
  } catch {
    /* немає доступу до сховища — просто не запам’ятаємо */
  }
}

/** Помилка, яку Supabase повернув в адресі після невдалого входу */
export let authRedirectError: string | null = null

/**
 * Після входу Supabase повертає токени в адресі після «#»: #access_token=…
 * HashRouter сприйняв би це як маршрут, тож до запуску застосунку
 * даємо Supabase забрати токени й прибираємо їх з адреси.
 */
export async function consumeAuthRedirect(getClient: () => Promise<unknown>) {
  const hash = window.location.hash
  if (!/access_token=|error_description=/.test(hash)) return
  const params = new URLSearchParams(hash.slice(1))
  authRedirectError = params.get('error_description')
  const sb = (await getClient()) as { auth: { getSession: () => Promise<unknown> } } | null
  if (sb) await sb.auth.getSession() // клієнт сам читає токени з адреси
  window.history.replaceState(null, '', `${window.location.pathname}#/`)
}
