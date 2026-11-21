import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ProfileContext } from '../lib/profile'
import { Loading } from './Loading'
import { DEFAULT_PROFILE, localStore, type Profile, type Store } from '../lib/storage'

export function ProfileProvider({
  children,
  store = localStore,
}: {
  children: ReactNode
  store?: Store
}) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [loaded, setLoaded] = useState(false)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    store.load().then((p) => {
      setProfile(p)
      setLoaded(true)
    })
  }, [store])

  // Збереження з невеликою затримкою: кілька швидких змін — один запит до бази
  useEffect(() => {
    if (!loaded) return
    const t = setTimeout(() => void store.save(profile), 400)
    return () => clearTimeout(t)
  }, [profile, loaded, store])

  // Перед виходом з акаунта чи закриттям вкладки — зберегти останні зміни одразу
  const latest = useRef(profile)
  useEffect(() => {
    latest.current = profile
  }, [profile])
  useEffect(() => {
    const flush = () => loaded && void store.save(latest.current)
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [loaded, store])

  // Налаштування, що впливають на весь документ
  useEffect(() => {
    const html = document.documentElement
    if (profile.theme === 'system') delete html.dataset.theme
    else html.dataset.theme = profile.theme
    html.classList.toggle('big-text', profile.bigText)
  }, [profile.theme, profile.bigText])

  const update = useCallback((f: (p: Profile) => Profile) => setProfile(f), [])

  const answer = useCallback(
    (questionId: string, game: string, correct: boolean) => {
      const s = correct ? streak + 1 : 0
      const xp = correct ? 10 + Math.min(s - 1, 5) * 2 : 0
      setStreak(s)
      setProfile((p) => ({
        ...p,
        xp: p.xp + xp,
        bestStreak: Math.max(p.bestStreak, s),
        mistakes: correct
          ? p.mistakes.filter((m) => m !== questionId)
          : [...new Set([...p.mistakes, questionId])],
      }))
      void store.attempt(questionId, game, correct)
      return xp
    },
    [streak, store],
  )

  const value = useMemo(
    () => ({ profile, update, answer, streak }),
    [profile, update, answer, streak],
  )
  if (!loaded) return <Loading />
  return <ProfileContext value={value}>{children}</ProfileContext>
}
