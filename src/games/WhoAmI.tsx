import { AnimatePresence, motion } from 'motion/react'
import { use, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Fact } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'
import { personName } from './facts'

/** «Хто я?»: вгадати діяча за підказками, що відкриваються по одній */
const RECORD = 'whoami' // найдовша серія вгаданих поспіль
const OPTIONS = 4

const withHints = (f: Fact) => f.kind === 'person' && (f.hints?.length ?? 0) >= 3

export function WhoAmI() {
  const persons = use(loadAll())
    .flatMap((p) => p.facts)
    .filter(withHints)
  const [deck, setDeck] = useState(() => shuffle(persons))
  const [i, setI] = useState(0)
  const [streak, setStreak] = useState(0)

  if (persons.length < OPTIONS)
    return (
      <Screen>
        <BackBar to="/games" />
        <p className="text-muted">Поки що замало діячів із підказками для гри.</p>
      </Screen>
    )

  const next = (won: boolean) => {
    setStreak((s) => (won ? s + 1 : 0))
    if (i + 1 >= deck.length) {
      setDeck(shuffle(persons))
      setI(0)
    } else setI(i + 1)
  }

  return (
    <Round
      key={`${i}-${deck[i].id}`}
      person={deck[i]}
      all={persons}
      streak={streak}
      onNext={next}
    />
  )
}

function Round({
  person,
  all,
  streak,
  onNext,
}: {
  person: Fact
  all: Fact[]
  streak: number
  onNext: (won: boolean) => void
}) {
  const { profile, update } = useProfile()
  const hints = person.hints!
  const [shown, setShown] = useState(1)
  /** неправильні варіанти, які вже вибирали (закреслені) */
  const [wrong, setWrong] = useState<string[]>([])
  const [result, setResult] = useState<'won' | 'lost' | null>(null)
  const [gained, setGained] = useState(0)
  const [options] = useState(() =>
    shuffle([person, ...shuffle(all.filter((p) => p.id !== person.id)).slice(0, OPTIONS - 1)]),
  )
  const record = profile.gameRecords[RECORD]
  // бали: мінус один за кожну додаткову підказку й за кожну помилку
  const points = Math.max(1, hints.length - (shown - 1) - wrong.length)
  const won = result === 'won'
  const over = result !== null

  const finish = (ok: boolean) => {
    setResult(ok ? 'won' : 'lost')
    playResult(ok, profile.sound)
    const xp = ok ? points * 3 : 0
    setGained(xp)
    update((p) => ({
      ...p,
      xp: p.xp + xp,
      gameRecords: {
        ...p.gameRecords,
        [RECORD]: Math.max(p.gameRecords[RECORD] ?? 0, ok ? streak + 1 : 0),
      },
    }))
    if (!ok) setShown(hints.length)
  }

  const pick = (id: string) => {
    if (over || wrong.includes(id)) return
    if (id === person.id) return finish(true)
    // помилка: варіант закреслюємо й відкриваємо наступну підказку;
    // якщо лишилося менше двох варіантів — раунд програно
    const nextWrong = [...wrong, id]
    setWrong(nextWrong)
    setShown((s) => Math.min(hints.length, s + 1))
    if (options.length - nextWrong.length < 2) finish(false)
    else playResult(false, profile.sound)
  }

  return (
    <Screen>
      <BackBar to="/games">
        Хто я? · серія {streak}
        {record ? ` · рекорд ${record}` : ''}
      </BackBar>
      <div className="flex items-end justify-between gap-4">
        <Title>Хто я?</Title>
        {!over && (
          <span className="text-muted pb-2 text-sm">
            {points} {points === 1 ? 'бал' : points < 5 ? 'бали' : 'балів'}
          </span>
        )}
      </div>

      <ol className="flex flex-col gap-2.5">
        <AnimatePresence initial={false}>
          {hints.slice(0, shown).map((h, k) => (
            <motion.li
              key={k}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass flex gap-3 px-4 py-3"
            >
              <span className="text-muted w-4 shrink-0 text-sm tabular-nums">{k + 1}</span>
              <span className="font-display text-xl leading-snug">{h}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {!over && shown < hints.length && (
        <button
          onClick={() => setShown((s) => s + 1)}
          className="text-muted hover:text-fg self-start text-sm underline-offset-4 transition hover:underline"
        >
          Ще підказка (−1 бал)
        </button>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {options.map((o) => {
          const isRight = o.id === person.id
          const isWrong = wrong.includes(o.id)
          const variant = isWrong
            ? 'border-bad bg-bad/12 line-through opacity-60'
            : !over
              ? 'glass hover:border-fg/25'
              : isRight
                ? 'border-accent bg-accent/15'
                : 'border-line opacity-50'
          return (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              disabled={over || isWrong}
              className={`focus-visible:outline-fg flex min-h-14 items-center justify-center rounded-2xl border px-3 py-3 text-center font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${variant}`}
            >
              {personName(o.title)}
            </button>
          )
        })}
      </div>

      {!over && wrong.length > 0 && (
        <p className="text-bad text-center text-sm" aria-live="polite">
          Ні, не {personName(options.find((o) => o.id === wrong[wrong.length - 1])!.title)}. Ось ще
          підказка.
        </p>
      )}

      {over && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <Card className="flex items-center gap-4">
            <Mascot mood={won ? 'happy' : 'sad'} size={90} />
            <div>
              <div className={`text-2xl font-semibold ${won ? 'text-accent-text' : 'text-bad'}`}>
                {won ? 'Моя вам повага' : 'Лошара'}
              </div>
              <p className="text-muted text-sm">
                {won ? `+${gained} XP · ` : `Це ${personName(person.title)}. `}
                {person.details}
              </p>
            </div>
          </Card>
          <Button variant="primary" onClick={() => onNext(won)} autoFocus>
            Наступний діяч
          </Button>
          <LinkButton to="/games" className="justify-center rounded-full">
            До ігор
          </LinkButton>
        </motion.div>
      )}
    </Screen>
  )
}
