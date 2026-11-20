import { motion } from 'motion/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

/** Обгортка екрана: ширина, відступи, плавна поява */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12"
    >
      {children}
    </motion.main>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('glass p-5', className)}>{children}</div>
}

type Variant = 'primary' | 'glass' | 'selected' | 'right' | 'wrong'

const variants: Record<Variant, string> = {
  primary:
    'justify-center border-accent bg-accent font-semibold text-accent-ink hover:brightness-105',
  glass: 'glass hover:border-accent',
  selected: 'glass border-accent! ring-1 ring-accent',
  right: 'glass border-accent! bg-accent/20!',
  wrong: 'glass border-bad! bg-bad/20!',
}

const base =
  'flex w-full min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ' +
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-default'

export function Button({
  variant = 'glass',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={cx(base, variants[variant], className)} {...rest} />
}

export function LinkButton({
  to,
  variant = 'glass',
  className,
  children,
}: {
  to: string
  variant?: Variant
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={cx(base, variants[variant], className)}>
      {children}
    </Link>
  )
}

/** Права частина рядка-кнопки (рекорд, «скоро», лічильник) */
export function Aside({ children }: { children: ReactNode }) {
  return <span className="text-muted ml-auto shrink-0 text-sm">{children}</span>
}

export function BackBar({ to = '/', children }: { to?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        to={to}
        aria-label="Назад"
        className="glass hover:border-accent flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        ←
      </Link>
      <div className="text-muted min-w-0 flex-1 truncate text-sm">{children}</div>
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="bg-line h-1.5 flex-1 overflow-hidden rounded-full">
      <div
        className="bg-accent h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      {label}
      <span className={cx('ml-auto font-semibold', !checked && 'text-muted')}>
        {checked ? 'увімк.' : 'вимк.'}
      </span>
    </Button>
  )
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-[clamp(2.25rem,10vw,3.5rem)] leading-[1.05] font-extralight tracking-tight">
      {children}
    </h1>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-3 text-lg font-semibold">{children}</h2>
}
