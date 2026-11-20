import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ProfileContext } from '../lib/profile'
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

  useEffect(() => {
    if (loaded) void store.save(profile)
  }, [profile, loaded, store])

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
  return <ProfileContext value={value}>{children}</ProfileContext>
}
