import { AnimatePresence, motion } from 'motion/react'
import { use, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Fact } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'

/** «Хто я?»: вгадати діяча за підказками, що відкриваються по одній */
const RECORD = 'whoami' // найдовша серія вгаданих поспіль
const OPTIONS = 4

/** Ім’я без посади й прізвиська в дужках («Літописець Нестор» → «Нестор»), щоб варіант не підказував відповідь */
const personName = (title: string) =>
  title
    .replace(/^(Митрополит|Іконописець|Літописець|Князь|Княгиня)\s+/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim()

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
        <BackBar />
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
  const [picked, setPicked] = useState<string | null>(null)
  const [gained, setGained] = useState(0)
  const [options] = useState(() =>
    shuffle([person, ...shuffle(all.filter((p) => p.id !== person.id)).slice(0, OPTIONS - 1)]),
  )
  const record = profile.gameRecords[RECORD]
  const points = hints.length - shown + 1
  const won = picked === person.id

  const pick = (id: string) => {
    if (picked) return
    setPicked(id)
    const ok = id === person.id
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
    if (!ok) setShown(hints.length) // після помилки показуємо всі підказки
  }

  return (
    <Screen>
      <BackBar>
        Хто я? · серія {streak}
        {record ? ` · рекорд ${record}` : ''}
      </BackBar>
      <div className="flex items-end justify-between gap-4">
        <Title>Хто я?</Title>
        {!picked && (
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

      {!picked && shown < hints.length && (
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
          const variant = !picked
            ? 'glass hover:border-fg/25'
            : isRight
              ? 'border-accent bg-accent/15'
              : o.id === picked
                ? 'border-bad bg-bad/12'
                : 'border-line opacity-50'
          return (
            <button
              key={o.id}
              onClick={() => pick(o.id)}
              disabled={!!picked}
              className={`focus-visible:outline-fg flex min-h-14 items-center justify-center rounded-2xl border px-3 py-3 text-center font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${variant}`}
            >
              {personName(o.title)}
            </button>
          )
        })}
      </div>

      {picked && (
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
          <LinkButton to="/" className="justify-center rounded-full">
            На головну
          </LinkButton>
        </motion.div>
      )}
    </Screen>
  )
}
