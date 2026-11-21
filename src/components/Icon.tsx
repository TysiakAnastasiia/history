/** Тонкі лінійні іконки (24×24, обведення) — замість емодзі в інтерфейсі */
const PATHS = {
  exam: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  shuffle: 'M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  target:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5',
  games:
    'M6 12h4M8 10v4M15 13h.01M18 11h.01M17.3 5H6.7a4 4 0 0 0-4 3.6L2 15a3 3 0 0 0 5.4 2.2L9 15h6l1.6 2.2A3 3 0 0 0 22 15l-.7-6.4A4 4 0 0 0 17.3 5z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  timeline: 'M4 6h3M4 12h3M4 18h3M11 6h9M11 12h6M11 18h8M7 6v12',
  cards:
    'M4 7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM15 7.5l3.2.9a2 2 0 0 1 1.4 2.4l-2.4 9a2 2 0 0 1-2.2 1.5',
  letters: 'M4 19 8.5 5h1L14 19M5.6 14.5h6.8M16 19h4M18 19V9.5M16.5 11.5 18 9.5l1.5 2',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
