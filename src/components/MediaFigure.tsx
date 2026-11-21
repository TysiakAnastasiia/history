import { MEDIA } from '../content'

/** Зображення з підписом, автором і ліцензією (вимога вільних ліцензій CC BY-SA) */
export function MediaFigure({
  id,
  caption = true,
  className = '',
}: {
  id: string
  /** false — сховати назву (для питань «Яку пам’ятку зображено?») */
  caption?: boolean
  className?: string
}) {
  const m = MEDIA[id]
  if (!m) return null
  return (
    <figure className={`flex flex-col gap-1.5 ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}media/${m.file}`}
        alt={caption ? m.title : 'Зображення пам’ятки'}
        loading="lazy"
        decoding="async"
        className="border-line max-h-[60vh] w-full rounded-2xl border object-contain"
      />
      <figcaption className="text-muted text-xs leading-snug">
        {caption && <span className="text-fg block text-sm">{m.title}</span>}
        {m.author} ·{' '}
        <a
          href={m.source}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {m.license}
        </a>
      </figcaption>
    </figure>
  )
}
