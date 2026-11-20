import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Explanation } from '../components/Explanation'
import { Mascot } from '../components/Mascot'
import { QuestionView } from '../components/QuestionView'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { QUESTIONS } from '../content'
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
import { shuffle } from '../lib/util'

// Структура НМТ-2026 з історії України: 30 завдань, ~60 хвилин, 54 бали
const FORMAT: { type: Question['type']; count: number }[] = [
  { type: 'single', count: 20 },
  { type: 'matching', count: 4 },
  { type: 'sequence', count: 3 },
  { type: 'multi3of7', count: 3 },
]
const MINUTES = 60
const FULL_MAX = 54

function buildExam(): Question[] {
  return FORMAT.flatMap(({ type, count }) =>
    shuffle(QUESTIONS.filter((q) => q.type === type)).slice(0, count),
  )
}

type Phase = 'intro' | 'running' | 'results'

export function Exam() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [tasks, setTasks] = useState<Question[]>(buildExam)
  const [responses, setResponses] = useState<Response[]>([])

  const start = () => {
    const t = buildExam()
    setTasks(t)
    setResponses(t.map(() => null))
    setPhase('running')
  }

  return (
    <Screen>
      <BackBar>Пробний НМТ</BackBar>
      {phase === 'intro' && <Intro tasks={tasks} onStart={start} />}
      {phase === 'running' && (
        <Running
          tasks={tasks}
          responses={responses}
          setResponses={setResponses}
          onFinish={() => setPhase('results')}
        />
      )}
      {phase === 'results' && <Results tasks={tasks} responses={responses} onRestart={start} />}
    </Screen>
  )
}

