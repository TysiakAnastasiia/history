import { use, useState } from 'react'
import { Quiz } from '../components/Quiz'
import { BackBar, LinkButton, Screen } from '../components/ui'
import { BY_ID, loadTopics, topicOf } from '../content'
import { useProfile } from '../lib/profile'
import { shuffle } from '../lib/util'

/** Робота над помилками з усіх тем: правильна відповідь прибирає питання зі списку */
export function Mistakes() {
  const { profile } = useProfile()
  // підвантажуємо лише теми, де є помилки
  use(loadTopics(profile.mistakes.map(topicOf)))
  // Набір фіксується на старті, щоб не змінювався після кожної відповіді
  const [questions] = useState(() =>
    shuffle(profile.mistakes.map((id) => BY_ID[id]).filter(Boolean)),
  )
  return (
    <Screen>
      <BackBar>Робота над помилками</BackBar>
      <Quiz
        questions={questions}
        game="mistakes"
        finish={() => (
          <LinkButton to="/" variant="primary">
            На головну
          </LinkButton>
        )}
      />
    </Screen>
  )
}
