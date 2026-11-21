import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, guestChosen, setGuestChosen, type AuthApi } from '../lib/auth'
import { cloudStore, getSupabase, localStore } from '../lib/storage'
import { Login } from '../screens/Login'
import { Loading } from './Loading'
import { ProfileProvider } from './ProfileProvider'

type State =
  | { kind: 'loading' }
  | { kind: 'local' } // ключі Supabase не задані (розробка без .env.local)
  | { kind: 'signedOut'; sb: SupabaseClient }
  | { kind: 'signedIn'; sb: SupabaseClient; session: Session }

/** Екран входу, доки людина не ввійде або не вирішить продовжити без входу */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [guest, setGuest] = useState(guestChosen)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let alive = true
    getSupabase().then(async (sb) => {
      if (!alive) return
      if (!sb) return setState({ kind: 'local' })
      const apply = (session: Session | null) => {
        if (session) {
          // увійшли — гостьовий режим більше не потрібен
          setGuestChosen(false)
          setGuest(false)
        }
        setState(session ? { kind: 'signedIn', sb, session } : { kind: 'signedOut', sb })
      }
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
  if (state.kind === 'signedOut' && !guest)
    return (
      <Login
        sb={state.sb}
        onGuest={() => {
          setGuestChosen(true)
          setGuest(true)
        }}
      />
    )

  const auth: AuthApi =
    state.kind === 'signedIn'
      ? {
          mode: 'cloud',
          email: state.session.user.email ?? null,
          signOut: async () => {
            await state.sb.auth.signOut()
          },
          signIn: () => {},
        }
      : {
          mode: state.kind === 'local' ? 'local' : 'guest',
          email: null,
          signOut: async () => {},
          signIn: () => {
            setGuestChosen(false)
            setGuest(false)
          },
        }

  return (
    <AuthContext value={auth}>
      {/* key: інший користувач — свій профіль */}
      <ProfileProvider key={uid ?? 'guest'} store={store}>
        {children}
      </ProfileProvider>
    </AuthContext>
  )
}
