import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SingleQuestion } from '../lib/schema'
import { useProfile } from '../lib/profile'
import { playResult } from '../lib/sound'
import { rnd, shuffle } from '../lib/util'
import { Mascot, type Mood } from './Mascot'
import { Button, Card } from './ui'

const GOOD = ['😎', '🫡', '🔥', '🏆', '🤝', '💪']
const BAD = ['🤡', '💀', '🫠', '🐌', '🤦', '🙈']

interface Props {
  questions: SingleQuestion[]
  /** learn — з поясненнями; blitz — 60 секунд без пояснень */
  mode?: 'learn' | 'blitz'
  game: string
  /** показувати «Читати далі» (у самій теорії не потрібно) */
  readMore?: boolean
  /** що показати на екрані результату під числом */
  finish: (good: number, total: number) => ReactNode
}

export function Quiz({ questions, mode = 'learn', game, readMore = true, finish }: Props) {
  const blitz = mode === 'blitz'
  const { profile, answer, update, streak } = useProfile()
  const [list, setList] = useState(questions)
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [good, setGood] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [time, setTime] = useState(60)
  const [sticker, setSticker] = useState('')
  const [gained, setGained] = useState(0)

  const done = blitz ? time <= 0 : i >= list.length
  const q = list[i]
  // Порядок варіантів перемішується для кожного питання
  const order = useMemo(() => (q ? shuffle(q.options.map((_, k) => k)) : []), [q])

  useEffect(() => {
    if (!blitz || done) return
    const t = setInterval(() => setTime((x) => x - 1), 1000)
    return () => clearInterval(t)
  }, [blitz, done])

  useEffect(() => {
    if (blitz && done) update((p) => ({ ...p, blitz: Math.max(p.blitz, good) }))
  }, [blitz, done, good, update])

  const next = useCallback(() => {
    setPicked(null)
    setI((x) => x + 1)
    // Бліц нескінченний: коли питання закінчуються, додаємо ще раз у новому порядку
    if (blitz && i + 1 >= list.length) setList((l) => [...l, ...shuffle(questions)])
  }, [blitz, i, list.length, questions])

  const pick = useCallback(
    (k: number) => {
      if (!q || picked !== null || done) return
      const ok = k === q.answer
      setPicked(k)
      setSticker(rnd(ok ? GOOD : BAD))
      setAnswered((x) => x + 1)
      if (ok) setGood((g) => g + 1)
      setGained(answer(q.id, game, ok))
      playResult(ok, profile.sound)
      if (blitz) setTimeout(next, ok ? 450 : 900)
    },
    [q, picked, done, answer, game, profile.sound, blitz, next],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= order.length) pick(order[n - 1])
      else if (e.key === 'Enter' && picked !== null && !blitz) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [order, pick, picked, blitz, next])

  if (done) {
    const total = blitz ? answered : list.length
    return (
      <Card className="flex flex-col items-center gap-2 text-center">
        <Mascot mood={good >= total / 2 && good > 0 ? 'happy' : 'sad'} size={110} />
        <div className="font-display text-6xl font-extralight">{good}</div>
        <p className="text-muted">{blitz ? `правильних за 60 секунд` : `правильних із ${total}`}</p>
        <div className="mt-3 w-full">{finish(good, total)}</div>
      </Card>
    )
  }
  if (!q) return null

  const ok = picked === q.answer
  const mood: Mood = picked === null ? 'idle' : ok ? 'happy' : 'sad'

  return (
    <>
      <div className="flex items-end justify-between px-1">
        <span className="font-display text-4xl font-extralight tabular-nums">
          {String(i + 1).padStart(2, '0')}
          {!blitz && <span className="text-muted text-lg"> / {list.length}</span>}
        </span>
        {blitz ? (
          <span
            className={`font-display text-4xl font-extralight tabular-nums ${time <= 10 ? 'text-bad' : ''}`}
            aria-label={`Залишилось ${time} секунд`}
          >
            {time}
          </span>
        ) : (
          streak > 1 && <span className="text-muted text-sm">серія {streak} 🔥</span>
        )}
      </div>

      <Card>
        <div className="mb-2 flex justify-center">
          <Mascot key={`${i}-${mood}`} mood={mood} size={84} />
        </div>
        <h2 className="mb-4 text-xl leading-snug font-semibold">{q.prompt}</h2>
        <div className="flex flex-col gap-2.5">
          {order.map((k, pos) => (
            <Button
              key={k}
              variant={
                picked === null
                  ? 'glass'
                  : k === q.answer
                    ? 'right'
                    : k === picked
                      ? 'wrong'
                      : 'glass'
              }
              disabled={picked !== null}
              className={picked !== null && k !== q.answer && k !== picked ? 'opacity-50' : ''}
              onClick={() => pick(k)}
            >
              <span className="text-muted hidden w-4 shrink-0 text-sm sm:inline">{pos + 1}</span>
              {q.options[k].text}
            </Button>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {picked !== null && !blitz && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <Card>
              <div className="flex items-center gap-3" aria-live="polite">
                <motion.span
                  className="text-5xl"
                  initial={{ scale: 0.3 }}
                  animate={{ scale: [0.3, 1.2, 1] }}
                  transition={{ duration: 0.45 }}
                  aria-hidden
                >
                  {sticker}
                </motion.span>
                <div>
                  <div className={`text-2xl font-semibold ${ok ? 'text-accent-text' : 'text-bad'}`}>
                    {ok ? 'Моя вам повага' : 'Лошара'}
                  </div>
                  {gained > 0 && <div className="text-muted text-sm">+{gained} XP</div>}
                </div>
              </div>
              <Explanation q={q} picked={picked} readMore={readMore} />
            </Card>
            <Button variant="primary" onClick={next} autoFocus>
              Далі
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Explanation({
  q,
  picked,
  readMore,
}: {
  q: SingleQuestion
  picked: number
  readMore: boolean
}) {
  const wrong = q.options.map((o, k) => ({ ...o, k })).filter((o) => o.k !== q.answer)
  return (
    <dl className="mt-4 flex flex-col gap-3 leading-relaxed">
      <Block title="Коротко">{q.short}</Block>
      <Block title="Чому так">{q.why}</Block>
      <Block title="Чому інші варіанти неправильні">
        <ul className="flex flex-col gap-1.5">
          {wrong.map((o) => (
            <li key={o.k} className={o.k === picked ? 'text-bad' : ''}>
              <b className="font-semibold">{o.text}</b>
              {o.k === picked && ' (твій варіант)'} — {o.note}
            </li>
          ))}
        </ul>
      </Block>
      {q.mnemonic && (
        <div className="bg-accent/15 rounded-2xl p-3">
          <Block title="Як запам’ятати">{q.mnemonic}</Block>
        </div>
      )}
      {readMore && q.section && (
        <Link
          to={`/topic/${q.topic}/theory/${q.section}`}
          className="text-accent-text font-semibold underline-offset-4 hover:underline"
        >
          Читати далі →
        </Link>
      )}
    </dl>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted text-sm font-semibold">{title}</dt>
      <dd>{children}</dd>
    </div>
  )
}
