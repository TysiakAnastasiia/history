// Спільні помічники для ігор, що будуються на довіднику фактів.
import type { Fact } from '../lib/schema'
import { shuffle } from '../lib/util'

/** Назва події без років у дужках, щоб вона не підказувала відповідь */
export const noYears = (title: string) =>
  title
    .replace(/\s*\([^)]*\d{3,4}[^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

/** Події з роками, де після прибирання дужок у тексті не лишилося дат */
export const playableEvent = (f: Fact) =>
  f.kind === 'event' && !!f.year && !/\d{3,4}/.test(noYears(f.title))

/** Випадкові події з різними роками (по одній на рік, щоб відповіді не були двозначними) */
export function eventsWithDistinctYears(facts: Fact[]): Fact[] {
  const byYear = new Map<number, Fact>()
  for (const f of shuffle(facts.filter(playableEvent)))
    if (!byYear.has(f.year!)) byYear.set(f.year!, f)
  return shuffle([...byYear.values()])
}
