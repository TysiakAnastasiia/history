import { useState } from 'react'
import { BackBar, Card, Screen, Title } from '../components/ui'
import { FUN_FACTS, topicTitle } from '../content'
import { useProfile } from '../lib/profile'

type Filter = 'all' | 'fav' | number

/** Стрічка цікавих фактів: фільтр за темами й обране */
export function Facts() {
  const { profile, update } = useProfile()
  const [filter, setFilter] = useState<Filter>('all')
  const topics = [...new Set(FUN_FACTS.map((f) => f.topic))].sort((a, b) => a - b)
  const list = FUN_FACTS.filter((f) =>
    filter === 'all'
      ? true
      : filter === 'fav'
        ? profile.favorites.includes(f.id)
        : f.topic === filter,
  )
  const toggleFav = (id: string) =>
    update((p) => ({
      ...p,
      favorites: p.favorites.includes(id)
        ? p.favorites.filter((x) => x !== id)
        : [...p.favorites, id],
    }))

  const chip = (value: Filter, label: string) => (
    <button
      key={String(value)}
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        filter === value
          ? 'border-accent bg-accent text-accent-ink'
          : 'border-line bg-glass hover:border-accent'
      }`}
    >
      {label}
    </button>
  )

  return (
    <Screen>
      <BackBar />
      <Title>Цікаві факти</Title>
      <div className="flex flex-wrap gap-2">
        {chip('all', 'Усі')}
        {chip('fav', `★ Обране (${profile.favorites.length})`)}
        {topics.map((t) => chip(t, `Тема ${t}`))}
      </div>
      {list.length === 0 && (
        <p className="text-muted mt-4">
          {filter === 'fav' ? 'Тут з’являться факти, позначені зірочкою.' : 'Фактів поки немає.'}
        </p>
      )}
      {list.map((f) => {
        const fav = profile.favorites.includes(f.id)
        return (
          <Card key={f.id}>
            <div className="flex gap-3">
              <p className="flex-1 leading-relaxed">{f.text}</p>
              <button
                onClick={() => toggleFav(f.id)}
                aria-label={fav ? 'Прибрати з обраного' : 'Додати в обране'}
                aria-pressed={fav}
                className={`size-9 shrink-0 text-2xl leading-none ${fav ? 'text-accent' : 'text-muted'}`}
              >
                {fav ? '★' : '☆'}
              </button>
            </div>
            <p className="text-muted mt-3 text-sm">
              {topicTitle(f.topic)} · {f.source}
              {f.status === 'draft' && ' · не перевірено'}
            </p>
          </Card>
        )
      })}
    </Screen>
  )
}
