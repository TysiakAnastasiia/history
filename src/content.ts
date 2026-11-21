// Увесь контент підтягується автоматично: нова тема = нова папка content/hist-ua/topic-NN.
import {
  factsFile,
  funFactsFile,
  mapsFile,
  mediaFile,
  questionsFile,
  theoryFile,
  topicsFile,
  type MapLayer,
  type Media,
  type Question,
  type TopicPack,
} from './lib/schema'
import mediaJson from '../content/hist-ua/media.json'
import topicsJson from '../content/hist-ua/topics.json'

type Files = Record<string, unknown>
// Параметри glob мають бути записані прямо у виклику — Vite розбирає їх статично
const facts: Files = import.meta.glob('../content/hist-ua/topic-*/facts.json', {
  eager: true,
  import: 'default',
})
const fun: Files = import.meta.glob('../content/hist-ua/topic-*/fun.json', {
  eager: true,
  import: 'default',
})
const theory: Files = import.meta.glob('../content/hist-ua/topic-*/theory.json', {
  eager: true,
  import: 'default',
})
const questions: Files = import.meta.glob('../content/hist-ua/topic-*/questions.json', {
  eager: true,
  import: 'default',
})
const maps: Files = import.meta.glob('../content/hist-ua/topic-*/maps.json', {
  eager: true,
  import: 'default',
})

const dirOf = (path: string) => Number(/topic-(\d+)/.exec(path)![1])
const topicNumbers = [...new Set(Object.keys({ ...facts, ...theory, ...questions }).map(dirOf))]
const pick = (files: Files, n: number) =>
  Object.entries(files).find(([p]) => dirOf(p) === n)?.[1] ?? []

export const TOPICS = topicsFile.parse(topicsJson)

export const PACKS: Record<number, TopicPack> = Object.fromEntries(
  topicNumbers.map((n) => [
    n,
    {
      topic: n,
      facts: factsFile.parse(pick(facts, n)),
      funFacts: funFactsFile.parse(pick(fun, n)),
      theory: theoryFile.parse(pick(theory, n)),
      questions: questionsFile.parse(pick(questions, n)),
      maps: mapsFile.parse(pick(maps, n)),
    },
  ]),
)

export const QUESTIONS: Question[] = Object.values(PACKS).flatMap((p) => p.questions)
export const BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))
/** Зображення з авторами й ліцензіями (public/media/…) */
export const MEDIA: Record<string, Media> = Object.fromEntries(
  mediaFile.parse(mediaJson).map((m) => [m.id, m]),
)
/** Шари карт усіх тем */
export const MAPS: Record<string, MapLayer> = Object.fromEntries(
  Object.values(PACKS).flatMap((p) => p.maps.map((l) => [l.id, l])),
)

export const topicTitle = (n: number) => TOPICS.find((t) => t.n === n)?.title ?? `Тема ${n}`

export const FUN_FACTS = Object.values(PACKS).flatMap((p) =>
  p.funFacts.map((f) => ({ ...f, topic: p.topic })),
)

/** «Факт дня»: один і той самий упродовж доби, наступного дня — інший */
export function factOfDay(date = new Date()) {
  if (FUN_FACTS.length === 0) return null
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return FUN_FACTS[day % FUN_FACTS.length]
}
