import { motion } from 'motion/react'

export type Mood = 'idle' | 'happy' | 'sad'

const moves = {
  idle: {},
  happy: { y: [0, -14, 0], rotate: [0, -4, 0] },
  sad: { x: [0, -6, 6, -4, 0] },
}

/** Маскот-козак (SVG, без GIF). key={…} у батька перезапускає анімацію на кожну відповідь. */
export function Mascot({ mood = 'idle', size = 96 }: { mood?: Mood; size?: number }) {
  const ink = '#2b1b0e'
  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Козак-маскот"
      animate={moves[mood]}
      transition={{ duration: 0.5 }}
    >
      <path d="M32 40q28-36 56 0z" fill="#c62f3b" />
      <rect x="30" y="36" width="60" height="8" rx="4" fill={ink} />
      <circle cx="60" cy="68" r="30" fill="#f3c9a0" />
      {mood === 'happy' && (
        <path
          d="M40 58q6-8 12 0M68 58q6-8 12 0"
          stroke={ink}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {mood === 'sad' && (
        <>
          <circle cx="46" cy="60" r="4" fill={ink} />
          <circle cx="74" cy="60" r="4" fill={ink} />
          <path d="M38 50l14 4M82 50l-14 4" stroke={ink} strokeWidth="3" />
        </>
      )}
      {mood === 'idle' && (
        <>
          <circle cx="46" cy="58" r="4" fill={ink} />
          <circle cx="74" cy="58" r="4" fill={ink} />
        </>
      )}
      <path
        d="M36 76q12 10 24 2q12 8 24-2"
        stroke={ink}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={
          mood === 'happy' ? 'M48 86q12 12 24 0' : mood === 'sad' ? 'M50 94q10-9 20 0' : 'M52 90h16'
        }
        stroke="#8a2a2a"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M90 46q14 8 8 26" stroke={ink} fill="none" strokeWidth="4" strokeLinecap="round" />
    </motion.svg>
  )
}
