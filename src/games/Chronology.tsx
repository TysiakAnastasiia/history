import { motion, Reorder } from 'motion/react'
import { use, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Fact } from '../lib/schema'
import { playResult } from '../lib/sound'
import { eventsWithDistinctYears, noYears } from './facts'

/** Хронологія: розставити події від найранішої до найпізнішої */
const START = 4
const MAX = 7
const RECORD = 'chronology' // найдовша серія ідеальних раундів

const byYear = (a: Fact, b: Fact) => a.year! - b.year!

/** Події раунду в перемішаному (але не вже правильному) порядку */
function newRound(facts: Fact[], size: number): Fact[] {
  const picked = eventsWithDistinctYears(facts).slice(0, size)
  const sorted = [...picked].sort(byYear)
  // якщо випадково вийшло вже по порядку — переставляємо дві перші
  if (picked.every((f, i) => f.id === sorted[i].id) && picked.length > 1)
    [picked[0], picked[1]] = [picked[1], picked[0]]
  return picked
}

export function Chronology() {
  const facts = use(loadAll()).flatMap((p) => p.facts)
  const available = eventsWithDistinctYears(facts).length
  if (available < START)
    return (
      <Screen>
        <BackBar />
        <p className="text-muted">Поки що замало подій із датами для гри.</p>
      </Screen>
    )
  return <Game facts={facts} max={Math.min(MAX, available)} />
}

function Game({ facts, max }: { facts: Fact[]; max: number }) {
  const { profile, update } = useProfile()
  const [size, setSize] = useState(START)
  const [items, setItems] = useState(() => newRound(facts, START))
  const [checked, setChecked] = useState(false)
  const [streak, setStreak] = useState(0)
  const [gained, setGained] = useState(0)

  const sorted = [...items].sort(byYear)
  const rightAt = (f: Fact, i: number) => sorted[i].id === f.id
  const correct = items.filter(rightAt).length
  const perfect = checked && correct === items.length
  const record = profile.gameRecords[RECORD]

  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (checked || j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }

  const check = () => {
    const ok = items.every(rightAt)
    const xp = ok ? 5 * items.length : correct
    setChecked(true)
    setGained(xp)
    playResult(ok, profile.sound)
    const nextStreak = ok ? streak + 1 : 0
    setStreak(nextStreak)
    update((p) => ({
      ...p,
      xp: p.xp + xp,
      gameRecords: { ...p.gameRecords, [RECORD]: Math.max(p.gameRecords[RECORD] ?? 0, nextStreak) },
    }))
  }

  const next = () => {
    // ідеально — наступного разу на одну подію більше; ні — на одну менше
    const nextSize = perfect ? Math.min(max, size + 1) : Math.max(START, size - 1)
    setSize(nextSize)
    setItems(newRound(facts, nextSize))
    setChecked(false)
  }

  return (
    <Screen>
      <BackBar>
        Хронологія · серія {streak}
        {record ? ` · рекорд ${record}` : ''}
      </BackBar>
      <Title>Розстав по порядку</Title>
      <p className="text-muted">
        Перетягуй події (або натискай ↑↓): угорі — найраніша, внизу — найпізніша.
      </p>

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={checked ? () => {} : setItems}
        className="flex flex-col gap-2.5"
      >
        {items.map((f, i) => {
          const ok = rightAt(f, i)
          return (
            <Reorder.Item
              key={f.id}
              value={f}
              dragListener={!checked}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 select-none ${
                !checked
                  ? 'glass cursor-grab active:cursor-grabbing'
                  : ok
                    ? 'border-accent bg-accent/15'
                    : 'border-bad bg-bad/12'
              }`}
              whileDrag={{ scale: 1.03, boxShadow: '0 12px 30px rgb(0 0 0 / 0.18)' }}
            >
              <span className="text-muted w-5 shrink-0 text-sm tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 leading-snug">{noYears(f.title)}</span>
              {checked ? (
                <span className="flex shrink-0 flex-col items-end">
                  <span className="font-display text-xl font-medium">{f.year}</span>
                  {!ok && (
                    <span className="text-bad text-xs">
                      місце {sorted.findIndex((x) => x.id === f.id) + 1}
                    </span>
                  )}
                </span>
              ) : (
                <span
                  className="flex shrink-0 flex-col gap-1"
                  // натиск на стрілки не повинен починати перетягування
                  onPointerDownCapture={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Вище"
                    className="text-muted hover:text-fg rounded-md px-1.5 leading-none disabled:opacity-20"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label="Нижче"
                    className="text-muted hover:text-fg rounded-md px-1.5 leading-none disabled:opacity-20"
                  >
                    ↓
                  </button>
                </span>
              )}
            </Reorder.Item>
          )
        })}
      </Reorder.Group>

      {!checked ? (
        <Button variant="primary" onClick={check}>
          Перевірити
        </Button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <Card className="flex items-center gap-4">
            <Mascot mood={perfect ? 'happy' : 'sad'} size={90} />
            <div>
              <div
                className={`text-2xl font-semibold ${perfect ? 'text-accent-text' : 'text-bad'}`}
              >
                {perfect ? 'Моя вам повага' : 'Лошара'}
              </div>
              <p className="text-muted text-sm">
                На своєму місці: {correct} з {items.length} · +{gained} XP
                {perfect && size < max && ' · далі на одну подію більше'}
              </p>
            </div>
          </Card>
          <Button variant="primary" onClick={next} autoFocus>
            Наступний раунд
          </Button>
          <LinkButton to="/" className="justify-center rounded-full">
            На головну
          </LinkButton>
        </motion.div>
      )}
    </Screen>
  )
}
