import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useProfile } from '../lib/profile'
import type { Question } from '../lib/schema'
import {
  displayOrder,
  isComplete,
  maxPoints,
  score,
  TYPE_LABEL,
  type Response,
} from '../lib/scoring'
import { playResult } from '../lib/sound'
import { rnd, shuffle } from '../lib/util'
import { Explanation } from './Explanation'
import { Mascot, type Mood } from './Mascot'
import { QuestionView } from './QuestionView'
import { Button, Card } from './ui'

const GOOD = ['😎', '🫡', '🔥', '🏆', '🤝', '💪']
const BAD = ['🤡', '💀', '🫠', '🐌', '🤦', '🙈']

interface Props {
  questions: Question[]
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
  const [response, setResponse] = useState<Response>(null)
  const [revealed, setRevealed] = useState(false)
  const [good, setGood] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [time, setTime] = useState(60)
  const [sticker, setSticker] = useState('')
  const [gained, setGained] = useState(0)

  const done = blitz ? time <= 0 : i >= list.length
  const q = list[i]
  const order = useMemo(() => (q ? displayOrder(q, shuffle) : []), [q])

  useEffect(() => {
    if (!blitz || done) return
    const t = setInterval(() => setTime((x) => x - 1), 1000)
    return () => clearInterval(t)
  }, [blitz, done])

  useEffect(() => {
    if (blitz && done) update((p) => ({ ...p, blitz: Math.max(p.blitz, good) }))
  }, [blitz, done, good, update])

  const next = useCallback(() => {
    setResponse(null)
    setRevealed(false)
    setI((x) => x + 1)
    // Бліц нескінченний: коли питання закінчуються, додаємо ще раз у новому порядку
    if (blitz && i + 1 >= list.length) setList((l) => [...l, ...shuffle(questions)])
  }, [blitz, i, list.length, questions])

  const submit = useCallback(
    (r: Response) => {
      if (!q || revealed || done || !isComplete(q, r)) return
      const ok = score(q, r) === maxPoints(q)
      setResponse(r)
      setRevealed(true)
      setSticker(rnd(ok ? GOOD : BAD))
      setAnswered((x) => x + 1)
      if (ok) setGood((g) => g + 1)
      setGained(answer(q.id, game, ok))
      playResult(ok, profile.sound)
      if (blitz) setTimeout(next, ok ? 450 : 900)
    },
    [q, revealed, done, answer, game, profile.sound, blitz, next],
  )

  // Вибір одного варіанта перевіряється одразу; решта типів — кнопкою «Перевірити»
  const change = (r: Response) => (q?.type === 'single' ? submit(r) : setResponse(r))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || !q) return
      const n = Number(e.key)
      if (q.type === 'single' && n >= 1 && n <= order.length) submit(order[n - 1])
      else if (e.key === 'Enter') {
        e.preventDefault()
        if (revealed && !blitz) next()
        else submit(response)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, order, submit, revealed, blitz, next, response])

  if (done) {
    const total = blitz ? answered : list.length
    return (
      <Card className="flex flex-col items-center gap-2 text-center">
        <Mascot mood={good >= total / 2 && good > 0 ? 'happy' : 'sad'} size={110} />
        <div className="font-display text-6xl font-extralight">{good}</div>
        <p className="text-muted">{blitz ? 'правильних за 60 секунд' : `правильних із ${total}`}</p>
        <div className="mt-3 w-full">{finish(good, total)}</div>
      </Card>
    )
  }
  if (!q) return null

  const pts = revealed ? score(q, response) : 0
  const max = maxPoints(q)
  const ok = revealed && pts === max
  const mood: Mood = !revealed ? 'idle' : ok ? 'happy' : 'sad'

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
        {q.type !== 'single' && <p className="text-muted mb-1 text-sm">{TYPE_LABEL[q.type]}</p>}
        <h2 className="mb-4 text-xl leading-snug font-semibold">{q.prompt}</h2>
        <QuestionView
          q={q}
          response={response}
          onChange={change}
          revealed={revealed}
          order={order}
        />
      </Card>

      {!revealed && q.type !== 'single' && (
        <Button
          variant="primary"
          disabled={!isComplete(q, response)}
          className="disabled:opacity-50"
          onClick={() => submit(response)}
        >
          Перевірити
        </Button>
      )}

      <AnimatePresence>
        {revealed && !blitz && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <Card>
              <div className="mb-4 flex items-center gap-3" aria-live="polite">
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
                  <div className="text-muted text-sm">
                    {max > 1 && `${pts} з ${max} балів`}
                    {max > 1 && gained > 0 && ' · '}
                    {gained > 0 && `+${gained} XP`}
                  </div>
                </div>
              </div>
              <Explanation q={q} response={response} readMore={readMore} />
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
