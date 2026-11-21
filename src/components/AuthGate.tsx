import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from '../lib/auth'
import { cloudStore, getSupabase, localStore } from '../lib/storage'
import { Login } from '../screens/Login'
import { Loading } from './Loading'
import { ProfileProvider } from './ProfileProvider'

type State =
  | { kind: 'loading' }
  | { kind: 'local' } // ключі Supabase не задані (розробка без .env.local)
  | { kind: 'signedOut'; sb: SupabaseClient }
  | { kind: 'signedIn'; sb: SupabaseClient; session: Session }

/** Пускає в застосунок лише після входу. Гостьового режиму немає. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let unsub: (() => void) | undefined
    let alive = true
    getSupabase().then(async (sb) => {
      if (!alive) return
      if (!sb) return setState({ kind: 'local' })
      const apply = (session: Session | null) =>
        setState(session ? { kind: 'signedIn', sb, session } : { kind: 'signedOut', sb })
      const { data } = await sb.auth.getSession()
      if (!alive) return
      apply(data.session)
      unsub = sb.auth.onAuthStateChange((_e, session) => apply(session)).data.subscription
        .unsubscribe
    })
    return () => {
      alive = false
      unsub?.()
    }
  }, [])

  const uid = state.kind === 'signedIn' ? state.session.user.id : null
  const sb = state.kind === 'signedIn' ? state.sb : null
  // Сховище створюється раз на користувача, а не на кожне оновлення токена
  const store = useMemo(() => (sb && uid ? cloudStore(sb, uid) : localStore), [sb, uid])

  if (state.kind === 'loading') return <Loading text="Перевіряємо вхід…" />
  if (state.kind === 'signedOut') return <Login sb={state.sb} />

  const auth =
    state.kind === 'signedIn'
      ? {
          email: state.session.user.email ?? null,
          signOut: async () => {
            await state.sb.auth.signOut()
          },
        }
      : { email: null, signOut: async () => {} }

  return (
    <AuthContext value={auth}>
      {/* key: інший користувач — свій профіль */}
      <ProfileProvider key={uid ?? 'local'} store={store}>
        {children}
      </ProfileProvider>
    </AuthContext>
  )
}
