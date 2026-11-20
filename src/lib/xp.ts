export const RANKS: [string, string, number][] = [
  ['Селянин', '🌾', 0],
  ['Козак', '🐎', 100],
  ['Сотник', '🛡️', 300],
  ['Полковник', '🪶', 600],
  ['Гетьман', '🎖️', 1000],
]
export function rankOf(xp: number) {
  let i = 0
  RANKS.forEach((r, k) => {
    if (xp >= r[2]) i = k
  })
  const n = RANKS[i + 1]
  return {
    name: RANKS[i][0],
    icon: RANKS[i][1],
    p: n ? (xp - RANKS[i][2]) / (n[2] - RANKS[i][2]) : 1,
  }
}
