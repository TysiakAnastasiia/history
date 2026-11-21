import { createContext, use } from 'react'

export interface AuthApi {
  /** пошта користувача; null — режим без Supabase (лише локально) */
  email: string | null
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthApi>({ email: null, signOut: async () => {} })

export const useAuth = () => use(AuthContext)

/** Куди Supabase повертає після входу: корінь сайту (локально чи на GitHub Pages) */
export const redirectUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`

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
