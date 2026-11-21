import { use, useState } from 'react'
import { Quiz } from '../components/Quiz'
import { BackBar, Button, LinkButton, Screen } from '../components/ui'
import { loadAll } from '../content'
import { useProfile } from '../lib/profile'
import type { Question, SingleQuestion } from '../lib/schema'
import { shuffle } from '../lib/util'

const pool = (all: Question[]) =>
  shuffle(all.filter((q): q is SingleQuestion => q.type === 'single'))

export function Blitz() {
  const all = use(loadAll()).flatMap((p) => p.questions)
  const { profile } = useProfile()
  const [round, setRound] = useState(() => ({ n: 0, questions: pool(all) }))

  return (
    <Screen>
      <BackBar to="/games">Бліц · рекорд {profile.blitz}</BackBar>
      <Quiz
        key={round.n}
        questions={round.questions}
        mode="blitz"
        game="blitz"
        finish={() => (
          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              onClick={() => setRound((r) => ({ n: r.n + 1, questions: pool(all) }))}
            >
              Ще раз
            </Button>
            <LinkButton to="/games">До ігор</LinkButton>
          </div>
        )}
      />
    </Screen>
  )
}
