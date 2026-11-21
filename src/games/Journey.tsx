import { motion } from 'motion/react'
import { use, useEffect, useRef, useState } from 'react'
import { Quiz } from '../components/Quiz'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { INDEX, loadAll, TOPICS } from '../content'
import { useProfile } from '../lib/profile'
import type { Question, TopicPack } from '../lib/schema'
import { shuffle } from '../lib/util'

/**
 * Подорож епохами: шлях через теми програми по порядку.
 * Кожна епоха: «Шлях» (8 питань, треба 6) → «Бос» (5 складних завдань, треба 4).
 * Наступна епоха відкривається після перемоги над босом попередньої.
 */
const PATH = { count: 8, pass: 6 }
const BOSS = { count: 5, pass: 4 }
const stageKey = (n: number) => `journey:${n}` // 1 — шлях пройдено, 2 — боса переможено

type View = { kind: 'map' } | { kind: 'path' | 'boss'; topic: number; round: number }

export function Journey() {
  const packs = use(loadAll())
  const { profile } = useProfile()
  const [view, setView] = useState<View>({ kind: 'map' })

  const stage = (n: number) => profile.gameRecords[stageKey(n)] ?? 0
  const playable = TOPICS.filter((t) => t.n in INDEX)
  // епоха відкрита, якщо всі попередні епохи з контентом пройдено
  const isOpen = (n: number) => playable.filter((t) => t.n < n).every((t) => stage(t.n) >= 2)

  if (view.kind !== 'map') {
    const pack = packs.find((p) => p.topic === view.topic)!
    return (
      <Stage
        key={`${view.kind}-${view.topic}-${view.round}`}
        pack={pack}
        kind={view.kind}
        onBack={() => setView({ kind: 'map' })}
        onBoss={() => setView({ kind: 'boss', topic: view.topic, round: 0 })}
        onRetry={() => setView({ ...view, round: view.round + 1 })}
      />
    )
  }

  const done = playable.filter((t) => stage(t.n) >= 2).length

  return (
    <Screen>
      <BackBar>
        Подорож епохами · пройдено {done} з {playable.length}
      </BackBar>
      <Title>Подорож епохами</Title>
      <p className="text-muted">
        Від найдавніших часів до сучасності. Пройди шлях кожної епохи й переможи її боса, щоб іти
        далі.
      </p>

      <ol className="relative mt-2 flex flex-col gap-3 pl-8">
        {/* лінія шляху */}
        <span className="bg-line absolute top-2 bottom-2 left-3 w-0.5" aria-hidden />
        {TOPICS.map((t) => {
          const has = t.n in INDEX
          const st = stage(t.n)
          const open = has && isOpen(t.n)
          const dot =
            st >= 2
              ? 'bg-accent border-accent'
              : open
                ? 'bg-primary border-primary'
                : 'bg-glass border-line'
          return (
            <li key={t.n} className="relative">
              <span
                className={`absolute top-4 -left-[1.6rem] size-3.5 rounded-full border-2 ${dot}`}
                aria-hidden
              />
              <div className={`glass flex flex-col gap-2 px-4 py-3 ${!open ? 'opacity-50' : ''}`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted text-sm tabular-nums">{t.n}</span>
                  <span className="min-w-0 flex-1 font-medium">{t.title}</span>
                  <span className="text-muted shrink-0 text-xs">
                    {!has
                      ? 'скоро'
                      : st >= 2
                        ? 'пройдено ✓'
                        : st === 1
                          ? 'бос чекає'
                          : open
                            ? ''
                            : 'зачинено'}
                  </span>
                </div>
                {open && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setView({ kind: 'path', topic: t.n, round: 0 })}
                      className="border-line bg-glass hover:border-fg/25 rounded-full border px-4 py-1.5 text-sm transition"
                    >
                      {st >= 1 ? 'Пройти шлях ще раз' : `Шлях · ${PATH.count} питань`}
                    </button>
                    {st >= 1 && (
                      <button
                        onClick={() => setView({ kind: 'boss', topic: t.n, round: 0 })}
                        className="border-primary bg-primary text-primary-fg rounded-full border px-4 py-1.5 text-sm font-semibold transition hover:opacity-90"
                      >
                        {st >= 2 ? 'Бос ще раз' : 'До боса ⚔'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </Screen>
  )
}

function pickQuestions(pack: TopicPack, kind: 'path' | 'boss'): Question[] {
  if (kind === 'path')
    return shuffle(pack.questions.filter((q) => q.type !== 'mapPick')).slice(0, PATH.count)
  // бос — складні формати НМТ; якщо їх замало, доповнюємо звичайними
  const hard = shuffle(
    pack.questions.filter(
      (q) => q.type === 'matching' || q.type === 'sequence' || q.type === 'multi3of7',
    ),
  )
  const rest = shuffle(pack.questions.filter((q) => q.type === 'single'))
  return [...hard, ...rest].slice(0, BOSS.count)
}

function Stage({
  pack,
  kind,
  onBack,
  onBoss,
  onRetry,
}: {
  pack: TopicPack
  kind: 'path' | 'boss'
  onBack: () => void
  onBoss: () => void
  onRetry: () => void
}) {
  const [questions] = useState(() => pickQuestions(pack, kind))
  const rule = kind === 'path' ? PATH : BOSS
  const title = TOPICS.find((t) => t.n === pack.topic)?.title ?? ''

  return (
    <Screen>
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="До карти подорожі"
          className="glass hover:border-fg/25 flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          ←
        </button>
        <div className="text-muted min-w-0 flex-1 truncate text-sm">
          {kind === 'path' ? 'Шлях' : 'Бос'} · {title}
        </div>
      </div>
      {kind === 'boss' && (
        <Card className="flex items-center gap-3 py-3">
          <span className="text-3xl" aria-hidden>
            ⚔
          </span>
          <p className="text-sm">
            <b>Бос епохи.</b> {BOSS.count} найскладніших завдань у форматі НМТ — щоб перемогти,
            треба {BOSS.pass}.
          </p>
        </Card>
      )}
      <Quiz
        questions={questions}
        game={kind === 'path' ? 'journey-path' : 'journey-boss'}
        finish={(good) => (
          <Result
            topic={pack.topic}
            kind={kind}
            passed={good >= rule.pass}
            need={rule.pass}
            onBack={onBack}
            onBoss={onBoss}
            onRetry={onRetry}
          />
        )}
      />
    </Screen>
  )
}

function Result({
  topic,
  kind,
  passed,
  need,
  onBack,
  onBoss,
  onRetry,
}: {
  topic: number
  kind: 'path' | 'boss'
  passed: boolean
  need: number
  onBack: () => void
  onBoss: () => void
  onRetry: () => void
}) {
  const { update } = useProfile()
  // прогрес зберігаємо один раз
  const saved = useRef(false)
  useEffect(() => {
    if (!passed || saved.current) return
    saved.current = true
    const value = kind === 'path' ? 1 : 2
    update((p) => ({
      ...p,
      xp: p.xp + (kind === 'boss' ? 30 : 10),
      gameRecords: {
        ...p.gameRecords,
        [stageKey(topic)]: Math.max(p.gameRecords[stageKey(topic)] ?? 0, value),
      },
    }))
  }, [passed, kind, topic, update])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2.5">
      <p className={`text-lg font-semibold ${passed ? 'text-accent-text' : 'text-bad'}`}>
        {passed
          ? kind === 'path'
            ? 'Шлях пройдено! Попереду — бос епохи.'
            : 'Боса переможено! Епоху пройдено.'
          : `Не вистачило — потрібно щонайменше ${need}.`}
      </p>
      {passed && kind === 'path' ? (
        <Button variant="primary" onClick={onBoss}>
          До боса ⚔
        </Button>
      ) : (
        !passed && (
          <Button variant="primary" onClick={onRetry}>
            Спробувати ще раз
          </Button>
        )
      )}
      <Button className="justify-center rounded-full" onClick={onBack}>
        До карти подорожі
      </Button>
      <LinkButton to="/" className="justify-center rounded-full">
        На головну
      </LinkButton>
    </motion.div>
  )
}
