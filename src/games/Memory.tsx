import { motion } from 'motion/react'
import { use, useCallback, useEffect, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Fact } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'
import { eventsWithDistinctYears, noYears } from './facts'

/** Картки на пам’ять: 30 секунд запам’ятати, потім знайти пари «дата + подія» */
const PAIRS = 6
const MEMORIZE = 30
const RECORD = 'memory'

interface CardData {
  key: string
  pair: string // id факту: дві картки з однаковим pair — пара
  kind: 'year' | 'event'
  text: string
}

/** Лише по одній події на рік, щоб пари не були двозначними */
function pickPairs(facts: Fact[]): CardData[] {
  const chosen = eventsWithDistinctYears(facts).slice(0, PAIRS)
  return shuffle(
    chosen.flatMap((f) => [
      { key: `${f.id}-y`, pair: f.id, kind: 'year' as const, text: String(f.year) },
      { key: `${f.id}-e`, pair: f.id, kind: 'event' as const, text: noYears(f.title) },
    ]),
  )
}

type Phase = 'memorize' | 'play' | 'done'

export function Memory() {
  const facts = use(loadAll()).flatMap((p) => p.facts)
  const [round, setRound] = useState(0)
  const enough = eventsWithDistinctYears(facts).length
  if (enough < PAIRS)
    return (
      <Screen>
        <BackBar />
        <p className="text-muted">Поки що замало подій із датами для гри.</p>
      </Screen>
    )
  return <MemoryRound key={round} facts={facts} onRestart={() => setRound((r) => r + 1)} />
}

function MemoryRound({ facts, onRestart }: { facts: Fact[]; onRestart: () => void }) {
  const { profile, update } = useProfile()
  const [cards] = useState(() => pickPairs(facts))
  const [phase, setPhase] = useState<Phase>('memorize')
  const [left, setLeft] = useState(MEMORIZE)
  const [open, setOpen] = useState<string[]>([]) // відкриті зараз (до 2)
  const [found, setFound] = useState<string[]>([]) // знайдені пари (id фактів)
  const [moves, setMoves] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [gained, setGained] = useState(0)

  // відлік часу на запам’ятовування; коли час вийшов — картки перевертаються
  useEffect(() => {
    if (phase !== 'memorize') return
    const t = setTimeout(() => {
      if (left <= 1) setPhase('play')
      setLeft((x) => x - 1)
    }, 1000)
    return () => clearTimeout(t)
  }, [phase, left])

  const finish = useCallback(
    (mistakesTotal: number) => {
      const xp = Math.max(5, PAIRS * 5 - mistakesTotal * 2)
      setGained(xp)
      update((p) => {
        const best = p.gameRecords[RECORD]
        return {
          ...p,
          xp: p.xp + xp,
          // рекорд — найменше помилок
          gameRecords: {
            ...p.gameRecords,
            [RECORD]: best === undefined ? mistakesTotal : Math.min(best, mistakesTotal),
          },
        }
      })
      setPhase('done')
    },
    [update],
  )

  const flip = (c: CardData) => {
    if (phase !== 'play' || open.length === 2 || open.includes(c.key) || found.includes(c.pair))
      return
    const next = [...open, c.key]
    setOpen(next)
    if (next.length < 2) return
    setMoves((m) => m + 1)
    const [a, b] = next.map((k) => cards.find((x) => x.key === k)!)
    if (a.pair === b.pair) {
      const nowFound = [...found, a.pair]
      setFound(nowFound)
      setOpen([])
      playResult(true, profile.sound)
      if (nowFound.length === PAIRS) setTimeout(() => finish(mistakes), 500)
    } else {
      setMistakes((m) => m + 1)
      playResult(false, profile.sound)
      setTimeout(() => setOpen([]), 900)
    }
  }

  const record = profile.gameRecords[RECORD]

  if (phase === 'done')
    return (
      <Screen>
        <BackBar />
        <Card className="flex flex-col items-center gap-2 text-center">
          <Mascot mood={mistakes <= 2 ? 'happy' : 'sad'} size={120} />
          <div className="font-sans text-6xl font-extralight">{mistakes}</div>
          <p className="text-muted">
            {mistakes === 0 ? 'жодної помилки — моя вам повага!' : 'помилок'} · ходів: {moves} · +
            {gained} XP
          </p>
          <div className="mt-3 flex w-full flex-col gap-2.5">
            <Button variant="primary" onClick={onRestart}>
              Ще раз
            </Button>
            <LinkButton to="/" className="justify-center rounded-full">
              На головну
            </LinkButton>
          </div>
        </Card>
      </Screen>
    )

  return (
    <Screen>
      <BackBar>Картки на пам’ять{record !== undefined && ` · рекорд: ${record} помилок`}</BackBar>
      <div className="flex items-end justify-between gap-4">
        <Title>{phase === 'memorize' ? 'Запам’ятай' : 'Знайди пари'}</Title>
        <span className="font-sans text-4xl font-extralight tabular-nums">
          {phase === 'memorize' ? left : `${found.length}/${PAIRS}`}
        </span>
      </div>
      <p className="text-muted">
        {phase === 'memorize'
          ? 'Запам’ятай, яка дата до якої події. Потім картки перевернуться.'
          : `Відкривай по дві картки: дату й подію. Помилок: ${mistakes}`}
      </p>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {cards.map((c) => {
          const isFound = found.includes(c.pair)
          const faceUp = phase === 'memorize' || isFound || open.includes(c.key)
          const wrong = open.length === 2 && open.includes(c.key) && !isFound
          return (
            <motion.button
              key={c.key}
              onClick={() => flip(c)}
              disabled={phase !== 'play' || isFound}
              aria-label={faceUp ? c.text : 'Закрита картка'}
              animate={{ rotateY: faceUp ? 0 : 180 }}
              transition={{ duration: 0.35 }}
              style={{ transformStyle: 'preserve-3d' }}
              className={`focus-visible:outline-fg relative flex aspect-[3/4] items-center justify-center rounded-2xl border p-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                !faceUp
                  ? 'border-line bg-primary text-primary-fg cursor-pointer'
                  : isFound
                    ? 'border-accent bg-accent/20'
                    : wrong
                      ? 'border-bad bg-bad/15'
                      : 'glass'
              }`}
            >
              <span style={{ transform: faceUp ? undefined : 'rotateY(180deg)' }} className="block">
                {faceUp ? (
                  c.kind === 'year' ? (
                    <span className="font-display text-3xl font-medium">{c.text}</span>
                  ) : (
                    <span className="text-[0.8rem] leading-snug sm:text-sm">{c.text}</span>
                  )
                ) : (
                  <span className="font-display text-2xl opacity-70">?</span>
                )}
              </span>
            </motion.button>
          )
        })}
      </div>

      {phase === 'memorize' && (
        <Button variant="primary" onClick={() => setPhase('play')}>
          Я запам’ятав(-ла), почати
        </Button>
      )}
    </Screen>
  )
}
