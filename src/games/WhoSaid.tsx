import { motion } from 'motion/react'
import { use, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Quote } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'

/** «Хто це сказав?»: визначити автора цитати */
const ROUND = 8
const RECORD = 'whosaid' // найкращий результат раунду

export function WhoSaid() {
  const quotes = use(loadAll()).flatMap((p) => p.quotes)
  const authors = [...new Set(quotes.map((q) => q.author))]
  const [round, setRound] = useState(0)
  if (authors.length < 4)
    return (
      <Screen>
        <BackBar />
        <p className="text-muted">Поки що замало цитат для гри.</p>
      </Screen>
    )
  return (
    <Round key={round} quotes={quotes} authors={authors} onRestart={() => setRound((r) => r + 1)} />
  )
}

function Round({
  quotes,
  authors,
  onRestart,
}: {
  quotes: Quote[]
  authors: string[]
  onRestart: () => void
}) {
  const { profile, update } = useProfile()
  const [deck] = useState(() =>
    shuffle(quotes)
      .slice(0, ROUND)
      .map((q) => ({
        q,
        options: shuffle([q.author, ...shuffle(authors.filter((a) => a !== q.author)).slice(0, 3)]),
      })),
  )
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [good, setGood] = useState(0)
  const record = profile.gameRecords[RECORD]
  const done = i >= deck.length

  const pick = (a: string) => {
    if (picked) return
    const ok = a === deck[i].q.author
    setPicked(a)
    playResult(ok, profile.sound)
    if (ok) {
      setGood((g) => g + 1)
      update((p) => ({ ...p, xp: p.xp + 5 }))
    }
  }
  const next = () => {
    if (i + 1 >= deck.length)
      update((p) => ({
        ...p,
        gameRecords: { ...p.gameRecords, [RECORD]: Math.max(p.gameRecords[RECORD] ?? 0, good) },
      }))
    setPicked(null)
    setI(i + 1)
  }

  if (done)
    return (
      <Screen>
        <BackBar />
        <Card className="flex flex-col items-center gap-2 text-center">
          <Mascot mood={good >= deck.length / 2 ? 'happy' : 'sad'} size={120} />
          <div className="font-sans text-6xl font-extralight">{good}</div>
          <p className="text-muted">
            правильних із {deck.length} · +{good * 5} XP
          </p>
          <div className="mt-3 flex w-full flex-col gap-2.5">
            <Button variant="primary" onClick={onRestart}>
              Ще раунд
            </Button>
            <LinkButton to="/" className="justify-center rounded-full">
              На головну
            </LinkButton>
          </div>
        </Card>
      </Screen>
    )

  const { q, options } = deck[i]
  const ok = picked === q.author

  return (
    <Screen>
      <BackBar>
        Хто це сказав? · {i + 1}/{deck.length}
        {record !== undefined && ` · рекорд ${record}/${ROUND}`}
      </BackBar>
      <Title>Хто це сказав?</Title>

      <Card>
        <p className="font-display text-3xl leading-snug">
          <span className="text-accent-text">«</span>
          {q.text}
          <span className="text-accent-text">»</span>
        </p>
        <p className="text-muted mt-3 text-sm">{q.source}</p>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        {options.map((a) => {
          const variant = !picked
            ? 'glass hover:border-fg/25'
            : a === q.author
              ? 'border-accent bg-accent/15'
              : a === picked
                ? 'border-bad bg-bad/12'
                : 'border-line opacity-50'
          return (
            <button
              key={a}
              onClick={() => pick(a)}
              disabled={!!picked}
              className={`focus-visible:outline-fg flex min-h-14 items-center justify-center rounded-2xl border px-3 py-3 text-center font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${variant}`}
            >
              {a}
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
            <Mascot mood={ok ? 'happy' : 'sad'} size={80} />
            <div>
              <div className={`text-2xl font-semibold ${ok ? 'text-accent-text' : 'text-bad'}`}>
                {ok ? 'Моя вам повага' : 'Лошара'}
              </div>
              <p className="text-muted text-sm">
                {!ok && <b className="text-fg">{q.author}. </b>}
                {q.context}
              </p>
            </div>
          </Card>
          <Button variant="primary" onClick={next} autoFocus>
            {i + 1 >= deck.length ? 'Результат' : 'Далі'}
          </Button>
        </motion.div>
      )}
    </Screen>
  )
}
