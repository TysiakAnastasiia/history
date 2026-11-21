// Контент вантажиться по темах: одразу — лише покажчик (src/generated/content-index.json),
// а теорія, питання й карти теми — окремим файлом, коли тему відкривають.
// Нова тема = нова папка content/hist-ua/topic-NN (покажчик оновлює npm run validate).
import {
  factsFile,
  funFactsFile,
  mapsFile,
  mediaFile,
  journeyFile,
  questionsFile,
  quotesFile,
  theoryFile,
  topicsFile,
  type MapLayer,
  type Media,
  type Question,
  type TopicPack,
} from './lib/schema'
import mediaJson from '../content/hist-ua/media.json'
import topicsJson from '../content/hist-ua/topics.json'
import contentIndex from './generated/content-index.json'

export const TOPICS = topicsFile.parse(topicsJson)
export const topicTitle = (n: number) => TOPICS.find((t) => t.n === n)?.title ?? `Тема ${n}`

/** Покажчик: які теми мають контент і скільки в них питань і розділів */
export const INDEX: Record<number, { questions: number; sections: number; journey?: boolean }> =
  Object.fromEntries(Object.entries(contentIndex.topics).map(([n, v]) => [Number(n), v]))
export const hasTopic = (n: number) => n in INDEX

/** Номер теми з id питання: «hist-ua.t03.q001» → 3 */
export const topicOf = (id: string) => Number(/\.t(\d+)\./.exec(id)?.[1] ?? 0)

/** Зображення з авторами й ліцензіями (public/media/…) — маленький файл, вантажиться одразу */
export const MEDIA: Record<string, Media> = Object.fromEntries(
  mediaFile.parse(mediaJson).map((m) => [m.id, m]),
)

// Цікаві факти невеликі й потрібні на головній («Факт дня») — вантажимо одразу
const funFiles: Record<string, unknown> = import.meta.glob('../content/hist-ua/topic-*/fun.json', {
  eager: true,
  import: 'default',
})
const dirOf = (path: string) => Number(/topic-(\d+)/.exec(path)![1])

export const FUN_FACTS = Object.entries(funFiles)
  .flatMap(([path, data]) => funFactsFile.parse(data).map((f) => ({ ...f, topic: dirOf(path) })))
  .sort((a, b) => a.topic - b.topic)

/** «Факт дня»: один і той самий упродовж доби, наступного дня — інший */
export function factOfDay(date = new Date()) {
  if (FUN_FACTS.length === 0) return null
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return FUN_FACTS[day % FUN_FACTS.length]
}

// ---- Теми, що вантажаться за потреби ----

type Loader = () => Promise<unknown>
// Параметри glob мають бути записані прямо у виклику — Vite розбирає їх статично
const lazy: Record<string, Loader> = import.meta.glob(
  [
    '../content/hist-ua/topic-*/facts.json',
    '../content/hist-ua/topic-*/theory.json',
    '../content/hist-ua/topic-*/questions.json',
    '../content/hist-ua/topic-*/maps.json',
    '../content/hist-ua/topic-*/quotes.json',
    '../content/hist-ua/topic-*/journey.json',
  ],
  { import: 'default' },
)
const fileOf = (n: number, name: string) =>
  lazy[`../content/hist-ua/topic-${String(n).padStart(2, '0')}/${name}.json`]?.() ??
  Promise.resolve([])

/** Питання й шари карт уже завантажених тем — для пошуку за id */
export const BY_ID: Record<string, Question> = {}
export const MAPS: Record<string, MapLayer> = {}

const cache = new Map<number, Promise<TopicPack>>()

/** Завантажити тему (один раз; далі — з кешу). Результат придатний для React use(). */
export function loadPack(n: number): Promise<TopicPack> {
  let p = cache.get(n)
  if (!p) {
    p = Promise.all([
      fileOf(n, 'facts'),
      fileOf(n, 'theory'),
      fileOf(n, 'questions'),
      fileOf(n, 'maps'),
      fileOf(n, 'quotes'),
      lazy[`../content/hist-ua/topic-${String(n).padStart(2, '0')}/journey.json`]?.() ??
        Promise.resolve(null),
    ]).then(([facts, theory, questions, maps, quotes, journey]) => {
      const pack: TopicPack = {
        topic: n,
        facts: factsFile.parse(facts),
        funFacts: FUN_FACTS.filter((f) => f.topic === n),
        theory: theoryFile.parse(theory),
        questions: questionsFile.parse(questions),
        maps: mapsFile.parse(maps),
        quotes: quotesFile.parse(quotes),
        journey: journeyFile.parse(journey),
      }
      for (const q of pack.questions) BY_ID[q.id] = q
      for (const l of pack.maps) MAPS[l.id] = l
      return pack
    })
    cache.set(n, p)
  }
  return p
}

let all: Promise<TopicPack[]> | null = null
/** Усі теми з контентом — для бліцу, міксу й пробного НМТ */
export function loadAll(): Promise<TopicPack[]> {
  all ??= Promise.all(Object.keys(INDEX).map((n) => loadPack(Number(n))))
  return all
}

const topicsCache = new Map<string, Promise<TopicPack[]>>()
/** Лише потрібні теми (наприклад, ті, де є помилки) */
export function loadTopics(ns: number[]): Promise<TopicPack[]> {
  const key = [...new Set(ns)]
    .filter(hasTopic)
    .sort((a, b) => a - b)
    .join(',')
  let p = topicsCache.get(key)
  if (!p) {
    p = Promise.all(key ? key.split(',').map((n) => loadPack(Number(n))) : [])
    topicsCache.set(key, p)
  }
  return p
}
