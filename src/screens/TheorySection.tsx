import { use, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { MapExplorer } from '../components/MapExplorer'
import { MediaFigure } from '../components/MediaFigure'
import { Quiz } from '../components/Quiz'
import { BackBar, Button, Card, LinkButton, Screen } from '../components/ui'
import { BY_ID, hasTopic, loadPack, topicTitle } from '../content'
import type { TopicPack } from '../lib/schema'
import { useProfile } from '../lib/profile'

export function TheorySection() {
  const { n: nParam, section } = useParams()
  const n = Number(nParam)
  if (!hasTopic(n)) return <Navigate to="/topics" replace />
  const pack = use(loadPack(n))
  const idx = pack.theory.findIndex((s) => s.id === section)
  if (idx < 0) return <Navigate to={`/topic/${n}`} replace />
  // key: при переході на інший розділ стан (режим перевірки) скидається
  return <SectionView key={section} pack={pack} idx={idx} />
}

function SectionView({ pack, idx }: { pack: TopicPack; idx: number }) {
  const n = pack.topic
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
            {s.media && s.media.length > 0 && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {s.media.map((m) => (
                  <MediaFigure key={m} id={m} />
                ))}
              </div>
            )}
            {s.maps && s.maps.length > 0 && (
              <div className="mt-5">
                <MapExplorer layers={s.maps} />
              </div>
            )}
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
