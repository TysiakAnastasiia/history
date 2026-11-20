import { useEffect, useMemo, useRef, useState } from 'react'
import type { Api, Question } from '../types'
import { BY_ID, QUESTIONS } from '../content'
import { Mascot } from '../components/Mascot'
import { playResult } from '../lib/sound'
import { rnd, shuffle } from '../lib/util'

const GOOD = ['😎', '🫡', '🔥', '🏆', '🤝']
const BAD = ['🤡', '💀', '🫠', '🐌', '🤦']

interface Props {
  ids?: string[]
  blitz?: boolean
  onExit: () => void
  api: Api
}

export function Quiz({ ids, blitz, onExit, api }: Props) {
  const list = useMemo<Question[]>(
    () =>
      blitz
        ? [...shuffle(QUESTIONS), ...shuffle(QUESTIONS), ...shuffle(QUESTIONS)]
        : (ids ?? []).map((id) => BY_ID[id]).filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [good, setGood] = useState(0)
  const [streak, setStreak] = useState(0)
  const [t, setT] = useState(60)
  const [sticker, setSticker] = useState('')
  const done = i >= list.length || (!!blitz && t <= 0)
  const q: Question | undefined = list[i]
  const order = useMemo(() => (q ? shuffle(q.options.map((_, k) => k)) : []), [q])
  const recorded = useRef(false)

  useEffect(() => {
    if (!blitz) return
    const id = setInterval(() => setT((x) => x - 1), 1000)
    return () => clearInterval(id)
  }, [blitz])

  useEffect(() => {
    if (done && blitz && !recorded.current) {
      recorded.current = true
      api.update((p) => ({ ...p, blitz: Math.max(p.blitz, good) }))
    }
  }, [done, blitz, good, api])

  const pick = (k: number) => {
    if (!q || picked !== null || done) return
    const ok = k === q.answer
    const s = ok ? streak + 1 : 0
    setPicked(k)
    setStreak(s)
    setSticker(rnd(ok ? GOOD : BAD))
    if (ok) setGood((g) => g + 1)
    api.award(ok ? 10 + Math.min(s, 5) * 2 : 0, q.id, blitz ? 'blitz' : 'quiz', ok)
    playResult(ok, api.p.snd)
    if (blitz)
      setTimeout(() => {
        setPicked(null)
        setI((x) => x + 1)
      }, 700)
  }
  const next = () => {
    setPicked(null)
    setI((x) => x + 1)
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= order.length) pick(order[n - 1])
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  if (done) {
    return (
      <div className="glass card fb">
        <Mascot mood={good > 0 ? 'happy' : 'sad'} size={96} />
        <h1>{good}</h1>
        <p>{blitz ? 'правильних за 60 секунд' : `правильних із ${list.length}`}</p>
        <button className="btn p" onClick={onExit}>
          Назад
        </button>
      </div>
    )
  }
  if (!q) return null
  const mood = picked === null ? 'idle' : picked === q.answer ? 'happy' : 'sad'
  return (
    <>
      <div className="row">
        <button className="btn sm" onClick={onExit} aria-label="Вийти">
          ←
        </button>
        <span className="num">{String(i + 1).padStart(2, '0')}</span>
        {blitz && (
          <span className="num" aria-live="off">
            {Math.max(t, 0)}
          </span>
        )}
      </div>
      <div className="glass card">
        <div className="mrow">
          <Mascot mood={mood} />
        </div>
        <h2 className="q">{q.q}</h2>
        {order.map((k) => {
          const cls = picked === null ? '' : k === q.answer ? 'ok' : k === picked ? 'no' : ''
          return (
            <button
              key={k}
              className={`btn ${cls}`}
              disabled={picked !== null}
              onClick={() => pick(k)}
            >
              {q.options[k].t}
            </button>
          )
        })}
      </div>
      {picked !== null && !blitz && (
        <>
          <div className="glass card fb" aria-live="polite">
            <span className="st">{sticker}</span>
            <h2 style={{ color: `var(--${picked === q.answer ? 'ok' : 'no'})` }}>
              {picked === q.answer ? 'Моя вам повага' : 'Лошара'}
            </h2>
            <p>
              <b>Коротко:</b> {q.short}
            </p>
            <p>
              <b>Чому так:</b> {q.why}
            </p>
            {picked !== q.answer && q.options[picked].note && (
              <p>
                <b>Чому твій варіант не підходить:</b> {q.options[picked].note}
              </p>
            )}
            {q.mnemonic && (
              <p>
                <b>Як запам’ятати:</b> {q.mnemonic}
              </p>
            )}
          </div>
          <button className="btn p" onClick={next}>
            Далі
          </button>
        </>
      )}
    </>
  )
}
