import { useState } from 'react'
import { MAPS } from '../content'
import { MapView } from './MapView'

/** Кілька шарів карти з перемикачем-вкладками (для теорії) */
export function MapExplorer({ layers }: { layers: string[] }) {
  const list = layers.map((id) => MAPS[id]).filter(Boolean)
  const [active, setActive] = useState(0)
  if (list.length === 0) return null
  const layer = list[Math.min(active, list.length - 1)]
  return (
    <div className="flex flex-col gap-3">
      {list.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist">
          {list.map((l, i) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
                i === active
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-line bg-glass hover:border-fg/25'
              }`}
            >
              {l.title}
            </button>
          ))}
        </div>
      )}
      <h3 className="font-display text-2xl leading-tight font-medium">{layer.title}</h3>
      {/* key: при зміні шару маршрути малюються заново */}
      <MapView key={layer.id} layer={layer} mode="explore" />
    </div>
  )
}
