import { motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Mascot } from './Mascot'
import { Button } from './ui'

interface Props {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Власне вікно підтвердження замість window.confirm.
 * Нативний <dialog>: фокус усередині, Esc закриває, решта сторінки недоступна.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Так',
  cancelLabel = 'Скасувати',
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      // клік по затемненню (поза панеллю) — скасування
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="text-fg m-auto w-[calc(100%-2rem)] max-w-sm bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="border-line bg-glass-strong flex flex-col items-center gap-3 rounded-3xl border p-6 text-center shadow-2xl backdrop-blur-xl"
        >
          <Mascot size={96} />
          <h2 id="confirm-title" className="text-xl font-semibold">
            {title}
          </h2>
          {children && <div className="text-muted">{children}</div>}
          <div className="mt-2 flex w-full flex-col gap-2.5">
            <Button variant="primary" onClick={onConfirm}>
              {confirmLabel}
            </Button>
            <Button className="justify-center" onClick={onCancel} autoFocus>
              {cancelLabel}
            </Button>
          </div>
        </motion.div>
      )}
    </dialog>
  )
}
