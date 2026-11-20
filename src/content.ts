import type { Question, Section, Topic } from './types'
import topics from '../content/hist-ua/topics.json'
import q03 from '../content/hist-ua/topic-03/questions.json'
import th03 from '../content/hist-ua/topic-03/theory.json'

export const TOPICS = topics as Topic[]
export const QUESTIONS = q03 as unknown as Question[]
export const BY_ID: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))
// Теорія по номеру теми. Нова тема = новий JSON і рядок тут.
export const THEORY: Record<number, Section[]> = { 3: th03 as Section[] }
export const questionsOf = (topic: number) => QUESTIONS.filter((q) => q.topic === topic)
