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
  /** підказки для гри «Хто я?» — від загальної до найконкретнішої (для персоналій) */
  hints: z.array(text).min(3).optional(),
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

/** Цитата для гри «Хто це сказав?» */
export const quoteSchema = z.object({
  id,
  text,
  /** хто сказав чи написав (ім’я або опис: «Древляни», «Автор «Слова о полку Ігоревім»») */
  author: text,
  /** пояснення: коли, кому й чому це сказано */
  context: text,
  source: text,
  status,
})

const lonLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])

/** «Подорож епохами»: сюжет епохи — персонажі, сцени на карті, бос */
const lookEnum = z.enum(['prince', 'elder', 'warrior', 'helmet', 'princess', 'monk', 'chronicler'])
const line = z.object({
  /** id персонажа з characters або 'guide' (кіт-провідник) */
  who: id,
  text,
})
export const journeySchema = z.object({
  title: text,
  /** межі карти епохи: [довгота мін, широта мін, довгота макс, широта макс] */
  view: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  intro: z.array(line).min(1),
  characters: z.record(
    id,
    z.object({
      name: text,
      role: text,
      /** зовнішність портрета */
      look: lookEnum,
      /** колір одягу (CSS) */
      color: z.string().optional(),
    }),
  ),
  scenes: z
    .array(
      z.object({
        id,
        place: text,
        year: z.union([z.number().int(), text]),
        at: lonLat,
        character: id,
        lines: z.array(line).min(1),
        /** запитання персонажа: варіанти відповіді з реакцією на кожен */
        ask: z.object({
          text,
          options: z
            .array(z.object({ text, correct: z.boolean().optional(), reply: text }))
            .min(2)
            .refine(
              (o) => o.filter((x) => x.correct).length === 1,
              'рівно один правильний варіант',
            ),
        }),
        outro: z.array(line).default([]),
        reward: z.object({ name: text, about: text, image: id.optional() }),
      }),
    )
    .min(1),
  boss: z.object({
    character: id,
    place: text,
    year: z.union([z.number().int(), text]),
    at: lonLat,
    intro: z.array(line).min(1),
    /** id питань формату НМТ */
    questions: z.array(id).min(3),
    /** скільки правильних, щоб перемогти */
    pass: z.number().int().min(1),
    win: z.array(line).min(1),
    lose: z.array(line).min(1),
  }),
})

/** Зображення з відкритих джерел; автор і ліцензія показуються під ним */
export const mediaSchema = z.object({
  id,
  /** файл у public/media/ */
  file: text,
  title: text,
  author: text,
  license: text,
  licenseUrl: z.string().url().optional(),
  /** сторінка файлу в джерелі (Вікісховище тощо) */
  source: z.string().url(),
})

/** Шар історичної карти: області (племена, князівства), маршрути (походи, шляхи), міста */
export const mapLayerSchema = z.object({
  id,
  title: text,
  description: text.optional(),
  /** межі показу: [довгота мін, широта мін, довгота макс, широта макс] */
  view: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  regions: z
    .array(
      z.object({
        id,
        name: text,
        note: text.optional(),
        /** де підписати; за замовчуванням — центр області */
        label: lonLat.optional(),
        points: z.array(lonLat).min(3),
      }),
    )
    .default([]),
  routes: z
    .array(
      z.object({
        id,
        name: text,
        note: text.optional(),
        points: z.array(lonLat).min(2),
        /** пунктир — морська частина чи повернення */
        dashed: z.boolean().optional(),
      }),
    )
    .default([]),
  cities: z
    .array(z.object({ name: text, at: lonLat, capital: z.boolean().optional() }))
    .default([]),
})

export const sectionSchema = z.object({
  id,
  title: text,
  body: z.array(text).min(1),
  remember: text.optional(),
  /** id питань для блоку «Перевір себе» */
  check: z.array(id),
  /** зображення пам’яток (id з media.json) */
  media: z.array(id).optional(),
  /** шари карти (id з maps.json) */
  maps: z.array(id).optional(),
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
  /** зображення до питання (id з media.json) */
  image: id.optional(),
  /** картосхема до питання: шар і що на ньому показати (без підписів) */
  map: z.object({ layer: id, show: z.array(id).min(1) }).optional(),
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
  questionBase.extend({
    /** «Покажіть на карті»: натиснути потрібну область шару */
    type: z.literal('mapPick'),
    layer: id,
    answer: id,
  }),
])

export const topicsFile = z.array(topicSchema)
export const factsFile = z.array(factSchema)
export const funFactsFile = z.array(funFactSchema)
export const theoryFile = z.array(sectionSchema)
export const questionsFile = z.array(questionSchema)
export const mediaFile = z.array(mediaSchema)
export const quotesFile = z.array(quoteSchema)
export const journeyFile = journeySchema.nullable()
export const mapsFile = z.array(mapLayerSchema)

export type Topic = z.infer<typeof topicSchema>
export type Fact = z.infer<typeof factSchema>
export type FunFact = z.infer<typeof funFactSchema>
export type Section = z.infer<typeof sectionSchema>
export type Question = z.infer<typeof questionSchema>
export type SingleQuestion = Extract<Question, { type: 'single' }>
export type Media = z.infer<typeof mediaSchema>
export type Quote = z.infer<typeof quoteSchema>
export type Journey = z.infer<typeof journeySchema>
export type Look = z.infer<typeof lookEnum>
export type MapLayer = z.infer<typeof mapLayerSchema>
export type LonLat = [number, number]

