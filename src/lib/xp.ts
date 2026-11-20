export interface Rank {
  name: string
  icon: string
  from: number
}

export const RANKS: Rank[] = [
  { name: 'Селянин', icon: '🌾', from: 0 },
  { name: 'Козак', icon: '🐎', from: 100 },
  { name: 'Сотник', icon: '🛡️', from: 300 },
  { name: 'Полковник', icon: '🪶', from: 600 },
  { name: 'Гетьман', icon: '🎖️', from: 1000 },
]

/** Поточне звання і прогрес (0..1) до наступного */
export function rankOf(xp: number) {
  const i = RANKS.findLastIndex((r) => xp >= r.from)
  const cur = RANKS[i]
  const next = RANKS[i + 1]
  return { ...cur, next, progress: next ? (xp - cur.from) / (next.from - cur.from) : 1 }
}
