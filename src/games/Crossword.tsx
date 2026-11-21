import { motion } from 'motion/react'
import { use, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { INDEX, loadAll, topicTitle } from '../content'
import { useProfile } from '../lib/profile'
import type { TopicPack } from '../lib/schema'
import { playResult } from '../lib/sound'
import { cellsOf, generate, type Crossword as CW, type Entry, type Placed } from './crossword-gen'
import { personName } from './facts'

/** Кросворд із термінів і діячів програми; режими «по темі» і «змішаний» */
const RECORD = 'crossword' // скільки кросвордів розгадано
const HINT_COST = 5
const LETTER = /^[А-ЩЬЮЯҐЄІЇ]$/

const k = (r: number, c: number) => `${r},${c}`
const clean = (s: string) => s.toUpperCase().replace(/[’'`]/g, '')

/** Слова для кросворду: терміни й діячі з одного слова, лише українські літери */
function entriesOf(packs: TopicPack[]): Entry[] {
  const facts = packs.flatMap((p) => p.facts)
  const out: Entry[] = []
  for (const f of facts) {
    if (!f.details) continue
    const raw = f.kind === 'term' ? f.title : f.kind === 'person' ? personName(f.title) : null
    if (!raw) continue
    const word = clean(raw)
    if (word.length < 3 || ![...word].every((ch) => LETTER.test(ch))) continue
    out.push({ word, clue: f.details })
  }
  // без повторів слова
  return [...new Map(out.map((e) => [e.word, e])).values()]
}

export function Crossword() {
  const packs = use(loadAll())
  const topics = Object.keys(INDEX).map(Number)
  const [mode, setMode] = useState<number | 'mix'>('mix')
  const [seed, setSeed] = useState(0)
  // на вузькому екрані — лише слова до 10 літер, щоб клітинки не були дрібними
  const maxLen = typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 16
  const pool = useMemo(
    () =>
      entriesOf(mode === 'mix' ? packs : packs.filter((p) => p.topic === mode)).filter(
        (e) => e.word.length <= maxLen,
      ),
    [packs, mode, maxLen],
  )
  // seed у залежностях: «Новий кросворд» генерує іншу сітку
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cw = useMemo(() => generate(pool, 10), [pool, seed])

  return (
    <Screen wide>
      <BackBar to="/games">Кросворд</BackBar>
      <Title>Кросворд</Title>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Режим">
        {(['mix', ...topics] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setSeed((s) => s + 1)
            }}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              mode === m
                ? 'border-primary bg-primary text-primary-fg'
                : 'border-line bg-glass hover:border-fg/25'
            }`}
          >
            {m === 'mix' ? 'Змішаний' : `Тема ${m}: ${topicTitle(m).split(' (')[0]}`}
          </button>
        ))}
      </div>
      {cw ? (
        <Board key={`${String(mode)}-${seed}`} cw={cw} onNew={() => setSeed((s) => s + 1)} />
      ) : (
        <p className="text-muted">Замало слів для кросворду в цьому режимі.</p>
      )}
    </Screen>
  )
}

function Board({ cw, onNew }: { cw: CW; onNew: () => void }) {
  const { profile, update } = useProfile()
  const [letters, setLetters] = useState<Record<string, string>>({})
  const [active, setActive] = useState(0) // індекс слова
  const [wrong, setWrong] = useState<Set<string>>(new Set())
  const [solved, setSolved] = useState(false)
  /** слова, відповідь на які показано (за них XP не дається) */
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  /** повідомлення про щойно заповнене слово */
  const [note, setNote] = useState<{ i: number; ok: boolean } | null>(null)
  /** підсумок після «Перевірити» */
  const [showSummary, setShowSummary] = useState(false)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  // правильна літера для кожної клітинки
  const solution = useMemo(() => {
    const m: Record<string, string> = {}
    for (const w of cw.words) cellsOf(w).forEach(([r, c], i) => (m[k(r, c)] = w.word[i]))
    return m
  }, [cw])
  const numbers = useMemo(() => {
    const m: Record<string, number> = {}
    for (const w of cw.words) m[k(w.row, w.col)] = w.num
    return m
  }, [cw])

  /** right — заповнено правильно, wrong — заповнено з помилками, open — не до кінця */
  const statusOf = (w: Placed, l: Record<string, string> = letters) => {
    const cells = cellsOf(w).map(([r, c]) => k(r, c))
    if (cells.some((x) => !l[x])) return 'open' as const
    return cells.every((x) => l[x] === solution[x]) ? ('right' as const) : ('wrong' as const)
  }
  const rightCells = new Set(
    cw.words
      .filter((w) => statusOf(w) === 'right')
      .flatMap((w) => cellsOf(w).map(([r, c]) => k(r, c))),
  )
  // у заповнених, але неправильних словах одразу видно хибні літери
  const badCells = new Set([
    // позначені «Перевірити» — лише поки літера там досі неправильна
    ...[...wrong].filter((x) => letters[x] !== solution[x]),
    ...cw.words
      .filter((w) => statusOf(w) === 'wrong')
      .flatMap((w) => cellsOf(w).map(([r, c]) => k(r, c)))
      .filter((x) => letters[x] !== solution[x]),
  ])

  const finishIfDone = (l: Record<string, string>) => {
    if (solved || !cw.words.every((w) => statusOf(w, l) === 'right')) return
    setSolved(true)
    const earned = (cw.words.length - revealed.size) * 4
    update((p) => ({
      ...p,
      xp: p.xp + earned,
      gameRecords: { ...p.gameRecords, [RECORD]: (p.gameRecords[RECORD] ?? 0) + 1 },
    }))
    playResult(true, profile.sound)
  }

  const counts = {
    right: cw.words.filter((w) => statusOf(w) === 'right').length,
    bad: cw.words.filter((w) => statusOf(w) === 'wrong').length,
    open: cw.words.filter((w) => statusOf(w) === 'open').length,
  }

  const word = cw.words[active]
  const activeCells = new Set(cellsOf(word).map(([r, c]) => k(r, c)))

  const focus = (r: number, c: number) => inputs.current[k(r, c)]?.focus()
  const wordsAt = (r: number, c: number) =>
    cw.words
      .map((w, i) => ({ w, i }))
      .filter(({ w }) => cellsOf(w).some(([a, b]) => a === r && b === c))

  const selectCell = (r: number, c: number) => {
    const here = wordsAt(r, c)
    if (here.length === 0) return
    // залишаємо поточний напрямок, якщо клітинка в ньому є
    const same = here.find(({ w }) => w.dir === word.dir)
    setActive((same ?? here[0]).i)
  }

  const step = (r: number, c: number, d: 1 | -1) => {
    const cells = cellsOf(word)
    const idx = cells.findIndex(([a, b]) => a === r && b === c)
    const next = cells[idx + d]
    if (next) focus(next[0], next[1])
  }

  const setLetter = (r: number, c: number, ch: string) => {
    const next = { ...letters, [k(r, c)]: ch }
    // слова, що проходять через клітинку: якщо якесь щойно заповнилося — кажемо, правильно чи ні
    const before = wordsAt(r, c).map(({ w, i }) => ({
      i,
      was: statusOf(w),
      now: statusOf(w, next),
    }))
    const done = before.find((x) => x.was !== x.now && x.now !== 'open')
    if (done) {
      setNote({ i: done.i, ok: done.now === 'right' })
      if (done.now === 'wrong') playResult(false, profile.sound)
      else if (!cw.words.every((w) => statusOf(w, next) === 'right'))
        playResult(true, profile.sound)
    }
    setLetters(next)
    finishIfDone(next)
    setWrong((w) => {
      const n = new Set(w)
      n.delete(k(r, c))
      return n
    })
  }

  const onKey = (e: KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    const move: Record<string, [number, number]> = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
    }
    if (move[e.key]) {
      e.preventDefault()
      const [dr, dc] = move[e.key]
      if (solution[k(r + dr, c + dc)]) {
        focus(r + dr, c + dc)
        const here = wordsAt(r + dr, c + dc)
        const dir = dr !== 0 ? 'down' : 'across'
        const pick = here.find(({ w }) => w.dir === dir) ?? here[0]
        if (pick) setActive(pick.i)
      }
    } else if (e.key === 'Backspace' && !letters[k(r, c)]) {
      e.preventDefault()
      step(r, c, -1)
    }
  }

  const check = () => {
    setWrong(new Set(Object.keys(solution).filter((x) => letters[x] && letters[x] !== solution[x])))
    setShowSummary(true)
    const st = cw.words.map((w) => statusOf(w))
    playResult(
      st.every((x) => x === 'right'),
      profile.sound,
    )
  }

  const reveal = (i: number) => {
    const next = { ...letters }
    cellsOf(cw.words[i]).forEach(([r, c]) => (next[k(r, c)] = solution[k(r, c)]))
    setRevealed((s) => new Set(s).add(i))
    setLetters(next)
    setNote({ i, ok: true })
    finishIfDone(next)
  }

  const hint = () => {
    if (profile.xp < HINT_COST) return
    const cell = cellsOf(word).find(([r, c]) => letters[k(r, c)] !== solution[k(r, c)])
    if (!cell) return
    update((p) => ({ ...p, xp: Math.max(0, p.xp - HINT_COST) }))
    setLetter(cell[0], cell[1], solution[k(cell[0], cell[1])])
    focus(cell[0], cell[1])
  }

  const across = cw.words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => w.dir === 'across')
    .sort((a, b) => a.w.num - b.w.num)
  const down = cw.words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => w.dir === 'down')
    .sort((a, b) => a.w.num - b.w.num)

  return (
    <>
      {/* поточне питання — завжди перед очима (на телефоні — над сіткою) */}
      <Card className="sticky top-2 z-10 py-4">
        <p className="text-muted text-xs font-semibold tracking-[0.18em] uppercase">
          {word.num} · {word.dir === 'across' ? 'по горизонталі' : 'по вертикалі'} ·{' '}
          {word.word.length} літер
        </p>
        <p className="font-display mt-1 text-xl leading-snug">{word.clue}</p>
        {note && (
          <div
            className={`mt-2 border-t pt-2 text-sm ${note.ok ? 'border-accent/40' : 'border-bad/40'}`}
            aria-live="polite"
          >
            {note.ok ? (
              <p>
                <b className="text-accent-text">
                  ✓ {cw.words[note.i].word}
                  {revealed.has(note.i) ? ' — відповідь' : ' — правильно!'}
                </b>{' '}
                <span className="text-muted">{cw.words[note.i].clue}</span>
              </p>
            ) : (
              <p className="text-bad">
                ✗ У слові {cw.words[note.i].num} є помилка — червоні літери неправильні.{' '}
                <button className="underline" onClick={() => reveal(note.i)}>
                  Показати відповідь
                </button>
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="mx-auto w-full" style={{ maxWidth: cw.cols * 46 }}>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${cw.cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cw.rows * cw.cols }, (_, n) => {
              const r = Math.floor(n / cw.cols)
              const c = n % cw.cols
              const id = k(r, c)
              if (!solution[id]) return <div key={id} className="aspect-square" />
              const isActive = activeCells.has(id)
              return (
                <div key={id} className="relative aspect-square">
                  {numbers[id] && (
                    <span className="text-muted pointer-events-none absolute top-0.5 left-1 text-[0.55rem] leading-none sm:text-[0.65rem]">
                      {numbers[id]}
                    </span>
                  )}
                  <input
                    ref={(el) => {
                      inputs.current[id] = el
                    }}
                    value={letters[id] ?? ''}
                    aria-label={`Клітинка ${r + 1}, ${c + 1}`}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={solved}
                    onFocus={() => selectCell(r, c)}
                    onKeyDown={(e) => onKey(e, r, c)}
                    onChange={(e) => {
                      const ch = clean(e.target.value).slice(-1)
                      if (ch && !LETTER.test(ch)) return
                      setLetter(r, c, ch)
                      if (ch) step(r, c, 1)
                    }}
                    className={`h-full w-full rounded-md border text-center font-sans text-[clamp(0.85rem,4.2vw,1.35rem)] font-semibold uppercase caret-transparent transition outline-none ${
                      badCells.has(id)
                        ? 'border-bad bg-bad/15 text-bad'
                        : solved || rightCells.has(id)
                          ? 'border-accent bg-accent/20 text-accent-text'
                          : isActive
                            ? 'border-accent bg-accent/15 focus:bg-accent/35'
                            : 'border-line bg-glass focus:border-fg/40'
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 text-sm lg:w-80 lg:shrink-0">
          {[
            ['По горизонталі', across],
            ['По вертикалі', down],
          ].map(([title, list]) => (
            <div key={title as string}>
              <h3 className="text-muted mb-1.5 text-xs font-semibold tracking-[0.18em] uppercase">
                {title as string}
              </h3>
              <ol className="flex flex-col gap-1">
                {(list as { w: Placed; i: number }[]).map(({ w, i }) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        setActive(i)
                        const [r, c] = cellsOf(w).find(([a, b]) => !letters[k(a, b)]) ?? [
                          w.row,
                          w.col,
                        ]
                        focus(r, c)
                      }}
                      className={`w-full rounded-lg px-2 py-1 text-left transition ${i === active ? 'bg-accent/15' : 'hover:bg-glass'}`}
                    >
                      <b className="mr-1">{w.num}.</b>
                      {w.clue}
                      {statusOf(w) === 'right' && (
                        <span className="text-accent-text ml-1 font-semibold">✓</span>
                      )}
                      {statusOf(w) === 'wrong' && (
                        <span className="text-bad ml-1 font-semibold">✗</span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {solved ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <Card className="flex items-center gap-4">
            <Mascot mood="happy" size={90} />
            <div>
              <div className="text-accent-text text-2xl font-semibold">Моя вам повага</div>
              <p className="text-muted text-sm">
                Кросворд розгадано · +{(cw.words.length - revealed.size) * 4} XP
                {revealed.size > 0 && ` (відкрито відповідей: ${revealed.size})`}
              </p>
            </div>
          </Card>
          <Button variant="primary" onClick={onNew}>
            Новий кросворд
          </Button>
          <LinkButton to="/games" className="justify-center rounded-full">
            До ігор
          </LinkButton>
        </motion.div>
      ) : (
        <>
          {showSummary && (
            <Card className="py-4">
              <p className="font-semibold">
                Правильно: {counts.right} з {cw.words.length}
                {counts.bad > 0 && <span className="text-bad"> · з помилками: {counts.bad}</span>}
                {counts.open > 0 && (
                  <span className="text-muted"> · не заповнено: {counts.open}</span>
                )}
              </p>
              {counts.bad > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {cw.words.map((w, i) =>
                    statusOf(w) === 'wrong' ? (
                      <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-bad">
                          ✗ {w.num} {w.dir === 'across' ? '→' : '↓'}
                        </span>
                        <span className="text-muted min-w-0 flex-1">{w.clue}</span>
                        <button
                          className="text-accent-text font-semibold underline-offset-4 hover:underline"
                          onClick={() => reveal(i)}
                        >
                          Показати відповідь
                        </button>
                      </li>
                    ) : null,
                  )}
                </ul>
              )}
            </Card>
          )}
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button variant="primary" onClick={check}>
              Перевірити
            </Button>
            <Button
              className="justify-center rounded-full disabled:opacity-50"
              onClick={hint}
              disabled={profile.xp < HINT_COST}
            >
              Підказати літеру (−{HINT_COST} XP)
            </Button>
            <Button className="justify-center rounded-full" onClick={onNew}>
              Інший кросворд
            </Button>
          </div>
        </>
      )}
    </>
  )
}