export interface TopicPack {
  topic: number
  facts: Fact[]
  funFacts: FunFact[]
  theory: Section[]
  questions: Question[]
  maps: MapLayer[]
  quotes: Quote[]
  journey: Journey | null
}

/** Перевірки, які не виражаються схемою: унікальні id і посилання між файлами. */
export function crossCheck(packs: TopicPack[], media: Media[] = []): string[] {
  const errors: string[] = []
  const seen = new Set<string>()
  const allFacts = new Set(packs.flatMap((p) => p.facts.map((f) => f.id)))
  const mediaIds = new Set(media.map((m) => m.id))
  const layers = new Map(packs.flatMap((p) => p.maps.map((l) => [l.id, l] as const)))
  const layerItems = (id: string) => {
    const l = layers.get(id)
    return l ? new Set([...l.regions, ...l.routes].map((x) => x.id)) : null
  }
  const unique = (where: string, x: string) => {
    if (seen.has(x)) errors.push(`${where}: повторюється id «${x}»`)
    seen.add(x)
  }
  media.forEach((m) => unique('media.json', m.id))
  for (const p of packs) {
    const where = `тема ${p.topic}`
    const qIds = new Set(p.questions.map((q) => q.id))
    const sIds = new Set(p.theory.map((s) => s.id))
    p.facts.forEach((f) => unique(where, f.id))
    p.funFacts.forEach((f) => unique(where, f.id))
    p.questions.forEach((q) => unique(where, q.id))
    p.quotes.forEach((q) => unique(where, q.id))
    p.maps.forEach((l) => unique(where, l.id))
    for (const l of p.maps) {
      const inner = new Set<string>()
      for (const x of [...l.regions, ...l.routes]) {
        if (inner.has(x.id)) errors.push(`${where}, карта ${l.id}: повторюється «${x.id}»`)
        inner.add(x.id)
      }
    }
    if (p.journey) {
      const j = p.journey
      const chars = new Set(Object.keys(j.characters))
      const who = (w: string) => w === 'guide' || chars.has(w)
      const lines = [
        ...j.intro,
        ...j.boss.intro,
        ...j.boss.win,
        ...j.boss.lose,
        ...j.scenes.flatMap((sc) => [...sc.lines, ...sc.outro]),
      ]
      for (const l of lines)
        if (!who(l.who)) errors.push(`${where}, journey: немає персонажа «${l.who}»`)
      for (const sc of j.scenes) {
        if (!chars.has(sc.character))
          errors.push(`${where}, journey ${sc.id}: немає персонажа «${sc.character}»`)
        if (sc.reward.image && !mediaIds.has(sc.reward.image))
          errors.push(`${where}, journey ${sc.id}: немає зображення «${sc.reward.image}»`)
      }
      if (!chars.has(j.boss.character))
        errors.push(`${where}, journey boss: немає персонажа «${j.boss.character}»`)
      for (const q of j.boss.questions)
        if (!qIds.has(q)) errors.push(`${where}, journey boss: немає питання «${q}»`)
      if (j.boss.pass > j.boss.questions.length)
        errors.push(`${where}, journey boss: pass більше за кількість питань`)
      const sids = j.scenes.map((sc) => sc.id)
      if (new Set(sids).size !== sids.length) errors.push(`${where}, journey: повторюються id сцен`)
    }
    for (const s of p.theory) {
      for (const c of s.check)
        if (!qIds.has(c)) errors.push(`${where}, розділ ${s.id}: немає питання «${c}»`)
      for (const m of s.media ?? [])
        if (!mediaIds.has(m)) errors.push(`${where}, розділ ${s.id}: немає зображення «${m}»`)
      for (const m of s.maps ?? [])
        if (!layers.has(m)) errors.push(`${where}, розділ ${s.id}: немає карти «${m}»`)
    }
    for (const q of p.questions) {
      if (q.topic !== p.topic) errors.push(`${where}, ${q.id}: topic = ${q.topic}`)
      if (q.section && !sIds.has(q.section))
        errors.push(`${where}, ${q.id}: немає розділу «${q.section}»`)
      for (const f of q.facts ?? [])
        if (!allFacts.has(f)) errors.push(`${where}, ${q.id}: немає факту «${f}»`)
      if (q.image && !mediaIds.has(q.image))
        errors.push(`${where}, ${q.id}: немає зображення «${q.image}»`)
      if (q.map) {
        const items = layerItems(q.map.layer)
        if (!items) errors.push(`${where}, ${q.id}: немає карти «${q.map.layer}»`)
        else
          for (const x of q.map.show)
            if (!items.has(x)) errors.push(`${where}, ${q.id}: на карті немає «${x}»`)
      }
      if (q.type === 'mapPick') {
        const l = layers.get(q.layer)
        if (!l) errors.push(`${where}, ${q.id}: немає карти «${q.layer}»`)
        else if (!l.regions.some((r) => r.id === q.answer))
          errors.push(`${where}, ${q.id}: на карті ${q.layer} немає області «${q.answer}»`)
      }
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
    if (!theory.includes(d.year.toLowerCase())) miss('дата', `${d.year} — ${d.text}`, 'в теорії')
    if (!questions.includes(d.year.toLowerCase()))
      miss('дата', `${d.year} — ${d.text}`, 'в питаннях')
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
