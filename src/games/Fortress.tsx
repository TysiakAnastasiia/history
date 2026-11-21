import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { use, useCallback, useEffect, useRef, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { SingleQuestion } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'

/**
 * Захист фортеці. Вороги-вершники скачуть до стін; правильна відповідь — стріла в найближчого.
 * Хвилі: печеніги → половці → монголи, кожна 5-та — хан. Серія з 3 — «Залп!», з 5 — «Підмога!» (+1 життя).
 * Помилка — вороги роблять ривок. Хто дійде до стіни — забирає життя.
 */
const HP = 3
const W = 400 // ширина поля в одиницях SVG
const H = 170
const WALL_X = 62 // де закінчується стіна
const LANES = [118, 136, 154]
const RECORD = 'fortress'

interface Kind {
  name: string
  hp: number
  speed: number // множник
  color: string
  size: number
  damage: number
}
const LIGHT = (name: string, color: string): Kind => ({
  name,
  hp: 1,
  speed: 1,
  color,
  size: 1,
  damage: 1,
})
const FAST = (name: string, color: string): Kind => ({
  name,
  hp: 1,
  speed: 1.3,
  color,
  size: 0.95,
  damage: 1,
})
const HEAVY = (name: string, color: string, hp = 2): Kind => ({
  name,
  hp,
  speed: 0.8,
  color,
  size: 1.12,
  damage: 1,
})
const KHAN: Kind = { name: 'Хан', hp: 5, speed: 0.6, color: '#b3463c', size: 1.45, damage: 2 }

/** Народ і склад хвилі */
function waveInfo(wave: number): { people: string; kinds: Kind[] } {
  if (wave <= 2) return { people: 'Печеніги', kinds: [LIGHT('Печеніг', '#8a6a45')] }
  if (wave <= 4)
    return { people: 'Половці', kinds: [FAST('Половець', '#6b7a4a'), HEAVY('Половець', '#4a5a6a')] }
  return {
    people: 'Монголи',
    kinds: [HEAVY('Монгол', '#5a3e2b'), HEAVY('Монгол', '#3a2e25', 3), FAST('Монгол', '#6b4a31')],
  }
}
const waveSize = (wave: number) => 3 + wave
const baseSpeed = (wave: number) => 11 + wave * 1.6 // одиниць за секунду
const SPAWN_EVERY = 2.4

interface Enemy {
  id: number
  x: number
  lane: number
  kind: Kind
  hp: number
}
interface Fx {
  id: number
  kind: 'arrow' | 'boom' | 'text'
  x: number
  y: number
  text?: string
}

export function Fortress() {
  const questions = use(loadAll())
    .flatMap((p) => p.questions)
    .filter((q): q is SingleQuestion => q.type === 'single' && !q.image && !q.map)
  const [round, setRound] = useState(0)
  if (questions.length < 10)
    return (
      <Screen>
        <BackBar to="/games" />
        <p className="text-muted">Поки що замало питань для гри.</p>
      </Screen>
    )
  return <Game key={round} questions={questions} onRestart={() => setRound((r) => r + 1)} />
}

function Game({ questions, onRestart }: { questions: SingleQuestion[]; onRestart: () => void }) {
  const { profile, update } = useProfile()
  const record = profile.gameRecords[RECORD]
  const shake = useAnimationControls()

  const g = useRef({
    enemies: [] as Enemy[],
    nextId: 1,
    wave: 1,
    spawned: 0,
    spawnTimer: 0,
    banner: 2.2, // секунд показу банера хвилі (без нових ворогів)
    hp: HP,
    killed: 0,
    cleared: 0,
    streak: 0,
  })
  const [view, setView] = useState({
    enemies: [] as Enemy[],
    hp: HP,
    wave: 1,
    killed: 0,
    cleared: 0,
    streak: 0,
    banner: true,
  })
  const snap = () => {
    const x = g.current
    return {
      enemies: x.enemies.map((e) => ({ ...e })),
      hp: x.hp,
      wave: x.wave,
      killed: x.killed,
      cleared: x.cleared,
      streak: x.streak,
      banner: x.banner > 0,
    }
  }
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [fx, setFx] = useState<Fx[]>([])
  const fxId = useRef(1)
  const addFx = (f: Omit<Fx, 'id'>) => setFx((list) => [...list, { ...f, id: fxId.current++ }])
  const dropFx = (id: number) => setFx((list) => list.filter((f) => f.id !== id))

  const [deck, setDeck] = useState(() => shuffle(questions))
  const [qi, setQi] = useState(0)
  const [order, setOrder] = useState(() => shuffle([0, 1, 2, 3]))
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const q = deck[qi % deck.length]

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
        if (s.banner > 0) s.banner -= dt
        else {
          s.spawnTimer -= dt
          if (s.spawned < waveSize(s.wave) && s.spawnTimer <= 0) {
            const { kinds } = waveInfo(s.wave)
            const isKhan = s.wave % 5 === 0 && s.spawned === waveSize(s.wave) - 1
            const kind = isKhan ? KHAN : kinds[s.spawned % kinds.length]
            s.enemies = [
              ...s.enemies,
              { id: s.nextId++, x: W + 10, lane: s.spawned % LANES.length, kind, hp: kind.hp },
            ]
            s.spawned++
            s.spawnTimer = SPAWN_EVERY
          }
        }
        const speed = baseSpeed(s.wave)
        s.enemies = s.enemies.map((e) => ({ ...e, x: e.x - speed * e.kind.speed * dt }))
        const reached = s.enemies.filter((e) => e.x <= WALL_X + 6)
        if (reached.length) {
          s.hp -= reached.reduce((sum, e) => sum + e.kind.damage, 0)
          s.enemies = s.enemies.filter((e) => e.x > WALL_X + 6)
          s.streak = 0
          playResult(false, profile.sound)
          void shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } })
        }
        if (s.spawned >= waveSize(s.wave) && s.enemies.length === 0 && s.hp > 0 && s.banner <= 0) {
          s.cleared = s.wave
          s.wave++
          s.spawned = 0
          s.spawnTimer = 0
          s.banner = 2.2
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
    // snap читає лише ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, profile.sound, shake])

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

  /** Влучити в найближчого ворога; повертає true, якщо було в кого стріляти */
  const hitNearest = (st: typeof g.current) => {
    if (!st.enemies.length) return false
    const target = st.enemies.reduce((a, b) => (b.x < a.x ? b : a))
    const y = LANES[target.lane] - 14 * target.kind.size
    addFx({ kind: 'arrow', x: target.x, y })
    addFx({ kind: 'boom', x: target.x, y })
    const left = target.hp - 1
    if (left <= 0) {
      st.enemies = st.enemies.filter((e) => e.id !== target.id)
      st.killed++
    } else st.enemies = st.enemies.map((e) => (e.id === target.id ? { ...e, hp: left } : e))
    return true
  }

  const answer = (k: number) => {
    if (phase !== 'play') return
    const ok = k === q.answer
    const st = g.current
    setFlash(ok ? 'ok' : 'bad')
    setTimeout(() => setFlash(null), 350)
    playResult(ok, profile.sound)
    if (ok) {
      st.streak++
      hitNearest(st)
      if (st.streak % 3 === 0 && hitNearest(st))
        addFx({ kind: 'text', x: 220, y: 50, text: 'Залп!' })
      if (st.streak % 5 === 0 && st.hp < HP) {
        st.hp++
        addFx({ kind: 'text', x: 220, y: 74, text: 'Підмога! +1 ♥' })
      }
    } else {
      st.streak = 0
      // помилка: вороги роблять ривок
      st.enemies = st.enemies.map((e) => ({ ...e, x: e.x - 18 }))
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
  const info = waveInfo(s.wave)

  return (
    <Screen wide>
      <BackBar to="/games">Захист фортеці{record ? ` · рекорд: ${record} хвиль` : ''}</BackBar>
      <div className="flex items-end justify-between gap-4">
        <Title>Захист фортеці</Title>
        <div className="pb-2 text-right text-sm">
          <div
            className="text-bad text-xl tracking-widest"
            aria-label={`Життя: ${Math.max(0, s.hp)}`}
          >
            {'♥'.repeat(Math.max(0, s.hp))}
            <span className="text-muted">{'♡'.repeat(Math.max(0, HP - s.hp))}</span>
          </div>
          <div className="text-muted">
            хвиля {s.wave} · збито {s.killed}
            {s.streak > 1 && <span className="text-accent-text"> · серія {s.streak} 🔥</span>}
          </div>
        </div>
      </div>

      {/* поле бою */}
      <motion.div
        animate={shake}
        className="border-line relative overflow-hidden rounded-2xl border"
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full select-none"
          aria-label="Поле бою"
        >
          <defs>
            <linearGradient id="fort-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--bg-glow)" />
              <stop offset="1" stopColor="var(--map-sea)" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="url(#fort-sky)" />
          <circle cx="330" cy="34" r="16" fill="var(--accent)" opacity="0.55" />
          {[
            { y: 26, d: 38, w: 46 },
            { y: 44, d: 52, w: 34 },
          ].map((c, i) => (
            <motion.g
              key={i}
              initial={{ x: W + 40 }}
              animate={{ x: -80 }}
              transition={{ duration: c.d, repeat: Infinity, ease: 'linear', delay: i * -18 }}
            >
              <ellipse cx="0" cy={c.y} rx={c.w / 2} ry="6" fill="var(--fg)" opacity="0.12" />
              <ellipse
                cx={c.w / 4}
                cy={c.y - 4}
                rx={c.w / 4}
                ry="5"
                fill="var(--fg)"
                opacity="0.12"
              />
            </motion.g>
          ))}
          {/* далекі пагорби й степ */}
          <path
            d={`M0 100 Q60 80 120 96 T240 92 T${W} 90 V${H} H0 Z`}
            fill="var(--line)"
            opacity="0.6"
          />
          <rect y="104" width={W} height={H - 104} fill="var(--map-land)" />
          <rect y="104" width={W} height={H - 104} fill="var(--accent)" opacity="0.12" />
          {/* шлях, яким скачуть вороги */}
          <path
            d={`M${WALL_X} 140 Q200 128 ${W} 138`}
            stroke="var(--fg)"
            strokeWidth="22"
            opacity="0.06"
            fill="none"
          />
          {[150, 210, 280, 340, 380].map((x, i) => (
            <path
              key={i}
              d={`M${x} ${112 + (i % 3) * 18} l-3 -6 m3 6 l0 -7 m0 7 l3 -6`}
              stroke="var(--muted)"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}

          <Wall />

          {/* вороги */}
          {s.enemies.map((e) => (
            <Rider key={e.id} enemy={e} />
          ))}

          {/* ефекти */}
          <AnimatePresence>
            {fx.map((f) =>
              f.kind === 'arrow' ? (
                <motion.g
                  key={f.id}
                  initial={{ x: 0, y: 0 }}
                  animate={{ x: f.x - 58, y: f.y - 62 }}
                  transition={{ duration: 0.25, ease: 'easeIn' }}
                  onAnimationComplete={() => dropFx(f.id)}
                >
                  <line x1="50" y1="62" x2="60" y2="62" stroke="var(--fg)" strokeWidth="1.6" />
                  <path d="M60 62 l-3 -2 v4 Z" fill="var(--fg)" />
                </motion.g>
              ) : f.kind === 'boom' ? (
                <motion.circle
                  key={f.id}
                  cx={f.x}
                  cy={f.y}
                  r="10"
                  fill="var(--accent)"
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.2, 1.6] }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  onAnimationComplete={() => dropFx(f.id)}
                />
              ) : (
                <motion.text
                  key={f.id}
                  x={f.x}
                  y={f.y}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="700"
                  fill="var(--accent-text)"
                  stroke="var(--map-land)"
                  strokeWidth="3"
                  paintOrder="stroke"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -10] }}
                  transition={{ duration: 1.2 }}
                  onAnimationComplete={() => dropFx(f.id)}
                >
                  {f.text}
                </motion.text>
              ),
            )}
          </AnimatePresence>

          {/* банер хвилі */}
          <AnimatePresence>
            {phase === 'play' && s.banner && (
              <motion.g
                key={`banner-${s.wave}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <text
                  x={W / 2 + 25}
                  y="58"
                  textAnchor="middle"
                  fontSize="24"
                  fill="var(--fg)"
                  stroke="var(--map-land)"
                  strokeWidth="4"
                  paintOrder="stroke"
                  fontFamily="Cormorant Garamond, serif"
                >
                  Хвиля {s.wave} · {info.people}
                  {s.wave % 5 === 0 ? ' і хан' : ''}
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </svg>

        {phase === 'ready' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/25 p-4 text-center">
            <p className="max-w-sm text-sm font-medium text-white drop-shadow">
              Правильна відповідь — стріла в найближчого ворога. 3 поспіль — залп, 5 — підмога.
            </p>
            <Button variant="primary" className="w-auto! px-10" onClick={() => setPhase('play')}>
              До бою!
            </Button>
          </div>
        )}
        {flash === 'bad' && <div className="bg-bad/20 pointer-events-none absolute inset-0" />}
      </motion.div>

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
          <LinkButton to="/games" className="justify-center rounded-full">
            До ігор
          </LinkButton>
        </motion.div>
      ) : (
        <Card
          className={`transition-colors ${flash === 'ok' ? 'border-accent' : flash === 'bad' ? 'border-bad' : ''}`}
        >
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
        </Card>
      )}
    </Screen>
  )
}

/** Кам’яна фортеця з вежею, прапором і лучниками */
function Wall() {
  const ink = 'var(--fg)'
  return (
    <g>
      {/* стіна з зубцями */}
      <path
        d="M0 64 H8 V58 H16 V64 H24 V58 H32 V64 H40 V58 H48 V64 H56 V58 H62 V170 H0 Z"
        fill="var(--glass-strong)"
        stroke={ink}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* кладка */}
      {[78, 94, 110, 126, 142].map((y, i) => (
        <path
          key={y}
          d={`M0 ${y} H62 M${i % 2 ? 10 : 20} ${y} v16 M${i % 2 ? 34 : 44} ${y} v16`}
          stroke={ink}
          strokeWidth="0.6"
          opacity="0.3"
        />
      ))}
      {/* вежа */}
      <path
        d="M10 64 V22 H14 V16 H20 V22 H26 V16 H32 V22 H36 V64"
        fill="var(--glass-strong)"
        stroke={ink}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M20 40 a3 3 0 0 1 6 0 V48 H20 Z" fill={ink} opacity="0.7" />
      {/* брама */}
      <path d="M22 170 V146 a9 9 0 0 1 18 0 V170" fill={ink} opacity="0.75" />
      {/* прапор */}
      <line x1="23" y1="16" x2="23" y2="2" stroke={ink} strokeWidth="1.2" />
      <motion.path
        d="M23 2 L38 6 L23 10 Z"
        fill="var(--accent)"
        animate={{ skewY: [0, -6, 0, 5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        style={{ transformBox: 'fill-box', transformOrigin: 'left center' }}
      />
      {/* лучники на стіні */}
      {[44, 54].map((x) => (
        <g key={x} stroke={ink} strokeWidth="1.2" fill="none">
          <circle cx={x} cy="50" r="2.6" fill="var(--glass-strong)" />
          <line x1={x} y1="53" x2={x} y2="58" />
          <path d={`M${x + 2} 49 q4 4 0 8`} />
        </g>
      ))}
    </g>
  )
}

/** Вершник: кінь «скаче» (легке погойдування), над ним — запас міцності */
function Rider({ enemy }: { enemy: Enemy }) {
  const { kind } = enemy
  const y = LANES[enemy.lane]
  const s = kind.size * 1.25
  return (
    <g transform={`translate(${enemy.x} ${y}) scale(${s})`}>
      {/* пил з-під копит */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={12}
          cy={2}
          r={2.2}
          fill="var(--muted)"
          initial={{ opacity: 0.45, x: 0, scale: 0.6 }}
          animate={{ opacity: 0, x: 14, y: -4, scale: 1.6 }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.27 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
      <motion.g
        animate={{ rotate: [-3, 3, -3], y: [0, -1.5, 0] }}
        transition={{ duration: 0.45, repeat: Infinity }}
        style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
      >
        {/* кінь */}
        <ellipse cx="0" cy="-8" rx="10" ry="5" fill={kind.color} />
        <path d="M-9 -10 L-14 -17 L-11 -18 L-6 -12 Z" fill={kind.color} />
        <path
          d="M-7 -4 L-9 3 M-2 -4 L-3 3 M4 -4 L5 3 M8 -5 L10 2"
          stroke={kind.color}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M10 -9 q5 1 6 6" stroke={kind.color} strokeWidth="1.6" fill="none" />
        {/* вершник */}
        <path d="M-1 -13 L1 -22 L4 -13 Z" fill="var(--fg)" opacity="0.85" />
        <circle cx="1.5" cy="-24.5" r="2.6" fill="var(--fg)" opacity="0.85" />
        <line x1="-6" y1="-27" x2="8" y2="-16" stroke="var(--fg)" strokeWidth="1" opacity="0.8" />
      </motion.g>
      {/* міцність */}
      {kind.hp > 1 &&
        Array.from({ length: kind.hp }, (_, i) => (
          <rect
            key={i}
            x={-kind.hp * 3 + i * 6}
            y={-34}
            width="4.5"
            height="2.6"
            rx="1"
            fill={i < enemy.hp ? 'var(--bad)' : 'var(--line)'}
          />
        ))}
    </g>
  )
}
