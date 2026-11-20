import { useState } from 'react'
import type { Api } from '../types'
import { THEORY, TOPICS } from '../content'
import { Quiz } from './Quiz'

export function Theory({ topic, onExit, api }: { topic: number; onExit: () => void; api: Api }) {
  const sections = THEORY[topic] ?? []
  const [idx, setIdx] = useState(0)
  const [testing, setTesting] = useState(false)
  const s = sections[idx]
  if (!s)
    return (
      <button className="btn" onClick={onExit}>
        ← Назад
      </button>
    )
  if (testing) {
    return (
      <Quiz
        ids={s.check}
        api={api}
        onExit={() => {
          setTesting(false)
          if (idx < sections.length - 1) setIdx(idx + 1)
          else onExit()
        }}
      />
    )
  }
  return (
    <>
      <div className="row">
        <button className="btn sm" onClick={onExit} aria-label="Назад">
          ←
        </button>
        <small>
          {TOPICS.find((t) => t.n === topic)?.title} · розділ {idx + 1}/{sections.length}
        </small>
      </div>
      <article className="glass card">
        <h2 className="q">{s.title}</h2>
        {s.body.map((p, k) => (
          <p key={k}>{p}</p>
        ))}
        {s.remember && (
          <p className="remember">
            <b>Запам’ятай:</b> {s.remember}
          </p>
        )}
      </article>
      <button className="btn p" onClick={() => setTesting(true)}>
        Перевір себе ({s.check.length})
      </button>
      {idx > 0 && (
        <button className="btn" onClick={() => setIdx(idx - 1)}>
          ← Попередній розділ
        </button>
      )}
    </>
  )
}
