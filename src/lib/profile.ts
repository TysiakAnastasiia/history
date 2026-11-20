import { createContext, use } from 'react'
import type { Profile } from './storage'

export interface ProfileApi {
  profile: Profile
  update: (f: (p: Profile) => Profile) => void
  /** зарахувати відповідь: XP, серія, помилки; повертає нараховані XP */
  answer: (questionId: string, game: string, correct: boolean) => number
  /** поточна серія правильних відповідей */
  streak: number
}

export const ProfileContext = createContext<ProfileApi | null>(null)

export function useProfile() {
  const v = use(ProfileContext)
  if (!v) throw new Error('useProfile поза ProfileProvider')
  return v
}
