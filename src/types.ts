export interface Profile {
  xp: number
  blitz: number
  snd: boolean
  anim: boolean
  big: boolean
}
export interface Opt {
  t: string
  note?: string
}
export interface Question {
  id: string
  topic: number
  q: string
  options: Opt[]
  answer: number
  short: string
  why: string
  mnemonic?: string
  section?: string
  status: 'draft' | 'verified'
}
export interface Section {
  id: string
  title: string
  body: string[]
  remember?: string
  check: string[]
}
export interface Topic {
  n: number
  title: string
}
export interface Api {
  p: Profile
  update: (f: (p: Profile) => Profile) => void
  award: (xp: number, itemId: string, game: string, correct: boolean) => void
}
