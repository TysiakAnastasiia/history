import { motion, type TargetAndTransition } from 'motion/react'

export type Mood = 'idle' | 'happy' | 'sad'

const SRC = `${import.meta.env.BASE_URL}mascot.webp`
/** співвідношення сторін зображення (ширина / висота) */
const RATIO = 324 / 480

const moves: Record<Mood, TargetAndTransition> = {
  // спокій: ледь помітне «дихання»
  idle: {
    y: [0, -3, 0],
    scale: [1, 1.015, 1],
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
  },
  // правильна відповідь: підстрибує й радісно хитається
  happy: {
    y: [0, -22, 0, -8, 0],
    rotate: [0, -6, 4, -2, 0],
    transition: { duration: 0.7, ease: 'easeOut' },
  },
  // помилка: хитає головою й трохи никне
  sad: {
    x: [0, -7, 7, -5, 5, 0],
    rotate: [0, -3, 3, -2, 0, -4],
    y: [0, 0, 0, 0, 2, 4],
    transition: { duration: 0.7, ease: 'easeInOut' },
  },
}

/**
 * Маскот — кіт-козак. key={…} у батька перезапускає анімацію на кожну відповідь.
 * Рух вимикається налаштуванням «Анімації» або системним «зменшити рух» (MotionConfig у App).
 */
export function Mascot({ mood = 'idle', size = 120 }: { mood?: Mood; size?: number }) {
  return (
    <motion.img
      src={SRC}
      alt="Маскот — кіт-козак"
      width={Math.round(size * RATIO)}
      height={size}
      draggable={false}
      className="pointer-events-auto origin-bottom select-none"
      style={{ height: size, width: 'auto' }}
      animate={moves[mood]}
      whileHover={{ rotate: -6, transition: { type: 'spring', stiffness: 300, damping: 12 } }}
    />
  )
}
