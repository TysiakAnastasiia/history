import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MAPS } from '../content'
import type { Question } from '../lib/schema'
import { LETTERS, type Response } from '../lib/scoring'

/** Пояснення: «Коротко», «Чому так», «Чому інші неправильні» / правильна відповідь, «Як запам'ятати», «Читати далі» */
export function Explanation({
  q,
  response,
  readMore = true,
}: {
  q: Question
  response: Response
  readMore?: boolean
}) {
  return (
    <dl className="flex flex-col gap-3 leading-relaxed">
      <Block title="Коротко">{q.short}</Block>
      <Block title="Чому так">{q.why}</Block>
      <Details q={q} response={response} />
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

function Details({ q, response }: { q: Question; response: Response }) {
  switch (q.type) {
    case 'single':
    case 'multi3of7': {
      const right = Array.isArray(q.answer) ? q.answer : [q.answer]
      const picked = Array.isArray(response) ? response : [response]
      const wrong = q.options.map((o, k) => ({ ...o, k })).filter((o) => !right.includes(o.k))
      return (
        <>
          {q.type === 'multi3of7' && (
            <Block title="Правильні відповіді">
              {right.map((k) => q.options[k].text).join('; ')}
            </Block>
          )}
          <Block title="Чому інші варіанти неправильні">
            <ul className="flex flex-col gap-1.5">
              {wrong.map((o) => (
                <li key={o.k} className={picked.includes(o.k) ? 'text-bad' : ''}>
                  <b className="font-semibold">{o.text}</b>
                  {picked.includes(o.k) && ' (твій варіант)'} — {o.note}
                </li>
              ))}
            </ul>
          </Block>
        </>
      )
    }
    case 'matching':
      return (
        <Block title="Правильні пари">
          <ul className="flex flex-col gap-1.5">
            {q.left.map((t, i) => (
              <li key={i}>
                <b className="font-semibold">
                  {i + 1} — {LETTERS[q.answer[i]]}:
                </b>{' '}
                {t} → {q.right[q.answer[i]]}
              </li>
            ))}
          </ul>
        </Block>
      )
    case 'mapPick': {
      const region = MAPS[q.layer]?.regions.find((r) => r.id === q.answer)
      const pickedRegion = MAPS[q.layer]?.regions.find((r) => r.id === response)
      return (
        <Block title="На картосхемі">
          <b className="font-semibold">{region?.name}</b>
          {region?.note && ` — ${region.note}`}
          {pickedRegion && pickedRegion.id !== q.answer && (
            <span className="text-bad block">
              Ви вибрали: {pickedRegion.name}
              {pickedRegion.note && ` — ${pickedRegion.note}`}
            </span>
          )}
        </Block>
      )
    }
    case 'sequence':
      return (
        <Block title="Правильний порядок">
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {q.answer.map((k) => (
              <li key={k}>{q.items[k]}</li>
            ))}
          </ol>
        </Block>
      )
  }
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted text-sm font-semibold">{title}</dt>
      <dd>{children}</dd>
    </div>
  )
}
