import type { SupabaseClient } from '@supabase/supabase-js'
import { useState, type FormEvent } from 'react'
import { Mascot } from '../components/Mascot'
import { Button, Card, Screen, Title } from '../components/ui'
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

export function Login({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState<'google' | 'email' | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    authRedirectError ? humanError(authRedirectError) : null,
  )

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

  const sendLink = async (e: FormEvent) => {
    e.preventDefault()
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
    else setSentTo(address)
  }

  return (
    <Screen>
      <div className="mt-[8vh]">
        <Mascot />
      </div>
      <Title>
        Історія
        <br />
        України
      </Title>
      <p className="text-muted mb-6 text-lg">
        Увійдіть, щоб прогрес зберігався й був доступний на всіх ваших пристроях.
      </p>

      {sentTo ? (
        <Card>
          <div className="mb-2 text-4xl" aria-hidden>
            📬
          </div>
          <h2 className="mb-2 text-xl font-semibold">Перевірте пошту</h2>
          <p className="text-muted leading-relaxed">
            Ми надіслали посилання для входу на <b className="text-fg">{sentTo}</b>. Відкрийте лист
            і натисніть посилання. Якщо листа немає, загляньте в «Спам».
          </p>
          <button
            className="text-accent-text mt-4 font-semibold underline-offset-4 hover:underline"
            onClick={() => setSentTo(null)}
          >
            Ввести іншу пошту
          </button>
        </Card>
      ) : (
        <>
          <Button
            variant="primary"
            onClick={google}
            disabled={busy !== null}
            className="disabled:opacity-60"
          >
            <GoogleIcon />
            {busy === 'google' ? 'Відкриваємо Google…' : 'Увійти через Google'}
          </Button>

          <div className="text-muted my-2 flex items-center gap-3 text-sm" aria-hidden>
            <span className="bg-line h-px flex-1" />
            або
            <span className="bg-line h-px flex-1" />
          </div>

          <form onSubmit={sendLink} className="flex flex-col gap-2.5">
            <label htmlFor="email" className="text-muted text-sm">
              Вхід без пароля: надішлемо посилання на пошту
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="ваша@пошта.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass placeholder:text-muted focus-visible:outline-accent min-h-14 rounded-2xl px-4 focus-visible:outline-3 focus-visible:outline-offset-2"
            />
            <Button
              type="submit"
              disabled={busy !== null}
              className="justify-center disabled:opacity-60"
            >
              {busy === 'email' ? 'Надсилаємо…' : 'Надіслати посилання'}
            </Button>
          </form>
        </>
      )}

      {error && (
        <p role="alert" className="text-bad mt-2">
          {error}
        </p>
      )}
    </Screen>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden className="shrink-0">
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
