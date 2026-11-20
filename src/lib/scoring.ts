// Нарахування балів за правилами НМТ-2026 (Загальна характеристика, testportal.gov.ua)
import type { Question } from './schema'

/**
 * Відповідь користувача:
 * - single: індекс варіанта
 * - multi3of7: вибрані індекси
 * - matching: для кожного рядка 1–4 індекс букви (null — не вибрано)
 * - sequence: індекси items у вибраному порядку
 */
export type Response = number | (number | null)[] | null

export function maxPoints(q: Question): number {
  switch (q.type) {
    case 'single':
      return 1
    case 'matching':
      return 4
    case 'sequence':
    case 'multi3of7':
      return 3
  }
}

export function score(q: Question, r: Response): number {
  if (r === null) return 0
  switch (q.type) {
    case 'single':
      return r === q.answer ? 1 : 0
    case 'multi3of7': {
      // 1 бал за кожен правильний варіант; вибрати можна не більше трьох
      const picked = (r as number[]).slice(0, 3)
      return picked.filter((k) => q.answer.includes(k)).length
    }
    case 'matching':
      return q.answer.filter((a, i) => (r as (number | null)[])[i] === a).length
    case 'sequence': {
      const s = r as number[]
      if (s.length !== 4) return 0
      if (s.every((x, i) => x === q.answer[i])) return 3
      const first = s[0] === q.answer[0]
      const last = s[3] === q.answer[3]
      return first && last ? 2 : first || last ? 1 : 0
    }
  }
}

/** Чи достатньо відповіді, щоб її перевіряти */
export function isComplete(q: Question, r: Response): boolean {
  if (r === null) return false
  switch (q.type) {
    case 'single':
      return typeof r === 'number'
    case 'multi3of7':
      return (r as number[]).length === 3
    case 'matching':
      return (r as (number | null)[]).every((x) => x !== null)
    case 'sequence':
      return (r as number[]).length === 4
  }
}

export const TYPE_LABEL: Record<Question['type'], string> = {
  single: 'Одна правильна відповідь',
  matching: 'Установіть відповідність',
  sequence: 'Установіть послідовність',
  multi3of7: 'Три правильні відповіді із семи',
}

export const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Є']

/** Порядок показу: варіанти перемішуються; у відповідності порядок фіксований (букви А–Д) */
export function displayOrder(q: Question, shuffle: (a: number[]) => number[]): number[] {
  switch (q.type) {
    case 'single':
    case 'multi3of7':
      return shuffle(q.options.map((_, k) => k))
    case 'sequence':
      return shuffle(q.items.map((_, k) => k))
    case 'matching':
      return [0, 1, 2, 3]
  }
}
