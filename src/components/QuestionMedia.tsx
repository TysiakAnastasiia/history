import { MAPS } from '../content'
import type { Question } from '../lib/schema'
import { MapView } from './MapView'
import { MediaFigure } from './MediaFigure'

/** Зображення або картосхема над текстом питання. Назву пам’ятки показуємо лише після відповіді. */
export function QuestionMedia({ q, revealed }: { q: Question; revealed: boolean }) {
  const layer = q.map ? MAPS[q.map.layer] : undefined
  return (
    <>
      {q.image && <MediaFigure id={q.image} caption={revealed} className="mb-4" />}
      {q.map && layer && (
        <div className="mb-4">
          <MapView layer={layer} mode="show" show={q.map.show} />
        </div>
      )}
    </>
  )
}
