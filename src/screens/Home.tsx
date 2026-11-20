import { Link } from 'react-router-dom'
import { Mascot } from '../components/Mascot'
import { BY_ID, factOfDay } from '../content'
import { RankBar } from '../components/RankBar'
import { Aside, Button, LinkButton, Screen, SectionTitle, Title, Toggle } from '../components/ui'
import { useProfile } from '../lib/profile'
import type { Profile, Theme } from '../lib/storage'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'як у системі' },
  { value: 'dark', label: 'темна' },
  { value: 'light', label: 'світла' },
]

export function Home() {
  const { profile, update } = useProfile()
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => update((p) => ({ ...p, [k]: v }))
  const themeIdx = Math.max(
    0,
    THEMES.findIndex((t) => t.value === profile.theme),
  )

  const fact = factOfDay()
  const mistakes = profile.mistakes.filter((id) => BY_ID[id]).length

  return (
    <Screen>
      <RankBar />
      <div className="mt-6">
        <Mascot />
      </div>
      <Title>
        Історія
        <br />
        України
      </Title>
      <p className="text-muted mb-6 text-lg">Тренажер до НМТ</p>

      <LinkButton to="/topics" variant="primary">
        Тренування по темах
      </LinkButton>
      <LinkButton to="/exam">
        <span aria-hidden>📝</span> Пробний НМТ
        <Aside>
          {profile.examBest > 0 ? `рекорд ${profile.examBest}/54` : '30 завдань · 60 хв'}
        </Aside>
      </LinkButton>
      <LinkButton to="/mix">
        <span aria-hidden>🔀</span> Мікс з усіх тем
      </LinkButton>
      <LinkButton to="/blitz">
        <span aria-hidden>⚡</span> Бліц 60 секунд
        <Aside>рекорд {profile.blitz}</Aside>
      </LinkButton>
      {mistakes > 0 && (
        <LinkButton to="/mistakes">
          <span aria-hidden>🎯</span> Робота над помилками
          <Aside>{mistakes}</Aside>
        </LinkButton>
      )}

      {fact && (
        <Link to="/facts" className="glass hover:border-accent mt-3 block p-5 transition">
          <div className="text-muted mb-1 text-sm font-semibold">Факт дня</div>
          <p className="leading-relaxed">{fact.text}</p>
          <div className="text-accent-text mt-2 text-sm font-semibold">Усі цікаві факти →</div>
        </Link>
      )}
      <Button disabled className="opacity-60">
        <span>
          <span aria-hidden>⚓</span> Морський бій · <span aria-hidden>🏰</span> Захист фортеці ·{' '}
          <span aria-hidden>🃏</span> Картки
        </span>
        <Aside>скоро</Aside>
      </Button>

      <SectionTitle>Налаштування</SectionTitle>
      <Toggle label="Звук" checked={profile.sound} onChange={(v) => set('sound', v)} />
      <Toggle
        label="Анімації"
        checked={profile.animations}
        onChange={(v) => set('animations', v)}
      />
      <Toggle label="Великий шрифт" checked={profile.bigText} onChange={(v) => set('bigText', v)} />
      <Button onClick={() => set('theme', THEMES[(themeIdx + 1) % THEMES.length].value)}>
        Тема
        <span className="ml-auto font-semibold">{THEMES[themeIdx].label}</span>
      </Button>
      <p className="text-muted mt-2 text-sm">
        Найдовша серія: {profile.bestStreak} · Клавіші 1–4 — відповідь, Enter — далі
      </p>
    </Screen>
  )
}
