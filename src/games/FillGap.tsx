import { motion } from 'motion/react'
import { use, useState, type FormEvent } from 'react'
import { Mascot } from '../components/Mascot'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { TopicPack } from '../lib/schema'
import { playResult } from '../lib/sound'
import { shuffle } from '../lib/util'
import { noYears, personName, playableEvent } from './facts'

/** «Заповни пропуск»: відновити пропущений рік, термін чи ім’я діяча */
const ROUND = 10
const RECORD = 'fillgap' // найкращий результат раунду (з 10)

type Gap =
  | { kind: 'year'; before: string; after: string; answer: string }
  | {
      kind: 'choice'
      before: string
      after: string
      answer: string
      options: string[]
      label: string
    }

const YEAR = /(?<![\d–-])(\d{3,4})(?![\d–-])/g

/** Речення, у якому рівно один рік, — рік стає пропуском */
function yearGap(sentence: string): Gap | null {
  const years = [...sentence.matchAll(YEAR)]
  if (years.length !== 1) return null
  const m = years[0]
  return {
    kind: 'year',
    before: sentence.slice(0, m.index),
    after: sentence.slice(m.index! + m[0].length),
    answer: m[0],
  }
}

function buildGaps(packs: TopicPack[]): Gap[] {
  const facts = packs.flatMap((p) => p.facts)
  const questions = packs.flatMap((p) => p.questions)

  // роки: з подій довідника та з коротких пояснень до питань
  const fromEvents = facts.filter(playableEvent).map((f) => ({
    kind: 'year' as const,
    before: '',
    after: ` р. — ${noYears(f.title)}.`,
    answer: String(f.year),
  }))
  const fromShort = questions.map((q) => yearGap(q.short)).filter((g): g is Gap => g !== null)
  const years = shuffle([...fromEvents, ...fromShort])

  // терміни: «___ — визначення»
  const terms = facts.filter((f) => f.kind === 'term' && f.details)
  const termGaps: Gap[] = shuffle(terms).map((t) => ({
    kind: 'choice',
    label: 'термін',
    before: '',
    after: ` — ${t.details}`,
    answer: t.title,
    options: shuffle([
      t.title,
      ...shuffle(terms.filter((x) => x.id !== t.id))
        .slice(0, 3)
        .map((x) => x.title),
    ]),
  }))

  // діячі: «___ — довідка»
  const persons = facts.filter((f) => f.kind === 'person' && f.details)
  const personGaps: Gap[] = shuffle(persons).map((p) => ({
    kind: 'choice',
    label: 'діяч',
    before: '',
    after: ` — ${p.details}`,
    answer: personName(p.title),
    options: shuffle([
      personName(p.title),
      ...shuffle(persons.filter((x) => x.id !== p.id))
        .slice(0, 3)
        .map((x) => personName(x.title)),
    ]),
  }))

  return shuffle([...years.slice(0, 4), ...termGaps.slice(0, 3), ...personGaps.slice(0, 3)]).slice(
    0,
    ROUND,
  )
}

export function FillGap() {
  const packs = use(loadAll())
  const [round, setRound] = useState(0)
  return <Round key={round} packs={packs} onRestart={() => setRound((r) => r + 1)} />
}

function Round({ packs, onRestart }: { packs: TopicPack[]; onRestart: () => void }) {
  const { profile, update } = useProfile()
  const [gaps] = useState(() => buildGaps(packs))
  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [good, setGood] = useState(0)
  const record = profile.gameRecords[RECORD]
  const g = gaps[i]
  const done = i >= gaps.length

  const submit = (a: string) => {
    if (answer !== null || !a.trim()) return
    const ok = a.trim() === g.answer
    setAnswer(a.trim())
    if (ok) setGood((x) => x + 1)
    playResult(ok, profile.sound)
    if (ok) update((p) => ({ ...p, xp: p.xp + 4 }))
  }
  const next = () => {
    const last = i + 1 >= gaps.length
    if (last)
      update((p) => ({
        ...p,
        gameRecords: { ...p.gameRecords, [RECORD]: Math.max(p.gameRecords[RECORD] ?? 0, good) },
      }))
    setAnswer(null)
    setValue('')
    setI(i + 1)
  }

  if (gaps.length === 0)
    return (
      <Screen>
        <BackBar />
        <p className="text-muted">Поки що немає матеріалу для гри.</p>
      </Screen>
    )

  if (done)
    return (
      <Screen>
        <BackBar />
        <Card className="flex flex-col items-center gap-2 text-center">
          <Mascot mood={good >= ROUND / 2 ? 'happy' : 'sad'} size={120} />
          <div className="font-sans text-6xl font-extralight">{good}</div>
          <p className="text-muted">
            правильних із {gaps.length} · +{good * 4} XP
          </p>
          <div className="mt-3 flex w-full flex-col gap-2.5">
            <Button variant="primary" onClick={onRestart}>
              Ще раунд
            </Button>
            <LinkButton to="/" className="justify-center rounded-full">
              На головну
            </LinkButton>
          </div>
        </Card>
      </Screen>
    )

  const ok = answer === g.answer
  const blank = (
    <span
      className={`mx-1 inline-block min-w-16 rounded-lg border-b-2 px-2 text-center font-semibold ${
        answer === null
          ? 'border-fg/40'
          : ok
            ? 'border-accent text-accent-text'
            : 'border-bad text-bad'
      }`}
    >
      {answer === null ? ' ' : ok ? g.answer : answer}
    </span>
  )

  return (
    <Screen>
      <BackBar>
        Заповни пропуск · {i + 1}/{gaps.length}
        {record !== undefined && ` · рекорд ${record}/${ROUND}`}
      </BackBar>
      <Title>Заповни пропуск</Title>
      <p className="text-muted">
        {g.kind === 'year' ? 'Впиши рік.' : `Вибери ${g.label === 'термін' ? 'термін' : 'діяча'}.`}
      </p>

      <Card>
        <p className="font-display text-2xl leading-snug">
          {g.before}
          {blank}
          {g.after}
        </p>
        {answer !== null && !ok && (
          <p className="text-muted mt-3 text-sm">
            Правильно: <b className="text-fg">{g.answer}</b>
          </p>
        )}
      </Card>

      {answer === null ? (
        g.kind === 'year' ? (
          <form
            className="flex gap-2.5"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              submit(value)
            }}
          >
            <input
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              autoFocus
              placeholder="рік"
              aria-label="Рік"
              className="glass placeholder:text-muted focus-visible:outline-fg min-h-14 w-full min-w-0 flex-1 rounded-full px-6 text-center text-2xl tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-auto! shrink-0 px-8"
              disabled={!value}
            >
              OK
            </Button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {g.options.map((o) => (
              <Button key={o} className="justify-center text-center" onClick={() => submit(o)}>
                {o}
              </Button>
            ))}
          </div>
        )
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="primary" onClick={next} autoFocus>
            {i + 1 >= gaps.length ? 'Результат' : 'Далі'}
          </Button>
        </motion.div>
      )}
    </Screen>
  )
}
