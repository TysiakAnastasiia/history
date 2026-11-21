import { AnimatePresence, motion } from 'motion/react'
import { use, useCallback, useEffect, useRef, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { SingleQuestion } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'

/**
 * Захист фортеці: вороги йдуть до стін, кожна правильна відповідь — постріл у найближчого.
 * Хвилі: печеніги → половці → монголи; кожна наступна численніша й швидша.
 */
const HP = 3
const WALL = 7 // % ширини поля, де стоїть фортеця
const RECORD = 'fortress' // найбільше відбитих хвиль

const enemyName = (wave: number) => (wave <= 2 ? 'Печеніг' : wave <= 4 ? 'Половець' : 'Монгол')
const waveSize = (wave: number) => 3 + wave
const waveSpeed = (wave: number) => 3.2 + wave * 0.7 // % поля за секунду
const SPAWN_EVERY = 2.6 // с

interface Enemy {
  id: number
  x: number // 100 — праворуч, 0 — біля стін
  lane: number // 0..2 — ряд
}

export function Fortress() {
  const questions = use(loadAll())
    .flatMap((p) => p.questions)
    .filter((q): q is SingleQuestion => q.type === 'single' && !q.image && !q.map)
  const [round, setRound] = useState(0)
  if (questions.length < 10)
    return (
      <Screen>
        <BackBar />
        <p className="text-muted">Поки що замало питань для гри.</p>
      </Screen>
    )
  return <Game key={round} questions={questions} onRestart={() => setRound((r) => r + 1)} />
}

function Game({ questions, onRestart }: { questions: SingleQuestion[]; onRestart: () => void }) {
  const { profile, update } = useProfile()
  const record = profile.gameRecords[RECORD]

  // стан гри живе в ref (оновлюється щокадру), а на екран — через лічильник кадрів
  const g = useRef({
    enemies: [] as Enemy[],
    nextId: 1,
    wave: 1,
    spawned: 0,
    spawnTimer: 0,
    hp: HP,
    killed: 0,
    cleared: 0,
  })
  // знімок стану для екрана (ref не читаємо під час рендеру)
  const snap = () => {
    const x = g.current
    return {
      enemies: x.enemies.map((e) => ({ ...e })),
      hp: x.hp,
      wave: x.wave,
      killed: x.killed,
      cleared: x.cleared,
    }
  }
  const [view, setView] = useState({
    enemies: [] as Enemy[],
    hp: HP,
    wave: 1,
    killed: 0,
    cleared: 0,
  })
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [deck, setDeck] = useState(() => shuffle(questions))
  const [qi, setQi] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const [shot, setShot] = useState<Enemy | null>(null)

  const q = deck[qi % deck.length]
  const [order, setOrder] = useState(() => shuffle([0, 1, 2, 3]))

  const nextQuestion = useCallback(() => {
    setOrder(shuffle([0, 1, 2, 3]))
    setQi((i) => {
      if (i + 1 >= deck.length) {
        setDeck(shuffle(questions))
        return 0
      }
      return i + 1
    })
  }, [deck.length, questions])

  // ігровий цикл
  useEffect(() => {
    if (phase !== 'play') return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const s = g.current
      if (!document.hidden) {
        // нові вороги
        s.spawnTimer -= dt
        if (s.spawned < waveSize(s.wave) && s.spawnTimer <= 0) {
          s.enemies.push({ id: s.nextId++, x: 100, lane: s.spawned % 3 })
          s.spawned++
          s.spawnTimer = SPAWN_EVERY
        }
        // рух
        const speed = waveSpeed(s.wave)
        for (const e of s.enemies) e.x -= speed * dt
        // дійшли до стін
        const reached = s.enemies.filter((e) => e.x <= WALL)
        if (reached.length) {
          s.hp -= reached.length
          s.enemies = s.enemies.filter((e) => e.x > WALL)
          playResult(false, profile.sound)
        }
        // хвилю відбито
        if (s.spawned >= waveSize(s.wave) && s.enemies.length === 0 && s.hp > 0) {
          s.cleared = s.wave
          s.wave++
          s.spawned = 0
          s.spawnTimer = 3
        }
        if (s.hp <= 0) {
          setView(snap())
          setPhase('over')
          return
        }
      }
      setView(snap())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, profile.sound])

  // кінець гри: XP і рекорд — один раз
  const counted = useRef(false)
  useEffect(() => {
    if (phase !== 'over' || counted.current) return
    counted.current = true
    const s = g.current
    update((p) => ({
      ...p,
      xp: p.xp + s.killed * 3,
      gameRecords: { ...p.gameRecords, [RECORD]: Math.max(p.gameRecords[RECORD] ?? 0, s.cleared) },
    }))
  }, [phase, update])

  const answer = (k: number) => {
    if (phase !== 'play') return
    const ok = k === q.answer
    const st = g.current
    setFlash(ok ? 'ok' : 'bad')
    setTimeout(() => setFlash(null), 400)
    playResult(ok, profile.sound)
    if (ok && st.enemies.length) {
      // постріл у найближчого до стін
      const target = st.enemies.reduce((a, b) => (b.x < a.x ? b : a))
      st.enemies = st.enemies.filter((e) => e.id !== target.id)
      st.killed++
      setShot(target)
    } else if (!ok) {
      // помилка: вороги роблять ривок уперед
      st.enemies = st.enemies.map((e) => ({ ...e, x: e.x - 6 }))
    }
    setView(snap())
    nextQuestion()
  }

  // клавіші 1–4
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4) answer(order[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const s = view

  return (
    <Screen wide>
      <BackBar>Захист фортеці{record ? ` · рекорд: ${record} хвиль` : ''}</BackBar>
      <div className="flex items-end justify-between gap-4">
        <Title>Захист фортеці</Title>
        <div className="pb-2 text-right text-sm">
          <div
            className="text-bad text-lg tracking-widest"
            aria-label={`Життя: ${Math.max(0, s.hp)}`}
          >
            {'♥'.repeat(Math.max(0, s.hp))}
            <span className="text-muted">{'♡'.repeat(HP - Math.max(0, s.hp))}</span>
          </div>
          <div className="text-muted">
            хвиля {s.wave} · збито {s.killed}
          </div>
        </div>
      </div>

      {/* поле бою */}
      <div className="border-line relative h-44 overflow-hidden rounded-2xl border bg-[var(--map-land)] sm:h-52">
        {/* фортеця */}
        <svg
          viewBox="0 0 40 60"
          className="text-fg absolute top-1/2 left-1 h-[85%] -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 58V14h6v6h6v-6h6v6h6v-6h6v44Z" fill="var(--glass-strong)" />
          <path d="M16 58V44a4 4 0 0 1 8 0v14" />
          <path d="M20 14V4l8 3-8 3" />
        </svg>
        {/* вороги */}
        {s.enemies.map((e) => (
          <div
            key={e.id}
            className="bg-bad/90 absolute flex h-7 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap text-white shadow"
            style={{ left: `${e.x}%`, top: `${18 + e.lane * 28}%` }}
          >
            {enemyName(s.wave)}
          </div>
        ))}
        {/* постріл */}
        <AnimatePresence>
          {shot && (
            <motion.div
              key={shot.id}
              className="bg-accent absolute h-1 rounded-full"
              style={{ top: `calc(${18 + shot.lane * 28}% + 0.8rem)`, left: '10%' }}
              initial={{ width: 0, opacity: 1 }}
              animate={{ width: `${Math.max(0, shot.x - 10)}%`, opacity: 0 }}
              transition={{ duration: 0.35 }}
              onAnimationComplete={() => setShot(null)}
            />
          )}
        </AnimatePresence>
        {phase === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <Button variant="primary" className="w-auto! px-8" onClick={() => setPhase('play')}>
              До бою!
            </Button>
          </div>
        )}
      </div>

      {phase === 'over' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <Card className="flex items-center gap-4">
            <Mascot mood={s.cleared >= 2 ? 'happy' : 'sad'} size={90} />
            <div>
              <div
                className={`text-2xl font-semibold ${s.cleared >= 2 ? 'text-accent-text' : 'text-bad'}`}
              >
                {s.cleared >= 2 ? 'Моя вам повага' : 'Лошара'}
              </div>
              <p className="text-muted text-sm">
                Фортеця впала на {s.wave}-й хвилі · відбито хвиль: {s.cleared} · збито ворогів:{' '}
                {s.killed} · +{s.killed * 3} XP
              </p>
            </div>
          </Card>
          <Button variant="primary" onClick={onRestart}>
            Ще раз
          </Button>
          <LinkButton to="/" className="justify-center rounded-full">
            На головну
          </LinkButton>
        </motion.div>
      ) : (
        <Card className={flash === 'ok' ? 'border-accent' : flash === 'bad' ? 'border-bad' : ''}>
          <h2 className="mb-3 text-lg leading-snug font-semibold">{q.prompt}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {order.map((k, pos) => (
              <Button
                key={k}
                disabled={phase !== 'play'}
                onClick={() => answer(k)}
                className="min-h-12 py-2 text-sm disabled:opacity-50"
              >
                <span className="text-muted w-4 shrink-0 text-xs">{pos + 1}</span>
                {q.options[k].text}
              </Button>
            ))}
          </div>
          <p className="text-muted mt-3 text-xs">
            Правильна відповідь — постріл. Помилка — вороги роблять ривок.
          </p>
        </Card>
      )}
    </Screen>
  )
}
