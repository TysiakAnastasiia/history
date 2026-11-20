// Увесь контент підтягується автоматично: нова тема = нова папка content/hist-ua/topic-NN.
import {
  factsFile,
  funFactsFile,
  questionsFile,
  theoryFile,
  topicsFile,
  type Question,
  type TopicPack,
} from './lib/schema'
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
    },
  ]),
)

export const QUESTIONS: Question[] = Object.values(PACKS).flatMap((p) => p.questions)
export const BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))
export const topicTitle = (n: number) => TOPICS.find((t) => t.n === n)?.title ?? `Тема ${n}`