function Intro({ tasks, onStart }: { tasks: Question[]; onStart: () => void }) {
  const { profile } = useProfile()
  const max = tasks.reduce((s, q) => s + maxPoints(q), 0)
  const full = tasks.length === 30
  return (
    <>
      <Title>Пробний НМТ</Title>
      <Card>
        <ul className="flex flex-col gap-1.5">
          {FORMAT.map((f) => {
            const have = tasks.filter((q) => q.type === f.type).length
            return (
              <li key={f.type} className="flex gap-3">
                {TYPE_LABEL[f.type]}
                <span className={`ml-auto ${have < f.count ? 'text-bad' : 'text-muted'}`}>
                  {have} / {f.count}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-muted mt-4">
          {MINUTES} хвилин · максимум {full ? FULL_MAX : `${max} (з ${FULL_MAX})`} балів. Пояснення
          — після завершення.
        </p>
        {!full && (
          <p className="text-bad mt-2 text-sm">
            Поки що питань у базі менше, ніж на справжньому НМТ, тож тест буде коротшим.
          </p>
        )}
        {profile.examBest > 0 && (
          <p className="text-muted mt-2">Найкращий результат: {profile.examBest}</p>
        )}
      </Card>
      <Button variant="primary" onClick={onStart} disabled={tasks.length === 0}>
        Почати
      </Button>
    </>
  )
}

function Running({
  tasks,
  responses,
  setResponses,
  onFinish,
}: {
  tasks: Question[]
  responses: Response[]
  setResponses: (f: (r: Response[]) => Response[]) => void
  onFinish: () => void
}) {
  const [i, setI] = useState(0)
  const [left, setLeft] = useState(MINUTES * 60)
  const orders = useMemo(() => tasks.map((q) => displayOrder(q, shuffle)), [tasks])
  const q = tasks[i]
  const unanswered = tasks.filter((t, k) => !isComplete(t, responses[k])).length

  useEffect(() => {
    const t = setInterval(() => setLeft((x) => x - 1), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (left <= 0) onFinish()
  }, [left, onFinish])

  const finish = useCallback(() => {
    const msg = unanswered
      ? `Без відповіді: ${unanswered}. Завершити тест?`
      : 'Завершити тест і подивитися результат?'
    if (window.confirm(msg)) onFinish()
  }, [unanswered, onFinish])

  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, '0')
  const ss = String(Math.max(left, 0) % 60).padStart(2, '0')

  return (
    <>
      <div className="flex items-end justify-between px-1">
        <span className="font-display text-4xl font-extralight tabular-nums">
          {String(i + 1).padStart(2, '0')}
          <span className="text-muted text-lg"> / {tasks.length}</span>
        </span>
        <span
          className={`font-display text-3xl font-extralight tabular-nums ${left <= 300 ? 'text-bad' : ''}`}
          aria-label={`Залишилось ${mm} хвилин ${ss} секунд`}
        >
          {mm}:{ss}
        </span>
      </div>

      {/* Навігація по завданнях, як на справжньому тесті */}
      <nav className="flex flex-wrap gap-1.5" aria-label="Завдання">
        {tasks.map((t, k) => (
          <button
            key={t.id}
            onClick={() => setI(k)}
            aria-current={k === i}
            className={`size-9 rounded-lg border text-sm tabular-nums transition ${
              k === i
                ? 'border-accent ring-accent ring-1'
                : isComplete(t, responses[k])
                  ? 'border-accent bg-accent/25'
                  : 'border-line bg-glass'
            }`}
          >
            {k + 1}
          </button>
        ))}
      </nav>

      <Card>
        <p className="text-muted mb-1 text-sm">{TYPE_LABEL[q.type]}</p>
        <h2 className="mb-4 text-xl leading-snug font-semibold">{q.prompt}</h2>
        <QuestionView
          key={q.id}
          q={q}
          response={responses[i]}
          onChange={(r) => setResponses((rs) => rs.map((x, k) => (k === i ? r : x)))}
          revealed={false}
          order={orders[i]}
        />
      </Card>

      <div className="flex gap-2.5">
        <Button
          disabled={i === 0}
          className="justify-center disabled:opacity-40"
          onClick={() => setI(i - 1)}
        >
          ← Назад
        </Button>
        {i < tasks.length - 1 ? (
          <Button variant="primary" onClick={() => setI(i + 1)}>
            Далі →
          </Button>
        ) : (
          <Button variant="primary" onClick={finish}>
            Завершити
          </Button>
        )}
      </div>
      {i < tasks.length - 1 && (
        <button className="text-muted self-center text-sm underline" onClick={finish}>
          Завершити тест достроково
        </button>
      )}
    </>
  )
}

function Results({
  tasks,
  responses,
  onRestart,
}: {
  tasks: Question[]
  responses: Response[]
  onRestart: () => void
}) {
  const { update } = useProfile()
  const points = tasks.map((q, k) => score(q, responses[k]))
  const total = points.reduce((a, b) => a + b, 0)
  const max = tasks.reduce((s, q) => s + maxPoints(q), 0)

  // Результат зараховується один раз: XP, рекорд, «робота над помилками».
  // ref захищає від повторного запуску ефекту (StrictMode у dev).
  const counted = useRef(false)
  useEffect(() => {
    if (counted.current) return
    counted.current = true
    update((p) => {
      const right = new Set(tasks.filter((q, k) => points[k] === maxPoints(q)).map((q) => q.id))
      const wrong = tasks.filter((q) => !right.has(q.id)).map((q) => q.id)
      return {
        ...p,
        xp: p.xp + total * 5,
        examBest: Math.max(p.examBest, total),
        mistakes: [...new Set([...p.mistakes.filter((m) => !right.has(m)), ...wrong])],
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Card className="flex flex-col items-center gap-1 text-center">
        <Mascot mood={total >= max / 2 && total > 0 ? 'happy' : 'sad'} size={110} />
        <div className="font-display text-6xl font-extralight">{total}</div>
        <p className="text-muted">
          балів із {max}
          {max !== FULL_MAX && ` (на справжньому НМТ — ${FULL_MAX})`} · +{total * 5} XP
        </p>
      </Card>

      {tasks.map((q, k) => {
        const p = points[k]
        const m = maxPoints(q)
        return (
          <details key={q.id} className="glass group p-4">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <span className="text-muted w-6 shrink-0 tabular-nums">{k + 1}</span>
              <span className="min-w-0 flex-1 truncate">{q.prompt}</span>
              <span
                className={`shrink-0 font-semibold ${p === m ? 'text-accent-text' : p === 0 ? 'text-bad' : ''}`}
              >
                {p}/{m}
              </span>
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              <QuestionView
                q={q}
                response={responses[k]}
                onChange={() => {}}
                revealed
                order={displayOrder(q, (a) => a)}
              />
              <Explanation q={q} response={responses[k]} />
            </div>
          </details>
        )
      })}

      <Button variant="primary" onClick={onRestart}>
        Ще раз
      </Button>
      <LinkButton to="/">На головну</LinkButton>
    </>
  )
}
