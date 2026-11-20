// Єдина схема контенту. Звідси ж виводяться TypeScript-типи.
// Файл не має залежностей від Vite, тому його використовує і скрипт перевірки (scripts/validate-content.ts).
import { z } from 'zod'

const id = z.string().min(1)
const text = z.string().trim().min(1)
const status = z.enum(['draft', 'verified'])

export const topicSchema = z.object({
  n: z.number().int().min(1).max(32),
  title: text,
})

/** Факт зберігається один раз; на нього посилаються теорія, питання та ігри. */
export const factSchema = z.object({
  id,
  kind: z.enum(['event', 'person', 'term', 'place', 'monument']),
  year: z.number().int().optional(),
  title: text,
  details: text.optional(),
  source: text,
  status,
})

/** Цікавий факт: не входить до екзаменаційних питань. */
export const funFactSchema = z.object({
  id,
  text,
  source: text,
  status,
})

export const sectionSchema = z.object({
  id,
  title: text,
  body: z.array(text).min(1),
  remember: text.optional(),
  /** id питань для блоку «Перевір себе» */
  check: z.array(id),
})

const option = z.object({
  text,
  /** чому цей варіант неправильний (для неправильних варіантів) */
  note: text.optional(),
})

const questionBase = z.object({
  id,
  topic: z.number().int().min(1).max(32),
  /** розділ теорії для «Читати далі» */
  section: id.optional(),
  facts: z.array(id).optional(),
  status,
  prompt: text,
  /** «Коротко» */
  short: text,
  /** «Чому так» */
  why: text,
  /** «Як запам'ятати» */
  mnemonic: text.optional(),
})

const index = z.number().int().min(0)

export const questionSchema = z.discriminatedUnion('type', [
  questionBase.extend({
    type: z.literal('single'),
    options: z.array(option).length(4),
    answer: index.max(3),
  }),
  questionBase.extend({
    type: z.literal('multi3of7'),
    options: z.array(option).length(7),
    answer: z.array(index.max(6)).length(3),
  }),
  questionBase.extend({
    type: z.literal('matching'),
    left: z.array(text).length(4),
    right: z.array(text).length(5),
    /** answer[i] — індекс у right для left[i] */
    answer: z.array(index.max(4)).length(4),
  }),
  questionBase.extend({
    type: z.literal('sequence'),
    items: z.array(text).length(4),
    /** правильний порядок: індекси items */
    answer: z.array(index.max(3)).length(4),
  }),
])

export const topicsFile = z.array(topicSchema)
export const factsFile = z.array(factSchema)
export const funFactsFile = z.array(funFactSchema)
export const theoryFile = z.array(sectionSchema)
export const questionsFile = z.array(questionSchema)

export type Topic = z.infer<typeof topicSchema>
export type Fact = z.infer<typeof factSchema>
export type FunFact = z.infer<typeof funFactSchema>
export type Section = z.infer<typeof sectionSchema>
export type Question = z.infer<typeof questionSchema>
export type SingleQuestion = Extract<Question, { type: 'single' }>

export interface TopicPack {
  topic: number
  facts: Fact[]
  funFacts: FunFact[]
  theory: Section[]
  questions: Question[]
}

/** Перевірки, які не виражаються схемою: унікальні id і посилання між файлами. */
export function crossCheck(packs: TopicPack[]): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  const allFacts = new Set(packs.flatMap((p) => p.facts.map((f) => f.id)))
  const unique = (where: string, x: string) => {
    if (seen.has(x)) errors.push(`${where}: повторюється id «${x}»`)
    seen.add(x)
  }
  for (const p of packs) {
    const where = `тема ${p.topic}`
    const qIds = new Set(p.questions.map((q) => q.id))
    const sIds = new Set(p.theory.map((s) => s.id))
    p.facts.forEach((f) => unique(where, f.id))
    p.funFacts.forEach((f) => unique(where, f.id))
    p.questions.forEach((q) => unique(where, q.id))
    for (const s of p.theory) {
      for (const c of s.check)
        if (!qIds.has(c)) errors.push(`${where}, розділ ${s.id}: немає питання «${c}»`)
    }
    for (const q of p.questions) {
      if (q.topic !== p.topic) errors.push(`${where}, ${q.id}: topic = ${q.topic}`)
      if (q.section && !sIds.has(q.section))
        errors.push(`${where}, ${q.id}: немає розділу «${q.section}»`)
      for (const f of q.facts ?? [])
        if (!allFacts.has(f)) errors.push(`${where}, ${q.id}: немає факту «${f}»`)
      if (Array.isArray(q.answer) && new Set(q.answer).size !== q.answer.length)
        errors.push(`${where}, ${q.id}: у відповіді повторюються індекси`)
      if (q.type === 'single' || q.type === 'multi3of7') {
        const right = Array.isArray(q.answer) ? q.answer : [q.answer]
        q.options.forEach((o, k) => {
          if (!right.includes(k) && !o.note)
            errors.push(`${where}, ${q.id}: варіант ${k + 1} без пояснення (note)`)
        })
      }
    }
  }
  return errors
}

/** Вимоги програми до теми: за ними validate перевіряє, що все покрито теорією й питаннями */
const programItem = z.object({
  name: text,
  /** фрагменти, за якими шукати в тексті (за замовчуванням — name) */
  match: z.array(text).optional(),
})
export const programFile = z.object({
  source: text,
  dates: z.array(z.object({ year: text, text })),
  persons: z.array(programItem),
  terms: z.array(programItem),
  monuments: z.array(programItem),
  map: z.array(programItem),
})
export type Program = z.infer<typeof programFile>

/** Що з програми не покрито: дати, діячі, терміни, пам’ятки — і в теорії, і в питаннях; карта — у теорії */
export function coverageCheck(topic: number, program: Program, pack: TopicPack): string[] {
  const lower = (x: unknown) => JSON.stringify(x).toLowerCase()
  const theory = lower(pack.theory)
  const questions = lower(pack.questions)
  const has = (hay: string, item: { name: string; match?: string[] }) =>
    (item.match ?? [item.name]).some((m) => hay.includes(m.toLowerCase()))
  const errors: string[] = []
  const miss = (kind: string, name: string, where: string) =>
    errors.push(`тема ${topic}: ${kind} «${name}» не покрито ${where}`)
  for (const d of program.dates) {
    if (!theory.includes(d.year)) miss('дата', `${d.year} — ${d.text}`, 'в теорії')
    if (!questions.includes(d.year)) miss('дата', `${d.year} — ${d.text}`, 'в питаннях')
  }
  const groups = [
    ['персоналія', program.persons],
    ['термін', program.terms],
    ['пам’ятка', program.monuments],
  ] as const
  for (const [kind, items] of groups) {
    for (const it of items) {
      if (!has(theory, it)) miss(kind, it.name, 'в теорії')
      if (!has(questions, it)) miss(kind, it.name, 'в питаннях')
    }
  }
  for (const it of program.map) if (!has(theory, it)) miss('картосхема', it.name, 'в теорії')
  return errors
}
