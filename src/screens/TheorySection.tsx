import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Quiz } from '../components/Quiz'
import { BackBar, Button, Card, LinkButton, Screen } from '../components/ui'
import { BY_ID, PACKS, topicTitle } from '../content'
import { useProfile } from '../lib/profile'

export function TheorySection() {
  const { n: nParam, section } = useParams()
  const n = Number(nParam)
  const pack = PACKS[n]
  const idx = pack?.theory.findIndex((s) => s.id === section) ?? -1
  if (!pack || idx < 0) return <Navigate to={pack ? `/topic/${n}` : '/topics'} replace />
  // key: при переході на інший розділ стан (режим перевірки) скидається
  return <SectionView key={section} n={n} idx={idx} />
}

function SectionView({ n, idx }: { n: number; idx: number }) {
  const pack = PACKS[n]
  const { update } = useProfile()
  const [testing, setTesting] = useState(false)

  const s = pack.theory[idx]
  const nextSection = pack.theory[idx + 1]
  const check = s.check.map((id) => BY_ID[id]).filter(Boolean)
  const markRead = () =>
    update((p) => (p.read.includes(s.id) ? p : { ...p, read: [...p.read, s.id] }))
  const after = nextSection ? `/topic/${n}/theory/${nextSection.id}` : `/topic/${n}`
  const afterLabel = nextSection ? 'Наступний розділ' : 'До теми'

  return (
    <Screen>
      <BackBar to={`/topic/${n}`}>
        {topicTitle(n)} · розділ {idx + 1}/{pack.theory.length}
      </BackBar>

      {testing ? (
        <Quiz
          questions={check}
          game="theory-check"
          readMore={false}
          finish={() => (
            <LinkButton to={after} variant="primary">
              {afterLabel}
            </LinkButton>
          )}
        />
      ) : (
        <>
          <Card>
            <h1 className="mb-4 text-2xl font-semibold">{s.title}</h1>
            <div className="flex flex-col gap-3 text-[1.05rem] leading-relaxed">
              {s.body.map((p, k) => (
                <p key={k}>{p}</p>
              ))}
            </div>
            {s.remember && (
              <div className="bg-accent/15 border-accent mt-5 rounded-2xl border-l-4 p-4">
                <div className="text-sm font-semibold">Запам’ятай</div>
                {s.remember}
              </div>
            )}
          </Card>
          {check.length > 0 ? (
            <Button
              variant="primary"
              onClick={() => {
                markRead()
                setTesting(true)
              }}
            >
              Перевір себе · {check.length}
            </Button>
          ) : (
            <LinkButton to={after} variant="primary">
              {afterLabel}
            </LinkButton>
          )}
          {idx > 0 && (
            <LinkButton to={`/topic/${n}/theory/${pack.theory[idx - 1].id}`}>
              ← Попередній розділ
            </LinkButton>
          )}
        </>
      )}
    </Screen>
  )
}
