import { Aside, BackBar, LinkButton, Screen, Title } from '../components/ui'
import { INDEX, TOPICS } from '../content'

export function Topics() {
  return (
    <Screen>
      <BackBar />
      <Title>Теми</Title>
      <p className="text-muted mb-3">
        32 теми програми. Решта з’являться, коли буде готовий контент.
      </p>
      {TOPICS.map((t) => {
        const info = INDEX[t.n]
        const label = (
          <>
            <span className="text-muted w-7 shrink-0 tabular-nums">{t.n}</span>
            <span className="min-w-0">{t.title}</span>
          </>
        )
        return info ? (
          <LinkButton key={t.n} to={`/topic/${t.n}`}>
            {label}
            <Aside>{info.questions} пит.</Aside>
          </LinkButton>
        ) : (
          <div key={t.n} className="glass flex min-h-14 items-center gap-3 px-4 py-3 opacity-50">
            {label}
            <Aside>скоро</Aside>
          </div>
        )
      })}
    </Screen>
  )
}
