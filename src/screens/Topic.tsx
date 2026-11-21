import { use } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Aside, BackBar, LinkButton, ProgressBar, Screen, Title } from '../components/ui'
import { hasTopic, loadPack, topicTitle } from '../content'
import { useProfile } from '../lib/profile'

export function Topic() {
  const n = Number(useParams().n)
  const { profile } = useProfile()
  if (!hasTopic(n)) return <Navigate to="/topics" replace />
  const pack = use(loadPack(n))

  const read = pack.theory.filter((s) => profile.read.includes(s.id)).length
  const mistakes = pack.questions.filter((q) => profile.mistakes.includes(q.id)).length

  return (
    <Screen>
      <BackBar to="/topics">Тема {n}</BackBar>
      <Title>{topicTitle(n)}</Title>

      <LinkButton to={`/topic/${n}/quiz`} variant="primary" className="mt-4">
        Тренування · {Math.min(20, pack.questions.length)} з {pack.questions.length} питань
      </LinkButton>
      {mistakes > 0 && (
        <LinkButton to={`/topic/${n}/quiz?mistakes=1`}>
          Робота над помилками
          <Aside>{mistakes}</Aside>
        </LinkButton>
      )}

      {pack.theory.length > 0 && (
        <>
          <div className="mt-4 flex items-center gap-3">
            <h2 className="text-lg font-semibold">Теорія</h2>
            <ProgressBar value={read / pack.theory.length} />
            <span className="text-muted text-sm">
              {read}/{pack.theory.length}
            </span>
          </div>
          {pack.theory.map((s, k) => (
            <LinkButton key={s.id} to={`/topic/${n}/theory/${s.id}`}>
              <span className="text-muted w-5 shrink-0">{k + 1}</span>
              {s.title}
              <Aside>{profile.read.includes(s.id) ? '✓' : ''}</Aside>
            </LinkButton>
          ))}
        </>
      )}
    </Screen>
  )
}
