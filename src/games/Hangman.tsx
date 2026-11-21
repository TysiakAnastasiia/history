import { motion } from 'motion/react'
import { use, useCallback, useEffect, useMemo, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Fact } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'

/** Шибениця: вгадати історичний термін за визначенням */
const MAX_MISTAKES = 6
const RECORD = 'hangman' // найдовша серія вгаданих слів поспіль

const ALPHABET = 'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'.split('')
/** Символи, які не треба вгадувати */
const isLetter = (ch: string) => ALPHABET.includes(ch)

export function Hangman() {
  const terms = use(loadAll())
    .flatMap((p) => p.facts)
    .filter((f) => f.kind === 'term' && f.details)
  const [deck, setDeck] = useState(() => shuffle(terms))
  const [i, setI] = useState(0)
  const [streak, setStreak] = useState(0)

  if (terms.length === 0)
    return (
      <Screen>
        <BackBar />
        <p className="text-muted">Поки що немає термінів для гри.</p>
      </Screen>
    )

  const next = (won: boolean) => {
    setStreak((s) => (won ? s + 1 : 0))
    if (i + 1 >= deck.length) {
      setDeck(shuffle(terms))
      setI(0)
    } else setI(i + 1)
  }

  return <Word key={`${i}-${deck[i].id}`} term={deck[i]} streak={streak} onNext={next} />
}

function Word({
  term,
  streak,
  onNext,
}: {
  term: Fact
  streak: number
  onNext: (won: boolean) => void
}) {
  const { profile, update } = useProfile()
  const word = term.title.toUpperCase()
  const letters = useMemo(() => new Set(word.split('').filter(isLetter)), [word])
  const [tried, setTried] = useState<string[]>([])
  const [gained, setGained] = useState(0)

  const mistakes = tried.filter((l) => !letters.has(l)).length
  const won = [...letters].every((l) => tried.includes(l))
  const lost = mistakes >= MAX_MISTAKES
  const over = won || lost

  const guess = useCallback(
    (l: string) => {
      if (over || tried.includes(l)) return
      const nextTried = [...tried, l]
      setTried(nextTried)
      const nowWon = [...letters].every((x) => nextTried.includes(x))
      const nowMistakes = nextTried.filter((x) => !letters.has(x)).length
      if (nowWon) {
        const xp = 10 + (MAX_MISTAKES - nowMistakes) * 2
        setGained(xp)
        update((p) => ({
          ...p,
          xp: p.xp + xp,
          gameRecords: {
            ...p.gameRecords,
            [RECORD]: Math.max(p.gameRecords[RECORD] ?? 0, streak + 1),
          },
        }))
        playResult(true, profile.sound)
      } else if (nowMistakes >= MAX_MISTAKES) playResult(false, profile.sound)
    },
    [over, tried, letters, update, streak, profile.sound],
  )

  // фізична клавіатура (українська розкладка) і Enter — далі
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter' && over) {
        e.preventDefault()
        onNext(won)
        return
      }
      const l = e.key.toUpperCase()
      if (l.length === 1 && isLetter(l)) guess(l)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guess, over, onNext, won])

  const record = profile.gameRecords[RECORD]

  return (
    <Screen wide>
      <BackBar>
        Шибениця · серія {streak}
        {record ? ` · рекорд ${record}` : ''}
      </BackBar>
      {/* зліва — гра, справа — великий чоловічок (на телефоні — над словом) */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Title>Вгадай термін</Title>

          <Card>
            <p className="text-muted mb-1 text-xs font-semibold tracking-[0.18em] uppercase">
              Підказка
            </p>
            <p className="font-display text-xl leading-snug">{term.details}</p>
          </Card>

          <div className="flex justify-center sm:hidden">
            <Gallows stage={mistakes} className="h-52 w-52" />
          </div>

          {/* слово */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-3 py-2" aria-live="polite">
            {word.split(' ').map((part, w) => (
              <div key={w} className="flex gap-1">
                {part.split('').map((ch, k) => {
                  const shown = !isLetter(ch) || tried.includes(ch) || lost
                  const missed = lost && isLetter(ch) && !tried.includes(ch)
                  return (
                    <span
                      key={k}
                      className={`flex h-11 w-[clamp(1.05rem,5.6vw,2rem)] items-end justify-center border-b-2 pb-1 font-sans text-[clamp(1rem,5vw,1.5rem)] font-medium ${
                        missed ? 'border-bad text-bad' : 'border-fg/40'
                      }`}
                    >
                      {shown ? ch : ''}
                    </span>
                  )
                })}
              </div>
            ))}
          </div>

          {over ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3"
            >
              <Card className="flex items-center gap-4">
                <Mascot mood={won ? 'happy' : 'sad'} size={90} />
                <div>
                  <div
                    className={`text-2xl font-semibold ${won ? 'text-accent-text' : 'text-bad'}`}
                  >
                    {won ? 'Моя вам повага' : 'Лошара'}
                  </div>
                  <p className="text-muted text-sm">
                    {won ? `+${gained} XP` : `Правильно: ${term.title}`}
                  </p>
                </div>
              </Card>
              <Button variant="primary" onClick={() => onNext(won)} autoFocus>
                Наступне слово
              </Button>
              <LinkButton to="/" className="justify-center rounded-full">
                На головну
              </LinkButton>
            </motion.div>
          ) : (
            <>
              <p className="text-muted text-center text-sm">
                Помилок: {mistakes} з {MAX_MISTAKES}
              </p>
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-11">
                {ALPHABET.map((l) => {
                  const used = tried.includes(l)
                  const hit = used && letters.has(l)
                  return (
                    <button
                      key={l}
                      onClick={() => guess(l)}
                      disabled={used}
                      aria-label={`Літера ${l}`}
                      className={`focus-visible:outline-fg flex h-11 items-center justify-center rounded-xl border text-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        !used
                          ? 'border-line bg-glass hover:border-fg/30'
                          : hit
                            ? 'border-accent bg-accent/25'
                            : 'border-line text-muted opacity-40'
                      }`}
                    >
                      {l}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
        <div className="glass hidden w-[40%] shrink-0 items-center justify-center p-6 sm:flex">
          <Gallows stage={mistakes} className="h-auto w-full max-w-sm" />
        </div>
      </div>
    </Screen>
  )
}

/** Мінімалістична шибениця: з кожною помилкою з’являється ще одна частина */
function Gallows({ stage, className = '' }: { stage: number; className?: string }) {
  const parts = [
    <circle key="head" cx="70" cy="34" r="9" />,
    <line key="body" x1="70" y1="43" x2="70" y2="68" />,
    <line key="arm1" x1="70" y1="50" x2="60" y2="60" />,
    <line key="arm2" x1="70" y1="50" x2="80" y2="60" />,
    <line key="leg1" x1="70" y1="68" x2="61" y2="82" />,
    <line key="leg2" x1="70" y1="68" x2="79" y2="82" />,
  ]
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-label={`Помилок: ${stage}`}
      className={`shrink-0 ${className}`}
    >
      <g className="text-muted">
        <line x1="12" y1="94" x2="60" y2="94" />
        <line x1="28" y1="94" x2="28" y2="10" />
        <line x1="28" y1="10" x2="70" y2="10" />
        <line x1="70" y1="10" x2="70" y2="25" />
      </g>
      <g className="text-bad">
        {parts.slice(0, stage).map((p) => (
          <motion.g key={p.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {p}
          </motion.g>
        ))}
      </g>
    </svg>
  )
}
