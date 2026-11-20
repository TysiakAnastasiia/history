import type { Question } from '../lib/schema'
import { LETTERS, type Response } from '../lib/scoring'
import { Button } from './ui'

interface Props {
  q: Question
  response: Response
  onChange: (r: Response) => void
  /** показати правильні відповіді й заблокувати введення */
  revealed: boolean
  /** порядок показу варіантів (single, multi3of7) або подій (sequence) */
  order: number[]
}

const chip =
  'flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition ' +
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function QuestionView({ q, response, onChange, revealed, order }: Props) {
  switch (q.type) {
    case 'single': {
      return (
        <div className="flex flex-col gap-2.5">
          {order.map((k, pos) => {
            const picked = response === k
            const variant = revealed
              ? k === q.answer
                ? 'right'
                : picked
                  ? 'wrong'
                  : 'glass'
              : picked
                ? 'selected'
                : 'glass'
            return (
              <Button
                key={k}
                variant={variant}
                disabled={revealed}
                aria-pressed={picked}
                className={revealed && k !== q.answer && !picked ? 'opacity-50' : ''}
                onClick={() => onChange(k)}
              >
                <span className="text-muted w-4 shrink-0 text-sm">{pos + 1}</span>
                {q.options[k].text}
              </Button>
            )
          })}
        </div>
      )
    }

    case 'multi3of7': {
      const picked = (response as number[] | null) ?? []
      const toggle = (k: number) => {
        if (picked.includes(k)) onChange(picked.filter((x) => x !== k))
        else if (picked.length < 3) onChange([...picked, k])
      }
      return (
        <div className="flex flex-col gap-2.5">
          <p className="text-muted text-sm">Вибрано {picked.length} із 3</p>
          {order.map((k, pos) => {
            const on = picked.includes(k)
            const right = q.answer.includes(k)
            const variant = revealed
              ? right
                ? 'right'
                : on
                  ? 'wrong'
                  : 'glass'
              : on
                ? 'selected'
                : 'glass'
            return (
              <Button
                key={k}
                variant={variant}
                disabled={revealed || (!on && picked.length >= 3)}
                aria-pressed={on}
                className={revealed && !right && !on ? 'opacity-50' : ''}
                onClick={() => toggle(k)}
              >
                <span className="text-muted w-4 shrink-0 text-sm">{pos + 1}</span>
                {q.options[k].text}
                {on && <span className="ml-auto">✓</span>}
              </Button>
            )
          })}
        </div>
      )
    }

    case 'matching': {
      const pairs = (response as (number | null)[] | null) ?? [null, null, null, null]
      const set = (row: number, letter: number) =>
        onChange(pairs.map((x, i) => (i === row ? (x === letter ? null : letter) : x)))
      return (
        <div className="flex flex-col gap-4">
          <ol className="glass flex flex-col gap-2 rounded-2xl p-4">
            {q.right.map((t, k) => (
              <li key={k} className="flex gap-3">
                <b className="w-5 shrink-0">{LETTERS[k]}</b>
                {t}
              </li>
            ))}
          </ol>
          {q.left.map((t, row) => (
            <div key={row} className="flex flex-col gap-2">
              <div className="flex gap-3">
                <b className="w-5 shrink-0">{row + 1}</b>
                {t}
              </div>
              <div className="flex gap-2 pl-8" role="group" aria-label={`Відповідь для ${row + 1}`}>
                {q.right.map((_, k) => {
                  const on = pairs[row] === k
                  const right = q.answer[row] === k
                  const cls = revealed
                    ? right
                      ? 'border-accent bg-accent text-accent-ink'
                      : on
                        ? 'border-bad bg-bad/25'
                        : 'border-line opacity-40'
                    : on
                      ? 'border-accent bg-accent text-accent-ink'
                      : 'border-line bg-glass hover:border-accent'
                  return (
                    <button
                      key={k}
                      className={`${chip} ${cls}`}
                      disabled={revealed}
                      aria-pressed={on}
                      onClick={() => set(row, k)}
                    >
                      {LETTERS[k]}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'sequence': {
      const seq = (response as number[] | null) ?? []
      const tap = (k: number) =>
        onChange(seq.includes(k) ? seq.filter((x) => x !== k) : [...seq, k])
      return (
        <div className="flex flex-col gap-2.5">
          <p className="text-muted text-sm">
            Натискайте події від найранішої до найпізнішої. Повторне натискання прибирає подію.
          </p>
          {order.map((k, pos) => {
            const place = seq.indexOf(k)
            const rightPlace = q.answer.indexOf(k)
            const ok = place === rightPlace
            const variant = revealed ? (ok ? 'right' : 'wrong') : place >= 0 ? 'selected' : 'glass'
            return (
              <Button key={k} variant={variant} disabled={revealed} onClick={() => tap(k)}>
                <span className="text-muted w-4 shrink-0 text-sm">{LETTERS[pos]}</span>
                {q.items[k]}
                <span className="ml-auto flex shrink-0 items-center gap-2 text-sm font-semibold">
                  {place >= 0 && (
                    <span className="bg-accent text-accent-ink rounded-lg px-2">{place + 1}</span>
                  )}
                  {revealed && !ok && <span className="text-muted">→ {rightPlace + 1}</span>}
                </span>
              </Button>
            )
          })}
          {!revealed && seq.length > 0 && (
            <button
              className="text-muted self-start text-sm underline"
              onClick={() => onChange([])}
            >
              Скинути
            </button>
          )}
        </div>
      )
    }
  }
}
