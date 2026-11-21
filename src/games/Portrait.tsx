import type { Look } from '../lib/schema'

/** Портрет персонажа «Подорожі» в стилі сайту: простий SVG, деталі залежать від типу */
const INK = '#2b2219'
const SKIN = '#e9c7a5'
const FUR = '#3a2e25'
const GOLD = '#c9962f'

export function Portrait({
  look,
  color = '#4a6a95',
  size = 64,
  className = '',
}: {
  look: Look
  color?: string
  size?: number
  className?: string
}) {
  const beard = (fill: string, long = false) => (
    <path
      d={
        long
          ? 'M35 54 Q36 86 50 92 Q64 86 65 54 Q58 66 50 66 Q42 66 35 54 Z'
          : 'M36 55 Q38 74 50 77 Q62 74 64 55 Q58 64 50 64 Q42 64 36 55 Z'
      }
      fill={fill}
      stroke={INK}
      strokeWidth="1.2"
    />
  )
  const moustache = (stroke = INK, droop = false) => (
    <path
      d={
        droop
          ? 'M50 56 Q40 55 35 68 M50 56 Q60 55 65 68'
          : 'M50 56 Q43 55 39 60 M50 56 Q57 55 61 60'
      }
      fill="none"
      stroke={stroke}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  )
  const face = (
    <>
      <ellipse cx="50" cy="47" rx="16" ry="19" fill={SKIN} stroke={INK} strokeWidth="1.4" />
      <circle cx="44" cy="45" r="1.6" fill={INK} />
      <circle cx="56" cy="45" r="1.6" fill={INK} />
      <path
        d="M50 47 L49 52 L51 52"
        fill="none"
        stroke={INK}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </>
  )
  // тулуб (одяг) спільний для всіх
  const body = (
    <>
      <path d="M12 100 Q16 72 50 70 Q84 72 88 100 Z" fill={color} stroke={INK} strokeWidth="1.4" />
      <path d="M40 72 L50 84 L60 72" fill="none" stroke={INK} strokeWidth="1.2" opacity="0.5" />
    </>
  )

  let back = null // те, що позаду обличчя (каптур, хустка)
  let front = null // те, що поверх обличчя (шапка, борода)
  switch (look) {
    case 'prince':
    case 'elder':
      front = (
        <>
          {beard(look === 'elder' ? '#cfcac3' : '#5a3e2b', look === 'elder')}
          {moustache(look === 'elder' ? '#a8a29e' : INK)}
          <path d="M33 25 Q50 2 67 25 Z" fill={color} stroke={INK} strokeWidth="1.3" />
          <rect
            x="31"
            y="22"
            width="38"
            height="11"
            rx="5.5"
            fill={FUR}
            stroke={INK}
            strokeWidth="1.3"
          />
          <circle cx="50" cy="9" r="2.2" fill={GOLD} />
        </>
      )
      break
    case 'helmet':
      front = (
        <>
          {beard('#6b4a31')}
          {moustache()}
          <path
            d="M31 36 L50 6 L69 36 Z"
            fill="#9aa0a6"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <rect
            x="30"
            y="33"
            width="40"
            height="5"
            rx="2"
            fill="#7d838a"
            stroke={INK}
            strokeWidth="1.1"
          />
          <rect
            x="48.5"
            y="36"
            width="3"
            height="13"
            fill="#9aa0a6"
            stroke={INK}
            strokeWidth="0.8"
          />
        </>
      )
      break
    case 'warrior':
      front = (
        <>
          {/* голена голова з довгим пасмом (оселедцем) і сережкою у вусі */}
          <path
            d="M47 28 Q28 24 31 50"
            fill="none"
            stroke={INK}
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          {moustache(INK, true)}
          <circle cx="33.5" cy="52" r="2.6" fill="none" stroke={GOLD} strokeWidth="1.6" />
          <circle cx="33.5" cy="55" r="1.4" fill="#b3463c" />
        </>
      )
      break
    case 'princess':
      back = (
        <path
          d="M29 56 Q27 22 50 21 Q73 22 71 56 Q71 82 50 86 Q29 82 29 56 Z"
          fill="#f3efe9"
          stroke={INK}
          strokeWidth="1.3"
        />
      )
      front = (
        <>
          <path
            d="M36 27 L39 18 L44 25 L50 15 L56 25 L61 18 L64 27 Z"
            fill={GOLD}
            stroke={INK}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <path
            d="M45 58 Q50 61 55 58"
            fill="none"
            stroke="#b3463c"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </>
      )
      break
    case 'monk':
      back = (
        <path
          d="M27 64 Q25 16 50 15 Q75 16 73 64 Z"
          fill="#1f1b17"
          stroke={INK}
          strokeWidth="1.3"
        />
      )
      front = (
        <>
          {beard('#cfcac3', true)}
          {moustache('#a8a29e')}
        </>
      )
      break
    case 'chronicler':
      front = (
        <>
          {beard('#7a5a3a')}
          {moustache()}
          <path d="M34 31 Q50 17 66 31 Z" fill="#1f1b17" stroke={INK} strokeWidth="1.2" />
          {/* сувій */}
          <rect
            x="62"
            y="80"
            width="22"
            height="14"
            rx="3"
            fill="#f3e6c8"
            stroke={INK}
            strokeWidth="1.2"
          />
          <path d="M66 85h14M66 89h10" stroke={INK} strokeWidth="0.9" />
        </>
      )
      break
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <defs>
        <clipPath id="portrait-clip">
          <circle cx="50" cy="50" r="49" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="49" fill="var(--glass-strong)" stroke="var(--line)" />
      <g clipPath="url(#portrait-clip)">
        {back}
        {body}
        <rect x="45" y="62" width="10" height="10" fill={SKIN} stroke={INK} strokeWidth="1" />
        {face}
        {front}
      </g>
    </svg>
  )
}
