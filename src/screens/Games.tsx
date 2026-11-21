import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { BackBar, Screen, Title } from '../components/ui'
import { useProfile } from '../lib/profile'

interface GameInfo {
  to: string
  name: string
  about: string
  icon: IconName
  /** як показати рекорд */
  record?: (v: number) => string
  recordKey?: string
}

const GAMES: GameInfo[] = [
  {
    to: '/games/journey',
    name: 'Подорож епохами',
    about: 'Мандрівка в часі з котом: розмови з князями, артефакти, бос епохи',
    icon: 'map',
  },
  { to: '/blitz', name: 'Бліц 60 секунд', about: 'Скільки встигнеш за хвилину', icon: 'bolt' },
  {
    to: '/games/memory',
    name: 'Картки на пам’ять',
    about: 'Запам’ятай і знайди пари «дата + подія»',
    icon: 'cards',
    recordKey: 'memory',
    record: (v) => `рекорд: ${v} помилок`,
  },
  {
    to: '/games/chronology',
    name: 'Хронологія',
    about: 'Розстав події по порядку',
    icon: 'timeline',
    recordKey: 'chronology',
    record: (v) => `серія: ${v}`,
  },
  {
    to: '/games/whoami',
    name: 'Хто я?',
    about: 'Вгадай діяча за підказками',
    icon: 'person',
    recordKey: 'whoami',
    record: (v) => `серія: ${v}`,
  },
  {
    to: '/games/whosaid',
    name: 'Хто це сказав?',
    about: 'Знайди автора цитати',
    icon: 'quote',
    recordKey: 'whosaid',
    record: (v) => `рекорд: ${v}/8`,
  },
  {
    to: '/games/fillgap',
    name: 'Заповни пропуск',
    about: 'Рік, термін чи діяч',
    icon: 'gap',
    recordKey: 'fillgap',
    record: (v) => `рекорд: ${v}/10`,
  },
  {
    to: '/games/hangman',
    name: 'Шибениця',
    about: 'Терміни за визначенням',
    icon: 'letters',
    recordKey: 'hangman',
    record: (v) => `серія: ${v}`,
  },
  {
    to: '/games/crossword',
    name: 'Кросворд',
    about: 'Терміни й діячі — по темі чи змішаний',
    icon: 'grid',
    recordKey: 'crossword',
    record: (v) => `розгадано: ${v}`,
  },
  {
    to: '/games/battleship',
    name: 'Морський бій',
    about: 'Постріл — правильна пара «дата + подія»',
    icon: 'anchor',
    recordKey: 'battleship',
    record: (v) => `перемог: ${v}`,
  },
  {
    to: '/games/fortress',
    name: 'Захист фортеці',
    about: 'Відбивай хвилі ворогів відповідями',
    icon: 'castle',
    recordKey: 'fortress',
    record: (v) => `рекорд: ${v} хвиль`,
  },
]

export const GAMES_COUNT = GAMES.length

export function Games() {
  const { profile } = useProfile()
  return (
    <Screen wide>
      <BackBar />
      <Title>Ігри</Title>
      <p className="text-muted">
        Граючи, повторюєш дати, діячів і терміни. З кожною новою темою в іграх автоматично більше
        матеріалу.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => {
          const v = g.recordKey
            ? profile.gameRecords[g.recordKey]
            : g.to === '/blitz'
              ? profile.blitz
              : undefined
          const rec = v ? (g.record ? g.record(v) : `рекорд: ${v}`) : null
          return (
            <Link
              key={g.to}
              to={g.to}
              className="glass hover:border-fg/25 flex flex-col gap-2 p-5 transition"
            >
              <span className="text-accent-text">
                <Icon name={g.icon} size={26} />
              </span>
              <span className="font-display text-2xl leading-tight font-medium">{g.name}</span>
              <span className="text-muted text-sm leading-snug">{g.about}</span>
              {rec && <span className="text-muted mt-auto pt-1 text-xs">{rec}</span>}
            </Link>
          )
        })}
      </div>
    </Screen>
  )
}
