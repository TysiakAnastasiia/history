// Перевірка всього контенту за схемою: npm run validate (запускається і перед build).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { z } from 'zod'
import {
  coverageCheck,
  crossCheck,
  factsFile,
  funFactsFile,
  journeyFile,
  mapsFile,
  mediaFile,
  programFile,
  questionsFile,
  quotesFile,
  theoryFile,
  topicsFile,
  type TopicPack,
} from '../src/lib/schema.ts'

const ROOT = 'content/hist-ua'
const errors: string[] = []

function load<T>(file: string, schema: z.ZodType<T>, fallback: T): T {
  const path = join(ROOT, file)
  if (!existsSync(path)) return fallback
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    errors.push(`${path}: некоректний JSON — ${(e as Error).message}`)
    return fallback
  }
  const r = schema.safeParse(raw)
  if (!r.success) {
    for (const i of r.error.issues) errors.push(`${path} → ${i.path.join('.')}: ${i.message}`)
    return fallback
  }
  return r.data
}

load('topics.json', topicsFile, [])
const packs: TopicPack[] = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^topic-\d{2}$/.test(d.name))
  .map((d) => ({
    topic: Number(d.name.slice(6)),
    facts: load(`${d.name}/facts.json`, factsFile, []),
    funFacts: load(`${d.name}/fun.json`, funFactsFile, []),
    theory: load(`${d.name}/theory.json`, theoryFile, []),
    questions: load(`${d.name}/questions.json`, questionsFile, []),
    maps: load(`${d.name}/maps.json`, mapsFile, []),
    quotes: load(`${d.name}/quotes.json`, quotesFile, []),
    journey: load(`${d.name}/journey.json`, journeyFile, null),
  }))
const media = load('media.json', mediaFile, [])
for (const m of media)
  if (!existsSync(join('public/media', m.file)))
    errors.push(`media.json → ${m.id}: немає файлу public/media/${m.file}`)
errors.push(...crossCheck(packs, media))

// Покриття програми: для тем, де є program.json
let covered = 0
for (const p of packs) {
  const dir = `topic-${String(p.topic).padStart(2, '0')}`
  const program = load(`${dir}/program.json`, programFile.nullable(), null)
  if (!program) continue
  covered++
  errors.push(...coverageCheck(p.topic, program, p))
}

if (errors.length) {
  console.error(
    `✗ Контент містить помилки (${errors.length}):\n` + errors.map((e) => '  ' + e).join('\n'),
  )
  process.exit(1)
}
// Покажчик для застосунку: які теми мають контент (сам контент вантажиться по темах)
const index = {
  topics: Object.fromEntries(
    packs
      .filter((p) => p.questions.length + p.theory.length > 0)
      .map((p) => [
        p.topic,
        { questions: p.questions.length, sections: p.theory.length, journey: !!p.journey },
      ]),
  ),
}
mkdirSync('src/generated', { recursive: true })
writeFileSync('src/generated/content-index.json', `${JSON.stringify(index, null, 2)}\n`)

const n = packs.reduce((s, p) => s + p.questions.length, 0)
console.log(
  `✓ Контент у порядку: тем ${packs.length}, питань ${n}, програму покрито повністю в темах: ${covered}`,
)
