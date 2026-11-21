import type { SupabaseClient } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Mascot } from '../components/Mascot'
import { Button } from '../components/ui'
import { authRedirectError, redirectUrl } from '../lib/auth'

/** Зрозумілі повідомлення замість англійських помилок Supabase */
function humanError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('rate limit') || m.includes('security purposes'))
    return 'Забагато спроб. Зачекайте кілька хвилин і спробуйте ще раз.'
  if (m.includes('expired') || m.includes('otp')) return 'Посилання застаріло. Надішліть нове.'
  if (m.includes('invalid') && m.includes('email')) return 'Перевірте адресу пошти.'
  if (m.includes('fetch') || m.includes('network')) return 'Немає з’єднання з інтернетом.'
  return `Не вдалося увійти: ${message}`
}

type Step = 'choose' | 'email' | 'sent'

export function Login({ sb, onGuest }: { sb: SupabaseClient; onGuest: () => void }) {
  const [step, setStep] = useState<Step>('choose')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(
    authRedirectError ? humanError(authRedirectError) : null,
  )

  const go = (s: Step) => {
    setError(null)
    setStep(s)
  }

  const google = async () => {
    setBusy('google')
    setError(null)
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl() },
    })
    // за успіху браузер іде на сторінку Google, тож далі виконується лише при помилці
    if (error) {
      setError(humanError(error.message))
      setBusy(null)
    }
  }

  const sendLink = async (e?: FormEvent) => {
    e?.preventDefault()
    const address = email.trim()
    if (!address) return
    setBusy('email')
    setError(null)
    const { error } = await sb.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: redirectUrl() },
    })
    setBusy(null)
    if (error) setError(humanError(error.message))
    else setStep('sent')
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex flex-col gap-3"
        >
          {step === 'choose' && (
            <>
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="text-muted mb-4 text-xs font-semibold tracking-[0.2em] uppercase">
                    НМТ · тренажер
                  </p>
                  <h1 className="font-display text-[clamp(3rem,13vw,4.5rem)] leading-[0.92] font-medium tracking-tight">
                    Історія
                    <br />
                    <span className="text-accent-text italic">України</span>
                  </h1>
                </div>
                <Mascot size={150} />
              </div>
              <p className="text-muted mb-6 leading-relaxed">
                Увійдіть, щоб прогрес зберігався й був доступний на всіх ваших пристроях.
              </p>

              <Button
                variant="primary"
                onClick={google}
                disabled={busy !== null}
                className="disabled:opacity-60"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-white">
                  <GoogleIcon />
                </span>
                {busy === 'google' ? 'Відкриваємо Google…' : 'Увійти через Google'}
              </Button>
              <Button className="justify-center rounded-full" onClick={() => go('email')}>
                Увійти через пошту
              </Button>

              <button
                onClick={onGuest}
                className="text-muted hover:text-fg mt-4 self-center text-sm underline-offset-4 transition hover:underline"
              >
                Продовжити без входу
              </button>
              <p className="text-muted -mt-1 text-center text-xs">
                Прогрес збережеться лише в цьому браузері
              </p>
            </>
          )}

          {step === 'email' && (
            <>
              <Back onClick={() => go('choose')} />
              <Heading>Вхід через пошту</Heading>
              <p className="text-muted mb-4 leading-relaxed">
                Без пароля: ми надішлемо посилання, натисніть його — і ви на сайті.
              </p>
              <form onSubmit={sendLink} className="flex flex-col gap-3">
                <label htmlFor="email" className="sr-only">
                  Пошта
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="ваша@пошта.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass placeholder:text-muted focus-visible:outline-fg min-h-14 rounded-full px-6 focus-visible:outline-2 focus-visible:outline-offset-2"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={busy !== null}
                  className="disabled:opacity-60"
                >
                  {busy === 'email' ? 'Надсилаємо…' : 'Надіслати посилання'}
                </Button>
              </form>
            </>
          )}

          {step === 'sent' && (
            <>
              <Back onClick={() => go('email')} />
              <Heading>Перевірте пошту</Heading>
              <p className="text-muted leading-relaxed">
                Ми надіслали посилання для входу на <b className="text-fg">{email.trim()}</b>.
                Відкрийте лист і натисніть посилання. Якщо листа немає, загляньте в «Спам».
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Button
                  className="justify-center rounded-full disabled:opacity-60"
                  disabled={busy !== null}
                  onClick={() => sendLink()}
                >
                  {busy === 'email' ? 'Надсилаємо…' : 'Надіслати ще раз'}
                </Button>
                <Button className="justify-center rounded-full" onClick={() => go('choose')}>
                  Інший спосіб входу
                </Button>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="text-bad mt-2 text-center">
              {error}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-muted hover:text-fg mb-6 flex items-center gap-2 self-start text-sm transition"
    >
      <span className="glass flex size-10 items-center justify-center rounded-full">←</span>
      Назад
    </button>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-display text-5xl leading-none font-medium tracking-tight">{children}</h1>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden className="shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
