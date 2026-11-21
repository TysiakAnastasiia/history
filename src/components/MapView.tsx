import { motion } from 'motion/react'
import { useId, useState } from 'react'
import type { MapLayer } from '../lib/schema'
import { BASEMAP } from '../maps/basemap'
import { centroid, project, RIVER_LABELS, SEA_LABELS, smoothPath, viewBox } from '../maps/geo'

const PALETTE = 8
const color = (i: number) => `var(--map-${(i % PALETTE) + 1})`

interface Props {
  layer: MapLayer
  /**
   * explore — усе підписано, натиск на область показує опис (теорія);
   * pick — без підписів, треба натиснути потрібну область (питання «Покажіть на карті»);
   * show — показано лише вибрані області/маршрути без назв (питання «Що позначено?»)
   */
  mode?: 'explore' | 'pick' | 'show'
  show?: string[]
  picked?: string | null
  /** правильна область — підсвічується після відповіді */
  answer?: string | null
  onPick?: (id: string) => void
}

export function MapView({ layer, mode = 'explore', show, picked, answer, onPick }: Props) {
  const uid = useId().replace(/:/g, '')
  const [selected, setSelected] = useState<string | null>(null)
  const vb = viewBox(layer.view)
  const fs = vb.w / 34 // розмір шрифту в одиницях карти
  const revealed = answer != null

  const visible = (id: string) => mode !== 'show' || (show ?? []).includes(id)
  const regions = layer.regions.filter((r) => visible(r.id))
  const routes = layer.routes.filter((r) => visible(r.id))
  const labels = mode === 'explore'
  const routeColor = (i: number) => (mode === 'show' ? 'var(--bad)' : color(i + 2))

  const regionFill = (id: string, i: number) => {
    if (mode === 'pick') {
      if (revealed && id === answer) return 'var(--accent)'
      if (id === picked) return revealed ? 'var(--bad)' : 'var(--fg)'
      return 'var(--map-pick)'
    }
    if (mode === 'show') return 'var(--accent)'
    return color(i)
  }
  const regionOpacity = (id: string) => {
    if (mode === 'pick')
      return revealed && (id === answer || id === picked) ? 0.55 : id === picked ? 0.35 : 0.22
    if (mode === 'show') return 0.4
    return selected && selected !== id ? 0.18 : 0.38
  }

  const info =
    mode === 'explore' && selected
      ? [...layer.regions, ...layer.routes].find((x) => x.id === selected)
      : null

  return (
    <figure className="flex flex-col gap-2">
      <div className="border-line overflow-hidden rounded-2xl border">
        <svg
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          className="block h-auto w-full touch-manipulation select-none"
          role="img"
          aria-label={mode === 'explore' ? layer.title : 'Картосхема'}
        >
          <defs>
            {routes.map((r, i) => (
              <marker
                key={r.id}
                id={`arrow-${uid}-${i}`}
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto"
              >
                <path d="M0 0L10 5L0 10z" fill={routeColor(i)} />
              </marker>
            ))}
          </defs>

          {/* основа: море, суходіл, озера, річки */}
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
          {BASEMAP.rivers.map((r) => (
            <path
              key={r.name}
              d={r.d}
              fill="none"
              stroke="var(--map-water)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {RIVER_LABELS.map((r) => {
            const [x, y] = project(r.at)
            return (
              <text
                key={r.name}
                x={x}
                y={y}
                fontSize={fs * 0.62}
                fill="var(--map-water)"
                fontStyle="italic"
                textAnchor="middle"
                transform={`rotate(${r.angle} ${x} ${y})`}
              >
                {r.name}
              </text>
            )
          })}
          {SEA_LABELS.map((s) => {
            const [x, y] = project(s.at)
            return (
              <text
                key={s.name}
                x={x}
                y={y}
                fontSize={fs * 0.75}
                fill="var(--map-water)"
                fontStyle="italic"
                textAnchor="middle"
                letterSpacing="0.05em"
              >
                {s.name}
              </text>
            )
          })}

          {/* області */}
          {regions.map((r, i) => {
            const clickable = mode === 'pick' ? !revealed : mode === 'explore'
            return (
              <path
                key={r.id}
                d={smoothPath(r.points, true)}
                fill={regionFill(r.id, i)}
                fillOpacity={regionOpacity(r.id)}
                stroke={mode === 'pick' ? 'var(--fg)' : regionFill(r.id, i)}
                strokeOpacity={mode === 'pick' ? 0.35 : 0.9}
                strokeWidth="1.4"
                vectorEffect="non-scaling-stroke"
                className={clickable ? 'map-hit cursor-pointer' : ''}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={mode === 'pick' ? `Область ${i + 1}` : r.name}
                onClick={() => {
                  if (mode === 'pick' && !revealed) onPick?.(r.id)
                  if (mode === 'explore') setSelected((s) => (s === r.id ? null : r.id))
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return
                  e.preventDefault()
                  e.currentTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }))
                }}
              />
            )
          })}

          {/* маршрути */}
          {routes.map((r, i) => (
            <motion.path
              key={r.id}
              d={smoothPath(r.points, false)}
              fill="none"
              stroke={routeColor(i)}
              strokeWidth={selected === r.id ? 4.5 : 3}
              strokeDasharray={r.dashed ? '6 5' : undefined}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              markerEnd={`url(#arrow-${uid}-${i})`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.6, ease: 'easeInOut', delay: i * 0.3 }}
            />
          ))}

          {/* міста */}
          {layer.cities.map((c) => {
            const [x, y] = project(c.at)
            return (
              <g key={c.name}>
                <circle
                  cx={x}
                  cy={y}
                  r={fs * (c.capital ? 0.28 : 0.2)}
                  fill="var(--fg)"
                  stroke="var(--map-land)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
                {mode === 'explore' && (
                  <text
                    x={x + fs * 0.4}
                    y={y - fs * 0.3}
                    fontSize={fs * (c.capital ? 0.82 : 0.7)}
                    fontWeight={c.capital ? 700 : 500}
                    fill="var(--fg)"
                    stroke="var(--map-land)"
                    strokeWidth={fs * 0.18}
                    paintOrder="stroke"
                    strokeLinejoin="round"
                  >
                    {c.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* підписи областей — лише в режимі «розглянути» */}
          {labels &&
            regions.map((r) => {
              const [x, y] = project(r.label ?? centroid(r.points))
              return (
                <text
                  key={r.id}
                  x={x}
                  y={y}
                  fontSize={fs * 0.82}
                  fontWeight={700}
                  textAnchor="middle"
                  fill="var(--fg)"
                  stroke="var(--map-land)"
                  strokeWidth={fs * 0.2}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                  className="pointer-events-none"
                >
                  {r.name}
                </text>
              )
            })}
        </svg>
      </div>

      {mode === 'explore' && (
        <figcaption className="flex flex-col gap-2 text-sm">
          {routes.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {routes.map((r, i) => (
                <li key={r.id}>
                  <button
                    className="flex items-start gap-2 text-left"
                    onClick={() => setSelected((s) => (s === r.id ? null : r.id))}
                  >
                    <span
                      className="mt-2 h-0.5 w-6 shrink-0 rounded"
                      style={{ background: routeColor(i) }}
                    />
                    <span className={selected === r.id ? 'font-semibold' : ''}>{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {info?.note ? (
            <p className="glass rounded-2xl px-4 py-3">
              <b>{info.name}</b> — {info.note}
            </p>
          ) : (
            layer.regions.length > 0 && (
              <p className="text-muted">Натисніть на область, щоб дізнатися більше.</p>
            )
          )}
          {layer.description && <p className="text-muted">{layer.description}</p>}
        </figcaption>
      )}
    </figure>
  )
}
