import { useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Quiz } from '../components/Quiz'
import { BackBar, LinkButton, Screen } from '../components/ui'
import { PACKS, topicTitle } from '../content'
import { useProfile } from '../lib/profile'
import { shuffle } from '../lib/util'

/** Скільки питань в одному раунді тренування теми */
const ROUND = 20

export function TopicQuiz() {
  const n = Number(useParams().n)
  const onlyMistakes = useSearchParams()[0].has('mistakes')
  const { profile } = useProfile()
  const pack = PACKS[n]

  // Набір питань фіксується на старті; інакше «помилки» змінювалися б після кожної відповіді
  const [questions] = useState(() => {
    const pool = shuffle(
      (pack?.questions ?? []).filter((q) => !onlyMistakes || profile.mistakes.includes(q.id)),
    )
    // Тренування — раунди по ROUND випадкових питань; помилки — усі одразу
    return onlyMistakes ? pool : pool.slice(0, ROUND)
  })
  if (!pack) return <Navigate to="/topics" replace />

  return (
    <Screen>
      <BackBar to={`/topic/${n}`}>
        {onlyMistakes ? 'Робота над помилками · ' : ''}
        {topicTitle(n)}
      </BackBar>
      <Quiz
        questions={questions}
        game={onlyMistakes ? 'mistakes' : 'topic'}
        finish={() => (
          <div className="flex flex-col gap-2.5">
            <LinkButton to={`/topic/${n}`} variant="primary">
              До теми
            </LinkButton>
            <LinkButton to="/">На головну</LinkButton>
          </div>
        )}
      />
    </Screen>
  )
}
