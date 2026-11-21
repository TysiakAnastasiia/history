import { AnimatePresence, motion } from 'motion/react'
import { use, useEffect, useRef, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Fact } from '../lib/schema'
import { playResult } from '../lib/sound'
import { rnd, shuffle } from '../lib/util'
import { eventsWithDistinctYears, noYears } from './facts'

/**
 * Морський бій: кораблі — ланцюжки подій (сусідні за часом).
 * Щоб вистрілити, треба дати правильну пару «дата + подія»; помилка — промах.
 */
const N = 7
const FLEET = [4, 3, 2, 2]
const BOT_ACCURACY = 0.65 // як часто бот «відповідає» правильно
const RECORD = 'battleship' // перемог

interface Ship {
  cells: [number, number][]
  events: Fact[] // по події на палубу, у хронологічному порядку
}
type Board = { ships: Ship[]; shots: Set<string> }

const key = (r: number, c: number) => `${r},${c}`

/** Розставити кораблі випадково, не торкаючись один одного */
function placeShips(chains: Fact[][]): Ship[] {
  for (let attempt = 0; attempt < 500; attempt++) {
    const taken = new Set<string>()
    const ships: Ship[] = []
    let ok = true
    for (const chain of chains) {
      let placed = false
      for (let t = 0; t < 100 && !placed; t++) {
        const down = Math.random() < 0.5
        const r = Math.floor(Math.random() * (down ? N - chain.length + 1 : N))
        const c = Math.floor(Math.random() * (down ? N : N - chain.length + 1))
        const cells = chain.map(
          (_, i) => [r + (down ? i : 0), c + (down ? 0 : i)] as [number, number],
        )
        // жодна палуба не торкається інших кораблів (навіть по діагоналі)
        const clash = cells.some(([a, b]) =>
          [-1, 0, 1].some((dr) => [-1, 0, 1].some((dc) => taken.has(key(a + dr, b + dc)))),
        )
        if (clash) continue
        cells.forEach(([a, b]) => taken.add(key(a, b)))
        ships.push({ cells, events: chain })
        placed = true
      }
      if (!placed) {
        ok = false
        break
      }
    }
    if (ok) return ships
  }
  throw new Error('Не вдалося розставити кораблі')
}

/** Ланцюжки: події, відсортовані за роком, нарізані на шматки довжини кораблів */
function makeChains(events: Fact[]): Fact[][] {
  const sorted = [...events].sort((a, b) => a.year! - b.year!)
  const total = FLEET.reduce((s, n) => s + n, 0)
  const start = Math.floor(Math.random() * Math.max(1, sorted.length - total + 1))
  const slice = sorted.slice(start, start + total)
  const chains: Fact[][] = []
  let i = 0
  for (const len of shuffle(FLEET)) {
    chains.push(slice.slice(i, i + len))
    i += len
  }
  return chains.sort((a, b) => b.length - a.length)
}

const shipAt = (b: Board, r: number, c: number) =>
  b.ships.find((s) => s.cells.some(([a, d]) => a === r && d === c))
const isSunk = (b: Board, s: Ship) => s.cells.every(([r, c]) => b.shots.has(key(r, c)))
const allSunk = (b: Board) => b.ships.every((s) => isSunk(b, s))

export function Battleship() {
  const facts = use(loadAll()).flatMap((p) => p.facts)
  const events = eventsWithDistinctYears(facts)
  const [round, setRound] = useState(0)
  const need = FLEET.reduce((s, n) => s + n, 0)
  if (events.length < need)
    return (
      <Screen>
        <BackBar />
        <p className="text-muted">Поки що замало подій із датами для гри.</p>
      </Screen>
    )
  return <Game key={round} events={events} onRestart={() => setRound((r) => r + 1)} />
}

interface Question {
  event: Fact
  options: number[]
}

