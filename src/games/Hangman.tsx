import { motion } from 'motion/react'
import { use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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
        <BackBar to="/games" />
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
      <BackBar to="/games">
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
            <Gallows stage={mistakes} won={won} lost={lost} className="h-56 w-56" />
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
              <LinkButton to="/games" className="justify-center rounded-full">
                До ігор
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
          <Gallows stage={mistakes} won={won} lost={lost} className="h-auto w-full max-w-sm" />
        </div>
      </div>
    </Screen>
  )
}

/**
 * Шибениця з деталями: чоловічок-козак (оселедець, вуса, пояс, шабля),
 * ворона, що прилітає на перекладину, брови й піт від хвилювання,
 * хрестики замість очей у разі програшу й усмішка-очі у разі перемоги.
 */
function Gallows({
  stage,
  won = false,
  lost = false,
  className = '',
}: {
  stage: number
  won?: boolean
  lost?: boolean
  className?: string
}) {
  const appear = (key: string, el: ReactNode) => (
    <motion.g
      key={key}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {el}
    </motion.g>
  )
  const parts = [
    // 1. голова з оселедцем і вусами
    <g key="head">
      <circle cx="70" cy="34" r="9" />
      <path d="M70 25 Q62 19 60 27" />
      <path d="M70 38.5 Q66 37.5 63.5 41 M70 38.5 Q74 37.5 76.5 41" strokeWidth="1.6" />
    </g>,
    // 2. тулуб із поясом
    <g key="body">
      <line x1="70" y1="43" x2="70" y2="68" />
      <line x1="66" y1="58" x2="74" y2="58" className="text-accent" strokeWidth="3" />
    </g>,
    // 3. рука з шаблею
    <g key="arm1">
      <line x1="70" y1="50" x2="60" y2="60" />
      <path d="M60 60 Q52 57 50 47" strokeWidth="1.4" className="text-muted" />
    </g>,
    <line key="arm2" x1="70" y1="50" x2="80" y2="60" />,
    <line key="leg1" x1="70" y1="68" x2="61" y2="82" />,
    <line key="leg2" x1="70" y1="68" x2="79" y2="82" />,
  ]

  // очі: звичайні → усміхнені (перемога) → хрестики (програш)
  const eyes = lost ? (
    <g strokeWidth="1.4">
      <path d="M64.5 31.5 L67.5 34.5 M67.5 31.5 L64.5 34.5" />
      <path d="M72.5 31.5 L75.5 34.5 M75.5 31.5 L72.5 34.5" />
    </g>
  ) : won ? (
    <g strokeWidth="1.4">
      <path d="M64.5 34 Q66 31.5 67.5 34" />
      <path d="M72.5 34 Q74 31.5 75.5 34" />
    </g>
  ) : (
    <g fill="currentColor" stroke="none">
      <circle cx="66" cy="33" r="1.2" />
      <circle cx="74" cy="33" r="1.2" />
    </g>
  )

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={`Помилок: ${stage}`}
      className={`shrink-0 ${className}`}
    >
      {/* шибениця: основа з травою, стовп, перекладина з підпорою, мотузка */}
      <g className="text-muted">
        <line x1="12" y1="94" x2="60" y2="94" />
        <path
          d="M15 94 l-2 -4 M17 94 l0 -5 M19 94 l2 -4 M50 94 l-2 -3 M52 94 l1 -4"
          strokeWidth="1.2"
        />
        <line x1="28" y1="94" x2="28" y2="10" />
        <line x1="28" y1="10" x2="70" y2="10" />
        <line x1="28" y1="24" x2="42" y2="10" strokeWidth="1.6" />
        <line x1="70" y1="10" x2="70" y2="25" strokeWidth="1.4" />
      </g>

      {/* ворона прилітає після третьої помилки й поглядає вниз */}
      {stage >= 3 && (
        <motion.g
          className="text-fg"
          fill="currentColor"
          stroke="none"
          initial={{ opacity: 0, x: -14, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: lost ? 0 : [0, -8, 0] }}
          transition={{
            duration: 0.6,
            rotate: { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 },
          }}
          style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
        >
          <ellipse cx="46" cy="7" rx="4.2" ry="2.6" />
          <circle cx="50.2" cy="5" r="1.9" />
          <path d="M51.8 4.6 L54.4 5.4 L51.8 6 Z" />
          <path d="M42 7 L38.5 5.2 L39 8.6 Z" />
          <line x1="45" y1="9.4" x2="45" y2="10" stroke="currentColor" strokeWidth="0.8" />
          <line x1="47" y1="9.4" x2="47" y2="10" stroke="currentColor" strokeWidth="0.8" />
        </motion.g>
      )}

      <g className={won ? 'text-accent' : 'text-bad'}>
        {parts.slice(0, stage).map((p) => appear(String(p.key), p))}
        {stage >= 1 && eyes}
        {/* брови хвилювання — після четвертої помилки */}
        {stage >= 4 && !won && (
          <path d="M63.5 29.5 L67.5 30.5 M76.5 29.5 L72.5 30.5" strokeWidth="1.3" />
        )}
        {/* піт — після п’ятої */}
        {stage >= 5 && !lost && !won && (
          <motion.path
            d="M82 27 Q80 31 82 32 Q84 31 82 27 Z"
            fill="var(--map-water)"
            stroke="none"
            animate={{ y: [0, 4, 0], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
      </g>
    </svg>
  )
}
