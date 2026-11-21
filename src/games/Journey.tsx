import { AnimatePresence, motion } from 'motion/react'
import { use, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MediaFigure } from '../components/MediaFigure'
import { Quiz } from '../components/Quiz'
import { BackBar, Button, Card, LinkButton, Screen, Title } from '../components/ui'
import { BY_ID, INDEX, loadPack, MEDIA, TOPICS } from '../content'
import { useProfile } from '../lib/profile'
import type { Journey as JourneyData, LonLat, Question, TopicPack } from '../lib/schema'
import { playResult } from '../lib/sound'
import { BASEMAP } from '../maps/basemap'
import { project, viewBox } from '../maps/geo'
import { Portrait } from './Portrait'

/**
 * Подорож епохами: мандрівник у часі з котом-провідником.
 * Епоха = карта з місцями подій; у кожному місці — розмова з персонажем і запитання;
 * правильна відповідь приносить артефакт. Фінал — бос-діалог із завданнями формату НМТ.
 */
const sceneKey = (topic: number, id: string) => `journey:${topic}:${id}`
const bossKey = (topic: number) => `journey:${topic}:boss`
const GUIDE = { name: 'Кіт-провідник', role: 'мандрівник у часі' }

type Line = { who: string; text: string }
type View =
  | { kind: 'eras' }
  | { kind: 'chapter'; topic: number }
  | { kind: 'scene'; topic: number; index: number }
  | { kind: 'boss'; topic: number; round: number }

export function Journey() {
  const [view, setView] = useState<View>({ kind: 'eras' })
  if (view.kind === 'eras') return <Eras onOpen={(topic) => setView({ kind: 'chapter', topic })} />
  return <ChapterRoute view={view} setView={setView} />
}

// ---------- Список епох ----------

