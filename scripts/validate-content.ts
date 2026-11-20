// Перевірка всього контенту за схемою: npm run validate (запускається і перед build).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { z } from 'zod'
import {
  coverageCheck,
  crossCheck,
  factsFile,
  funFactsFile,
  programFile,
  questionsFile,
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
  }))
errors.push(...crossCheck(packs))

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
const n = packs.reduce((s, p) => s + p.questions.length, 0)
console.log(
  `✓ Контент у порядку: тем ${packs.length}, питань ${n}, програму покрито повністю в темах: ${covered}`,
)
