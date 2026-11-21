// Генератор кросворду: жадібно розставляє слова з перетинами, кілька спроб — бере найкращу.
import { shuffle } from '../lib/util'

export interface Entry {
  word: string // великими літерами, без пробілів
  clue: string
}

export interface Placed extends Entry {
  row: number
  col: number
  dir: 'across' | 'down'
  num: number
}

export interface Crossword {
  rows: number
  cols: number
  words: Placed[]
}

/** Межі, у які сітка добре вміщається на телефоні */
const MAX_COLS = 13
const MAX_ROWS = 15

type Grid = Map<string, string>
const key = (r: number, c: number) => `${r},${c}`

function canPlace(grid: Grid, w: string, r: number, c: number, dir: 'across' | 'down') {
  const dr = dir === 'down' ? 1 : 0
  const dc = dir === 'across' ? 1 : 0
  // клітинки перед і після слова мають бути порожні
  if (grid.has(key(r - dr, c - dc)) || grid.has(key(r + dr * w.length, c + dc * w.length)))
    return -1
  let crossings = 0
  for (let i = 0; i < w.length; i++) {
    const rr = r + dr * i
    const cc = c + dc * i
    const cur = grid.get(key(rr, cc))
    if (cur) {
      if (cur !== w[i]) return -1
      crossings++
    } else {
      // нова літера не повинна торкатися сусідніх слів збоку
      if (grid.has(key(rr + dc, cc + dr)) || grid.has(key(rr - dc, cc - dr))) return -1
    }
  }
  return crossings
}

function attempt(entries: Entry[], target: number): Omit<Placed, 'num'>[] {
  const grid: Grid = new Map()
  const placed: Omit<Placed, 'num'>[] = []
  const put = (e: Entry, r: number, c: number, dir: 'across' | 'down') => {
    for (let i = 0; i < e.word.length; i++)
      grid.set(key(r + (dir === 'down' ? i : 0), c + (dir === 'across' ? i : 0)), e.word[i])
    placed.push({ ...e, row: r, col: c, dir })
  }
  const [first, ...rest] = entries
  put(first, 0, 0, 'across')
  for (const e of rest) {
    if (placed.length >= target) break
    let best: { r: number; c: number; dir: 'across' | 'down'; score: number } | null = null
    for (const p of placed) {
      for (let i = 0; i < p.word.length; i++) {
        for (let j = 0; j < e.word.length; j++) {
          if (p.word[i] !== e.word[j]) continue
          const dir = p.dir === 'across' ? 'down' : 'across'
          const pr = p.row + (p.dir === 'down' ? i : 0)
          const pc = p.col + (p.dir === 'across' ? i : 0)
          const r = pr - (dir === 'down' ? j : 0)
          const c = pc - (dir === 'across' ? j : 0)
          const score = canPlace(grid, e.word, r, c, dir)
          if (score > 0 && (!best || score > best.score + Math.random() - 0.5))
            best = { r, c, dir, score }
        }
      }
    }
    if (best) put(e, best.r, best.c, best.dir)
  }
  return placed
}

/** Кросворд із приблизно target слів (якщо стільки вдасться розставити) */
export function generate(pool: Entry[], target = 10, tries = 80): Crossword | null {
  let best: Omit<Placed, 'num'>[] = []
  let bestScore = -Infinity
  for (let t = 0; t < tries; t++) {
    const entries = shuffle(pool).sort(
      (a, b) => b.word.length - a.word.length + (Math.random() - 0.5) * 6,
    )
    const placed = attempt(entries, target)
    const minR = Math.min(...placed.map((p) => p.row))
    const minC = Math.min(...placed.map((p) => p.col))
    const rows =
      Math.max(...placed.map((p) => p.row + (p.dir === 'down' ? p.word.length : 1))) - minR
    const cols =
      Math.max(...placed.map((p) => p.col + (p.dir === 'across' ? p.word.length : 1))) - minC
    // більше слів — краще, але сітка має вміщатися на телефоні: широкі й великі сітки штрафуємо
    const score =
      placed.length * 40 -
      rows * cols * 0.6 -
      Math.max(0, cols - MAX_COLS) * 60 -
      Math.max(0, rows - MAX_ROWS) * 20
    if (score > bestScore) {
      best = placed
      bestScore = score
    }
  }
  if (best.length < 4) return null

  // зсуваємо в нуль і нумеруємо клітинки-початки, як у звичайних кросвордах
  const minR = Math.min(...best.map((p) => p.row))
  const minC = Math.min(...best.map((p) => p.col))
  const shifted = best.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }))
  const starts = [...new Set(shifted.map((p) => key(p.row, p.col)))]
    .map((k) => k.split(',').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const numOf = new Map(starts.map(([r, c], i) => [key(r, c), i + 1]))
  const words = shifted.map((p) => ({ ...p, num: numOf.get(key(p.row, p.col))! }))
  return {
    rows: Math.max(...words.map((p) => p.row + (p.dir === 'down' ? p.word.length : 1))),
    cols: Math.max(...words.map((p) => p.col + (p.dir === 'across' ? p.word.length : 1))),
    words,
  }
}

/** Клітинки слова */
export const cellsOf = (w: Placed) =>
  [...w.word].map(
    (_, i) => [w.row + (w.dir === 'down' ? i : 0), w.col + (w.dir === 'across' ? i : 0)] as const,
  )