function Eras({ onOpen }: { onOpen: (topic: number) => void }) {
  const { profile } = useProfile()
  const withStory = TOPICS.filter((t) => INDEX[t.n]?.journey)
  const done = (n: number) => !!profile.gameRecords[bossKey(n)]
  // епоха відкрита, якщо всі попередні епохи із сюжетом пройдено
  const open = (n: number) => withStory.filter((t) => t.n < n).every((t) => done(t.n))

  return (
    <Screen>
      <BackBar to="/games">Подорож епохами</BackBar>
      <Title>Подорож епохами</Title>
      <p className="text-muted">
        Ти — мандрівник у часі, кіт-козак — твій провідник. Зустрічай князів і літописців,
        відповідай на їхні запитання й збирай артефакти епох.
      </p>
      <ol className="relative mt-2 flex flex-col gap-3 pl-8">
        <span className="bg-line absolute top-2 bottom-2 left-3 w-0.5" aria-hidden />
        {TOPICS.map((t) => {
          const story = !!INDEX[t.n]?.journey
          const ok = story && open(t.n)
          const fin = done(t.n)
          return (
            <li key={t.n} className="relative">
              <span
                className={`absolute top-4 -left-[1.6rem] size-3.5 rounded-full border-2 ${
                  fin
                    ? 'border-accent bg-accent'
                    : ok
                      ? 'border-primary bg-primary'
                      : 'border-line bg-glass'
                }`}
                aria-hidden
              />
              <button
                disabled={!ok}
                onClick={() => onOpen(t.n)}
                className={`glass flex w-full items-baseline gap-2 px-4 py-3 text-left transition ${
                  ok ? 'hover:border-fg/25' : 'opacity-50'
                }`}
              >
                <span className="text-muted text-sm tabular-nums">{t.n}</span>
                <span className="min-w-0 flex-1 font-medium">{t.title}</span>
                <span className="text-muted shrink-0 text-xs">
                  {!story ? 'скоро' : fin ? 'пройдено ✓' : ok ? 'вирушити →' : 'зачинено'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </Screen>
  )
}

// ---------- Епоха: карта, сцени, колекція ----------

function ChapterRoute({
  view,
  setView,
}: {
  view: Exclude<View, { kind: 'eras' }>
  setView: (v: View) => void
}) {
  const pack = use(loadPack(view.topic))
  const story = pack.journey!
  const toChapter = () => setView({ kind: 'chapter', topic: view.topic })
  if (view.kind === 'scene')
    return (
      <SceneView key={view.index} pack={pack} story={story} index={view.index} onDone={toChapter} />
    )
  if (view.kind === 'boss')
    return (
      <BossView
        key={view.round}
        pack={pack}
        story={story}
        onBack={toChapter}
        onRetry={() => setView({ kind: 'boss', topic: view.topic, round: view.round + 1 })}
      />
    )
  return (
    <Chapter
      pack={pack}
      story={story}
      onBack={() => setView({ kind: 'eras' })}
      onScene={(index) => setView({ kind: 'scene', topic: view.topic, index })}
      onBoss={() => setView({ kind: 'boss', topic: view.topic, round: 0 })}
    />
  )
}

function Chapter({
  pack,
  story,
  onBack,
  onScene,
  onBoss,
}: {
  pack: TopicPack
  story: JourneyData
  onBack: () => void
  onScene: (i: number) => void
  onBoss: () => void
}) {
  const { profile } = useProfile()
  const done = story.scenes.map((s) => !!profile.gameRecords[sceneKey(pack.topic, s.id)])
  const current = done.indexOf(false) // перша непройдена сцена
  const bossOpen = current === -1
  const bossDone = !!profile.gameRecords[bossKey(pack.topic)]
  const [introSeen, setIntroSeen] = useState(done.some(Boolean))

  return (
    <Screen wide>
      <HeaderBack onClick={onBack}>Подорож епохами · {story.title}</HeaderBack>
      <Title>{story.title}</Title>

      {!introSeen ? (
        <Dialogue
          lines={story.intro}
          characters={story.characters}
          onEnd={() => setIntroSeen(true)}
          endLabel="Рушаймо!"
        />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <JourneyMap
              story={story}
              done={done}
              current={current}
              bossDone={bossDone}
              onScene={onScene}
              onBoss={onBoss}
            />
          </div>
          <div className="flex flex-col gap-2.5 lg:w-80 lg:shrink-0">
            {story.scenes.map((s, i) => {
              const open = done[i] || i === current
              const c = story.characters[s.character]
              return (
                <button
                  key={s.id}
                  disabled={!open}
                  onClick={() => onScene(i)}
                  className={`glass flex items-center gap-3 px-3 py-2.5 text-left transition ${
                    i === current ? 'border-accent ring-accent ring-1' : ''
                  } ${open ? 'hover:border-fg/25' : 'opacity-45'}`}
                >
                  <Portrait look={c.look} color={c.color} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {s.place}, {s.year}
                    </span>
                    <span className="text-muted block truncate text-xs">{c.name}</span>
                  </span>
                  <span className="text-muted shrink-0 text-xs">
                    {done[i] ? '✓' : open ? '→' : '🔒'}
                  </span>
                </button>
              )
            })}
            <button
              disabled={!bossOpen}
              onClick={onBoss}
              className={`flex items-center gap-3 rounded-3xl border px-3 py-2.5 text-left transition ${
                bossOpen
                  ? 'border-primary bg-primary text-primary-fg hover:opacity-90'
                  : 'border-line bg-glass opacity-45'
              }`}
            >
              <Portrait
                look={story.characters[story.boss.character].look}
                color={story.characters[story.boss.character].color}
                size={40}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Бос: {story.characters[story.boss.character].name}
                </span>
                <span className="block truncate text-xs opacity-75">
                  {story.boss.place}, {story.boss.year}
                </span>
              </span>
              <span className="shrink-0 text-xs">{bossDone ? '✓' : bossOpen ? '⚔' : '🔒'}</span>
            </button>
          </div>
        </div>
      )}

      {introSeen && <Collection pack={pack} story={story} />}
    </Screen>
  )
}

/** Карта епохи з пронумерованими місцями подій */
function JourneyMap({
  story,
  done,
  current,
  bossDone,
  onScene,
  onBoss,
}: {
  story: JourneyData
  done: boolean[]
  current: number
  bossDone: boolean
  onScene: (i: number) => void
  onBoss: () => void
}) {
  const vb = viewBox(story.view)
  const r = vb.w / 42
  // кілька сцен в одному місті — розводимо маркери по колу
  const points = useMemo(() => {
    const all: LonLat[] = [...story.scenes.map((s) => s.at), story.boss.at]
    const groups = new Map<string, number[]>()
    all.forEach((p, i) => {
      const k = p.map((x) => x.toFixed(1)).join(',')
      groups.set(k, [...(groups.get(k) ?? []), i])
    })
    return all.map((p, i) => {
      const [x, y] = project(p)
      const g = groups.get(p.map((v) => v.toFixed(1)).join(','))!
      if (g.length === 1) return [x, y] as const
      const a = (g.indexOf(i) / g.length) * Math.PI * 2 - Math.PI / 2
      return [x + Math.cos(a) * r * 3, y + Math.sin(a) * r * 3] as const
    })
  }, [story, r])
  const bossOpen = current === -1
  const path = points
    // пройдений шлях: від першої сцени до поточної
    .slice(0, current === -1 ? story.scenes.length + 1 : current + 1)
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join('')

  return (
    <div className="border-line overflow-hidden rounded-2xl border">
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="block h-auto w-full select-none"
        role="img"
        aria-label="Карта епохи"
      >
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="var(--map-sea)" />
        <path
          d={BASEMAP.land}
          fill="var(--map-land)"
          stroke="var(--map-coast)"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
        {BASEMAP.lakes.map((l) => (
          <path key={l.name} d={l.d} fill="var(--map-sea)" />
        ))}
        {BASEMAP.rivers.map((rv) => (
          <path
            key={rv.name}
            d={rv.d}
            fill="none"
            stroke="var(--map-water)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* шлях мандрівника */}
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeDasharray="5 5"
          vectorEffect="non-scaling-stroke"
          opacity="0.7"
        />
        {story.scenes.map((s, i) => {
          const [x, y] = points[i]
          const open = done[i] || i === current
          return (
            <g
              key={s.id}
              className={open ? 'cursor-pointer' : ''}
              onClick={() => open && onScene(i)}
              role="button"
              aria-label={`${s.place}, ${s.year}`}
            >
              {i === current && (
                <motion.circle
                  cx={x}
                  cy={y}
                  r={r * 1.6}
                  fill="var(--accent)"
                  initial={{ opacity: 0.5, scale: 0.6 }}
                  animate={{ opacity: 0, scale: 1.4 }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={done[i] ? 'var(--accent)' : open ? 'var(--primary)' : 'var(--map-pick)'}
                stroke="var(--map-land)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                opacity={open ? 1 : 0.55}
              />
              <text
                x={x}
                y={y + r * 0.38}
                fontSize={r * 1.05}
                fontWeight={700}
                textAnchor="middle"
                fill={done[i] ? 'var(--accent-ink)' : 'var(--primary-fg)'}
              >
                {i + 1}
              </text>
              {i === current && (
                <text
                  x={x + r * 1.5}
                  y={y - r * 0.6}
                  fontSize={r * 1.05}
                  fontWeight={600}
                  fill="var(--fg)"
                  stroke="var(--map-land)"
                  strokeWidth={r * 0.25}
                  paintOrder="stroke"
                >
                  {s.place}, {s.year}
                </text>
              )}
            </g>
          )
        })}
        {/* бос */}
        {(() => {
          const [x, y] = points[story.scenes.length]
          return (
            <g
              className={bossOpen ? 'cursor-pointer' : ''}
              onClick={() => bossOpen && onBoss()}
              role="button"
              aria-label="Бос епохи"
            >
              <circle
                cx={x}
                cy={y}
                r={r * 1.2}
                fill={bossDone ? 'var(--accent)' : bossOpen ? 'var(--bad)' : 'var(--map-pick)'}
                stroke="var(--map-land)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                opacity={bossOpen || bossDone ? 1 : 0.55}
              />
              <text x={x} y={y + r * 0.42} fontSize={r * 1.2} textAnchor="middle" fill="#fff">
                ⚔
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

function Collection({ pack, story }: { pack: TopicPack; story: JourneyData }) {
  const { profile } = useProfile()
  const got = story.scenes.filter((s) => profile.gameRecords[sceneKey(pack.topic, s.id)])
  return (
    <div className="mt-2">
      <h3 className="text-muted mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
        Колекція артефактів · {got.length} / {story.scenes.length}
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {story.scenes.map((s) => {
          const has = got.includes(s)
          const img = s.reward.image && MEDIA[s.reward.image]
          return (
            <div
              key={s.id}
              className={`glass flex flex-col gap-1.5 p-3 ${has ? '' : 'opacity-40'}`}
              title={has ? s.reward.about : 'Ще не знайдено'}
            >
              {img && has ? (
                <img
                  src={`${import.meta.env.BASE_URL}media/${img.file}`}
                  alt=""
                  className="aspect-square w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="bg-glass border-line flex aspect-square w-full items-center justify-center rounded-xl border text-3xl">
                  {has ? '🏺' : '?'}
                </div>
              )}
              <span className="text-xs leading-snug font-semibold">
                {has ? s.reward.name : '???'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Діалог ----------

function Speaker({ who, characters }: { who: string; characters: JourneyData['characters'] }) {
  if (who === 'guide')
    return (
      <img
        src={`${import.meta.env.BASE_URL}mascot.webp`}
        alt=""
        className="border-line bg-glass-strong size-12 shrink-0 rounded-full border object-contain p-0.5"
      />
    )
  const c = characters[who]
  return <Portrait look={c.look} color={c.color} size={48} />
}

function Bubble({ line, characters }: { line: Line; characters: JourneyData['characters'] }) {
  const c = line.who === 'guide' ? GUIDE : characters[line.who]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <Speaker who={line.who} characters={characters} />
      <div
        className={`glass min-w-0 flex-1 rounded-tl-md px-4 py-3 ${line.who === 'guide' ? 'bg-accent/10' : ''}`}
      >
        <div className="text-muted text-xs font-semibold">
          {c.name} <span className="font-normal">· {c.role}</span>
        </div>
        <p className="font-display mt-0.5 text-xl leading-snug">{line.text}</p>
      </div>
    </motion.div>
  )
}

/** Репліки з’являються по одній — натиск «Далі» або Enter/пробіл */
function Dialogue({
  lines,
  characters,
  onEnd,
  endLabel = 'Далі',
}: {
  lines: Line[]
  characters: JourneyData['characters']
  onEnd: () => void
  endLabel?: string
}) {
  const [shown, setShown] = useState(1)
  const end = useRef<HTMLDivElement>(null)
  const last = shown >= lines.length
  const advance = () => (last ? onEnd() : setShown((n) => n + 1))

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [shown])

  return (
    <div className="flex flex-col gap-3">
      {lines.slice(0, shown).map((l, i) => (
        <Bubble key={i} line={l} characters={characters} />
      ))}
      <div ref={end}>
        <Button variant="primary" onClick={advance} autoFocus>
          {last ? endLabel : 'Далі ▸'}
        </Button>
      </div>
    </div>
  )
}

// ---------- Сцена ----------

function SceneView({
  pack,
  story,
  index,
  onDone,
}: {
  pack: TopicPack
  story: JourneyData
  index: number
  onDone: () => void
}) {
  const { profile, update } = useProfile()
  const scene = story.scenes[index]
  const already = !!profile.gameRecords[sceneKey(pack.topic, scene.id)]
  const [stage, setStage] = useState<'talk' | 'ask' | 'outro' | 'reward'>('talk')
  const [tried, setTried] = useState<number[]>([])
  const [reply, setReply] = useState<Line | null>(null)
  const saved = useRef(false)

  const pick = (k: number) => {
    const o = scene.ask.options[k]
    setReply({ who: scene.character, text: o.reply })
    playResult(!!o.correct, profile.sound)
    if (!o.correct) {
      setTried((t) => [...t, k])
      return
    }
    if (!saved.current && !already) {
      saved.current = true
      const xp = tried.length === 0 ? 15 : 5
      update((p) => ({
        ...p,
        xp: p.xp + xp,
        gameRecords: { ...p.gameRecords, [sceneKey(pack.topic, scene.id)]: 1 },
      }))
    }
    setStage('outro')
  }

  const img = scene.reward.image

  return (
    <Screen>
      <HeaderBack onClick={onDone}>
        {scene.place}, {scene.year}
      </HeaderBack>
      <p className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
        Сцена {index + 1} / {story.scenes.length}
      </p>
      <Title>
        {scene.place}, <span className="text-accent-text italic">{scene.year}</span>
      </Title>

      {stage === 'talk' && (
        <Dialogue lines={scene.lines} characters={story.characters} onEnd={() => setStage('ask')} />
      )}

      {stage !== 'talk' && (
        <>
          {scene.lines.map((l, i) => (
            <Bubble key={i} line={l} characters={story.characters} />
          ))}
          <Bubble
            line={{ who: scene.character, text: scene.ask.text }}
            characters={story.characters}
          />
        </>
      )}

      {stage === 'ask' && (
        <>
          <AnimatePresence mode="wait">
            {reply && <Bubble key={reply.text} line={{ ...reply }} characters={story.characters} />}
          </AnimatePresence>
          <div className="flex flex-col gap-2.5 pl-15">
            {scene.ask.options.map((o, k) => (
              <Button
                key={k}
                disabled={tried.includes(k)}
                onClick={() => pick(k)}
                variant={tried.includes(k) ? 'wrong' : 'glass'}
                className="disabled:opacity-60"
              >
                <span className="text-muted shrink-0">▸</span>
                {o.text}
              </Button>
            ))}
          </div>
        </>
      )}

      {stage === 'outro' && reply && (
        <>
          <Bubble line={reply} characters={story.characters} />
          {scene.outro.length > 0 ? (
            <Dialogue
              lines={scene.outro}
              characters={story.characters}
              onEnd={() => setStage('reward')}
              endLabel="Забрати артефакт"
            />
          ) : (
            <Button variant="primary" onClick={() => setStage('reward')}>
              Забрати артефакт
            </Button>
          )}
        </>
      )}

      {stage === 'reward' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col gap-3"
        >
          <Card className="flex flex-col items-center gap-3 text-center">
            <p className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">
              Новий артефакт
            </p>
            {img ? (
              <MediaFigure id={img} className="max-w-xs" />
            ) : (
              <div className="text-6xl">🏺</div>
            )}
            <h2 className="font-display text-3xl font-medium">{scene.reward.name}</h2>
            <p className="text-muted">{scene.reward.about}</p>
            {!already && (
              <p className="text-accent-text text-sm font-semibold">
                +{tried.length === 0 ? 15 : 5} XP
              </p>
            )}
          </Card>
          <Button variant="primary" onClick={onDone} autoFocus>
            До карти
          </Button>
        </motion.div>
      )}
    </Screen>
  )
}

// ---------- Бос ----------

function BossView({
  pack,
  story,
  onBack,
  onRetry,
}: {
  pack: TopicPack
  story: JourneyData
  onBack: () => void
  onRetry: () => void
}) {
  const boss = story.boss
  const c = story.characters[boss.character]
  const [stage, setStage] = useState<'intro' | 'test'>('intro')
  const questions = boss.questions.map((id) => BY_ID[id]).filter(Boolean) as Question[]

  return (
    <Screen>
      <HeaderBack onClick={onBack}>
        Бос епохи · {boss.place}, {boss.year}
      </HeaderBack>
      <p className="text-muted text-xs font-semibold tracking-[0.2em] uppercase">Бос епохи</p>
      <Title>{c.name}</Title>
      {stage === 'intro' ? (
        <Dialogue
          lines={boss.intro}
          characters={story.characters}
          onEnd={() => setStage('test')}
          endLabel="Я готовий(-а)"
        />
      ) : (
        <Quiz
          questions={questions}
          game="journey-boss"
          finish={(good) => (
            <BossEnd
              pack={pack}
              story={story}
              won={good >= boss.pass}
              onBack={onBack}
              onRetry={onRetry}
            />
          )}
        />
      )}
    </Screen>
  )
}

function BossEnd({
  pack,
  story,
  won,
  onBack,
  onRetry,
}: {
  pack: TopicPack
  story: JourneyData
  won: boolean
  onBack: () => void
  onRetry: () => void
}) {
  const { update } = useProfile()
  const saved = useRef(false)
  const [finished, setFinished] = useState(false)
  useEffect(() => {
    if (!won || saved.current) return
    saved.current = true
    update((p) => ({
      ...p,
      xp: p.xp + 40,
      gameRecords: { ...p.gameRecords, [bossKey(pack.topic)]: 1 },
    }))
  }, [won, pack.topic, update])

  return (
    <div className="flex flex-col gap-3 text-left">
      {!finished ? (
        <Dialogue
          lines={won ? story.boss.win : story.boss.lose}
          characters={story.characters}
          onEnd={() => setFinished(true)}
          endLabel="Далі"
        />
      ) : (
        <>
          {won && (
            <p className="text-accent-text text-center text-lg font-semibold">
              Епоху пройдено · +40 XP
            </p>
          )}
          {!won && (
            <Button variant="primary" onClick={onRetry}>
              Спробувати ще раз
            </Button>
          )}
          <Button className="justify-center rounded-full" onClick={onBack}>
            До карти епохи
          </Button>
          <LinkButton to="/games" className="justify-center rounded-full">
            До ігор
          </LinkButton>
        </>
      )}
    </div>
  )
}

function HeaderBack({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        aria-label="Назад"
        className="glass hover:border-fg/25 flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        ←
      </button>
      <div className="text-muted min-w-0 flex-1 truncate text-sm">{children}</div>
    </div>
  )
}