function Game({ events, onRestart }: { events: Fact[]; onRestart: () => void }) {
  const { profile, update } = useProfile()
  const [enemy, setEnemy] = useState<Board>(() => ({
    ships: placeShips(makeChains(events)),
    shots: new Set(),
  }))
  const [mine, setMine] = useState<Board>(() => ({
    ships: placeShips(makeChains(events)),
    shots: new Set(),
  }))
  const [target, setTarget] = useState<[number, number] | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [log, setLog] = useState<string>('Виберіть клітинку на полі суперника.')
  const [turn, setTurn] = useState<'me' | 'bot'>('me')
  const [sunkMsg, setSunkMsg] = useState<Ship | null>(null)
  const over = allSunk(enemy) ? 'won' : allSunk(mine) ? 'lost' : null
  const record = profile.gameRecords[RECORD]

  // Питання: подія + 4 роки (рік правильний і три сусідні за часом — щоб було непросто)
  const ask = (r: number, c: number) => {
    if (turn !== 'me' || over || enemy.shots.has(key(r, c))) return
    const event = rnd(events)
    const others = shuffle(events.filter((e) => e.id !== event.id && e.year !== event.year))
      .sort((a, b) => Math.abs(a.year! - event.year!) - Math.abs(b.year! - event.year!))
      .slice(0, 3)
      .map((e) => e.year!)
    setTarget([r, c])
    setQuestion({ event, options: shuffle([event.year!, ...others]) })
  }

  const answer = (year: number) => {
    if (!question || !target) return
    const ok = year === question.event.year
    const [r, c] = target
    setQuestion(null)
    setTarget(null)
    if (!ok) {
      playResult(false, profile.sound)
      setLog(`Ні: ${noYears(question.event.title)} — ${question.event.year} р. Постріл повз.`)
      setTurn('bot')
      return
    }
    const shots = new Set(enemy.shots).add(key(r, c))
    const next = { ...enemy, shots }
    setEnemy(next)
    const ship = shipAt(next, r, c)
    playResult(!!ship, profile.sound)
    if (ship && isSunk(next, ship)) {
      setSunkMsg(ship)
      setLog('Корабель потоплено!')
    } else setLog(ship ? 'Влучання! Стріляйте ще.' : 'Правильно, але мимо — порожня клітинка.')
    // влучив — ходить ще раз, як у звичайному морському бої
    if (!ship) setTurn('bot')
  }

  // хід бота: рахуємо від поточного стану поля, без побічних дій усередині setState
  useEffect(() => {
    if (turn !== 'bot' || over) return
    const t = setTimeout(() => {
      const b = mine
      const open = (r: number, c: number) =>
        r >= 0 && c >= 0 && r < N && c < N && !b.shots.has(key(r, c))
      // добиваємо поранений корабель, якщо є
      const wounded = [...b.shots]
        .map((x) => x.split(',').map(Number) as [number, number])
        .filter(([r, c]) => {
          const ship = shipAt(b, r, c)
          return ship && !isSunk(b, ship)
        })
      const around = wounded
        .flatMap(
          ([r, c]) =>
            [
              [r + 1, c],
              [r - 1, c],
              [r, c + 1],
              [r, c - 1],
            ] as [number, number][],
        )
        .filter(([r, c]) => open(r, c))
      const all: [number, number][] = []
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (open(r, c)) all.push([r, c])
      if (Math.random() > BOT_ACCURACY) {
        setLog('Суперник помилився з датою — його постріл повз. Ваш хід.')
        setTurn('me')
        return
      }
      const [r, c] = around.length ? rnd(around) : rnd(all)
      const nb = { ...b, shots: new Set(b.shots).add(key(r, c)) }
      const hit = shipAt(nb, r, c)
      setMine(nb)
      setLog(
        hit ? 'Суперник влучив у ваш корабель і стріляє ще.' : 'Суперник промахнувся. Ваш хід.',
      )
      if (!hit) setTurn('me')
    }, 900)
    return () => clearTimeout(t)
  }, [turn, over, mine])

  // результат гри зараховуємо один раз
  const counted = useRef(false)
  useEffect(() => {
    if (!over || counted.current) return
    counted.current = true
    playResult(over === 'won', profile.sound)
    update((p) => ({
      ...p,
      xp: p.xp + (over === 'won' ? 40 : 10),
      gameRecords:
        over === 'won'
          ? { ...p.gameRecords, [RECORD]: (p.gameRecords[RECORD] ?? 0) + 1 }
          : p.gameRecords,
    }))
  }, [over, update, profile.sound])

  return (
    <Screen wide>
      <BackBar>Морський бій{record ? ` · перемог ${record}` : ''}</BackBar>
      <Title>Морський бій</Title>
      <p className="text-muted" aria-live="polite">
        {over ? '' : turn === 'bot' ? 'Хід суперника…' : log}
      </p>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <BoardView
          title="Поле суперника"
          board={enemy}
          hideShips={!over}
          onCell={ask}
          active={turn === 'me' && !over}
          target={target}
        />
        <BoardView title="Ваш флот" board={mine} hideShips={false} small />
      </div>

      <AnimatePresence>
        {question && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            <Card>
              <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
                Постріл: коли це було?
              </p>
              <p className="font-display mt-1 text-2xl leading-snug">
                {noYears(question.event.title)}
              </p>
            </Card>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {question.options.map((y) => (
                <Button
                  key={y}
                  className="font-display justify-center text-2xl"
                  onClick={() => answer(y)}
                >
                  {y}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sunkMsg && !question && (
        <Card>
          <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
            Потоплено ланцюжок подій
          </p>
          <ol className="mt-2 flex flex-col gap-1">
            {sunkMsg.events.map((e) => (
              <li key={e.id}>
                <b className="font-display mr-2 text-lg">{e.year}</b>
                {noYears(e.title)}
              </li>
            ))}
          </ol>
          <button className="text-muted mt-2 text-sm underline" onClick={() => setSunkMsg(null)}>
            Сховати
          </button>
        </Card>
      )}

      {over && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <Card className="flex items-center gap-4">
            <Mascot mood={over === 'won' ? 'happy' : 'sad'} size={90} />
            <div>
              <div
                className={`text-2xl font-semibold ${over === 'won' ? 'text-accent-text' : 'text-bad'}`}
              >
                {over === 'won' ? 'Моя вам повага' : 'Лошара'}
              </div>
              <p className="text-muted text-sm">
                {over === 'won'
                  ? 'Флот суперника потоплено · +40 XP'
                  : 'Ваш флот потоплено · +10 XP за спробу'}
              </p>
            </div>
          </Card>
          <Button variant="primary" onClick={onRestart}>
            Ще бій
          </Button>
          <LinkButton to="/" className="justify-center rounded-full">
            На головну
          </LinkButton>
        </motion.div>
      )}
    </Screen>
  )
}

function BoardView({
  title,
  board,
  hideShips,
  onCell,
  active = false,
  target,
  small = false,
}: {
  title: string
  board: Board
  hideShips: boolean
  onCell?: (r: number, c: number) => void
  active?: boolean
  target?: [number, number] | null
  small?: boolean
}) {
  return (
    <div className={small ? 'md:w-64 md:shrink-0' : 'min-w-0 flex-1'}>
      <h3 className="text-muted mb-2 text-xs font-semibold tracking-[0.18em] uppercase">{title}</h3>
      <div
        className={`grid gap-1 ${small ? 'mx-auto max-w-56 md:max-w-none' : 'mx-auto max-w-md'}`}
        style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: N * N }, (_, n) => {
          const r = Math.floor(n / N)
          const c = n % N
          const shot = board.shots.has(key(r, c))
          const ship = shipAt(board, r, c)
          const sunk = ship && isSunk(board, ship)
          const deck = ship
            ? ship.events[ship.cells.findIndex(([a, b]) => a === r && b === c)]
            : null
          const isTarget = target && target[0] === r && target[1] === c
          const cls = shot
            ? ship
              ? sunk
                ? 'border-bad bg-bad/40'
                : 'border-bad bg-bad/20'
              : 'border-line bg-[var(--map-sea)]'
            : ship && !hideShips
              ? 'border-fg/30 bg-fg/15'
              : 'border-line bg-glass'
          return (
            <button
              key={n}
              disabled={!active || shot}
              onClick={() => onCell?.(r, c)}
              aria-label={`Клітинка ${r + 1}, ${c + 1}${shot ? (ship ? ', влучання' : ', промах') : ''}`}
              className={`flex aspect-square items-center justify-center rounded-md border text-[0.6rem] font-semibold transition sm:text-xs ${cls} ${
                active && !shot ? 'hover:border-accent cursor-crosshair' : ''
              } ${isTarget ? 'ring-accent ring-2' : ''}`}
            >
              {shot ? (ship ? (small ? '✕' : deck?.year) : '·') : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
