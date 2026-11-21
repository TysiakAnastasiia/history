import { use, useState } from 'react'
import { Quiz } from '../components/Quiz'
import { BackBar, Button, LinkButton, Screen } from '../components/ui'
import { loadAll } from '../content'
import { shuffle } from '../lib/util'

const ROUND = 15

/** Міксований режим: випадкові питання з усіх тем і всіх типів, з поясненнями */
export function Mix() {
  const all = use(loadAll()).flatMap((p) => p.questions)
  const [round, setRound] = useState(() => ({
    n: 0,
    questions: shuffle(all).slice(0, ROUND),
  }))
  return (
    <Screen>
      <BackBar>Мікс · питання з усіх тем</BackBar>
      <Quiz
        key={round.n}
        questions={round.questions}
        game="mix"
        finish={() => (
          <div className="flex flex-col gap-2.5">
            <Button
              variant="primary"
              onClick={() =>
                setRound((r) => ({ n: r.n + 1, questions: shuffle(all).slice(0, ROUND) }))
              }
            >
              Ще раунд
            </Button>
            <LinkButton to="/">На головну</LinkButton>
          </div>
        )}
      />
    </Screen>
  )
}
