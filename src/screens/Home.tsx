import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'
import { Mascot } from '../components/Mascot'
import { useAuth } from '../lib/auth'
import { factOfDay, hasTopic, topicOf } from '../content'
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
  const { mode, email, signOut, signIn } = useAuth()
  const [askOut, setAskOut] = useState(false)
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => update((p) => ({ ...p, [k]: v }))
  const themeIdx = Math.max(
    0,
    THEMES.findIndex((t) => t.value === profile.theme),
  )

  const fact = factOfDay()
  const mistakes = profile.mistakes.filter((id) => hasTopic(topicOf(id))).length

  return (
    <Screen>
      <RankBar />
      <div className="mt-6 mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-muted mb-4 text-xs font-semibold tracking-[0.2em] uppercase">
            НМТ · тренажер
          </p>
          <Title>
            Історія
            <br />
            <span className="text-accent-text italic">України</span>
          </Title>
        </div>
        <Mascot size={140} />
      </div>

      <LinkButton to="/topics" variant="primary">
        Тренування по темах
        <Icon name="arrow" />
      </LinkButton>
      <LinkButton to="/exam">
        <Icon name="exam" /> Пробний НМТ
        <Aside>
          {profile.examBest > 0 ? `рекорд ${profile.examBest}/54` : '30 завдань · 60 хв'}
        </Aside>
      </LinkButton>
      <LinkButton to="/mix">
        <Icon name="shuffle" /> Мікс з усіх тем
      </LinkButton>
      <LinkButton to="/blitz">
        <Icon name="bolt" /> Бліц 60 секунд
        <Aside>рекорд {profile.blitz}</Aside>
      </LinkButton>
      {mistakes > 0 && (
        <LinkButton to="/mistakes">
          <Icon name="target" /> Робота над помилками
          <Aside>{mistakes}</Aside>
        </LinkButton>
      )}

      {fact && (
        <Link to="/facts" className="glass hover:border-fg/25 mt-3 block p-5 transition">
          <div className="text-muted mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
            Факт дня
          </div>
          <p className="font-display text-xl leading-snug">{fact.text}</p>
          <div className="text-accent-text mt-2 text-sm font-semibold">Усі цікаві факти →</div>
        </Link>
      )}
      <SectionTitle>Ігри</SectionTitle>
      <LinkButton to="/games/memory">
        <Icon name="cards" /> Картки на пам’ять
        <Aside>
          {profile.gameRecords.memory !== undefined
            ? `рекорд: ${profile.gameRecords.memory} помилок`
            : 'дата + подія'}
        </Aside>
      </LinkButton>
      <LinkButton to="/games/chronology">
        <Icon name="timeline" /> Хронологія
        <Aside>
          {profile.gameRecords.chronology
            ? `рекорд серії: ${profile.gameRecords.chronology}`
            : 'події по порядку'}
        </Aside>
      </LinkButton>
      <LinkButton to="/games/whoami">
        <Icon name="person" /> Хто я?
        <Aside>
          {profile.gameRecords.whoami
            ? `рекорд серії: ${profile.gameRecords.whoami}`
            : 'діяч за підказками'}
        </Aside>
      </LinkButton>
      <LinkButton to="/games/hangman">
        <Icon name="letters" /> Шибениця
        <Aside>
          {profile.gameRecords.hangman ? `рекорд серії: ${profile.gameRecords.hangman}` : 'терміни'}
        </Aside>
      </LinkButton>
      <Button disabled className="opacity-60">
        <Icon name="games" />
        <span>Кросворд · Морський бій · Захист фортеці</span>
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
      <SectionTitle>Акаунт</SectionTitle>
      {mode === 'cloud' && (
        <Button onClick={() => setAskOut(true)}>
          <span className="min-w-0 truncate">{email}</span>
          <span className="text-bad ml-auto shrink-0 font-semibold">Вийти</span>
        </Button>
      )}
      {mode === 'guest' && (
        <Button onClick={signIn}>
          <span className="min-w-0">
            Ви не ввійшли
            <span className="text-muted block text-sm">
              Прогрес зберігається лише в цьому браузері
            </span>
          </span>
          <span className="ml-auto shrink-0 font-semibold">Увійти →</span>
        </Button>
      )}
      {mode === 'local' && (
        <p className="text-muted text-sm">
          Локальний режим: ключі Supabase не задані, прогрес зберігається лише в цьому браузері.
        </p>
      )}

      <p className="text-muted mt-2 text-sm">
        Найдовша серія: {profile.bestStreak} · Клавіші 1–4 — відповідь, Enter — далі
      </p>

      <ConfirmDialog
        open={askOut}
        title="Вийти з акаунта?"
        confirmLabel="Вийти"
        cancelLabel="Залишитися"
        onConfirm={() => {
          setAskOut(false)
          void signOut()
        }}
        onCancel={() => setAskOut(false)}
      >
        Прогрес збережено в хмарі — після входу він повернеться.
      </ConfirmDialog>
    </Screen>
  )
}
