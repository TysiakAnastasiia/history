import { Mascot } from './Mascot'

/** Екран очікування: перевірка входу чи завантаження прогресу */
export function Loading({ text = 'Завантаження…' }: { text?: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3" aria-busy="true">
      <Mascot size={80} />
      <p className="text-muted">{text}</p>
    </main>
  )
}
