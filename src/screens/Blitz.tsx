import { useState } from 'react'
import { Quiz } from '../components/Quiz'
import { BackBar, Button, LinkButton, Screen } from '../components/ui'
import { QUESTIONS } from '../content'
import { useProfile } from '../lib/profile'
import type { SingleQuestion } from '../lib/schema'
import { shuffle } from '../lib/util'

const pool = () => shuffle(QUESTIONS.filter((q): q is SingleQuestion => q.type === 'single'))

export function Blitz() {
  const { profile } = useProfile()
  const [round, setRound] = useState(() => ({ n: 0, questions: pool() }))

  return (
    <Screen>
      <BackBar>Бліц · рекорд {profile.blitz}</BackBar>
      <Quiz
        key={round.n}
        questions={round.questions}
        mode="blitz"
        game="blitz"
        finish={() => (
          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              onClick={() => setRound((r) => ({ n: r.n + 1, questions: pool() }))}
            >
              Ще раз
            </Button>
            <LinkButton to="/">На головну</LinkButton>
          </div>
        )}
      />
    </Screen>
  )
}
