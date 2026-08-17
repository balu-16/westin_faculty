import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '../../components/Button'
import { FallingIcons, HotelScene } from '../../components/HotelScene'
import westinLogoAvif from '../../assets/images/westin-logo.avif'
import westinLogoPng from '../../assets/images/westin-logo.png'

// Preload the AVIF logo via its hashed build URL (Vite rewrites the import to
// e.g. /assets/westin-logo-BOnCdI7I.avif, which is why index.html can't hard-
// code it). Runs at module evaluation — before LoginScreen first renders —
// so the logo request is already in flight when <picture> mounts.
if (typeof document !== 'undefined' && !document.querySelector('link[data-login-logo]')) {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.type = 'image/avif'
  link.href = westinLogoAvif
  link.dataset.loginLogo = ''
  document.head.appendChild(link)
}

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

/** c***a@test.com / FAC*****014 — keeps first & last characters visible. */
function maskIdentifier(value: string): string {
  if (value.includes('@')) {
    const [local, domain] = value.split('@')
    if (local.length <= 2) return `${local}@${domain}`
    const masked = `${local[0]}${'*'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}`
    return `${masked}@${domain}`
  }
  if (value.length <= 6) return value
  return `${value.slice(0, 3)}${'*'.repeat(4)}${value.slice(-3)}`
}

const pad = (n: number) => String(n).padStart(2, '0')
type PortalRole = 'faculty' | 'admin'

interface LoginScreenProps {
  /** Portal selected by the current route; the tabs navigate between portals. */
  activePortal: PortalRole
  /** Small label above the heading, e.g. "Faculty Portal" */
  portalName: string
  /** Card heading, e.g. "Faculty Login" */
  heading: string
  /** Copy under the "Welcome Back!" title on the left panel */
  welcomeMessage: string
  idLabel: string
  idPlaceholder: string
  /** Where a successful login lands */
  defaultPath: string
  /** Step 1 — dispatch the OTP email for this identifier */
  requestOtp: (_identifier: string) => Promise<void>
  /** Step 2 — verify the 6-digit code; resolves once the session is stored */
  login: (_identifier: string, _code: string) => Promise<void>
  isAuthenticated: boolean
}

/**
 * Split login screen — animated scene panel + a two-step OTP card:
 * Step 1 asks for the ID, Step 2 verifies the 6-digit code emailed by the API.
 */
export function LoginScreen({
  activePortal,
  portalName,
  heading,
  welcomeMessage,
  idLabel,
  idPlaceholder,
  defaultPath,
  requestOtp,
  login,
  isAuthenticated,
}: LoginScreenProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? defaultPath

  const [step, setStep] = useState<1 | 2>(1)
  const [identifier, setIdentifier] = useState('')
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  const [resendCount, setResendCount] = useState(0)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')

  const otpRefs = useRef<Array<HTMLInputElement | null>>([])

  // Focus the first OTP box whenever Step 2 (re)appears
  useEffect(() => {
    if (step === 2) otpRefs.current[0]?.focus()
  }, [step, resendCount])

  // Resend countdown — client-side only
  useEffect(() => {
    if (step !== 2) return
    setSecondsLeft(RESEND_SECONDS)
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, resendCount])

  // All hooks must run before this early return — a stored session flips
  // isAuthenticated a frame after mount, and skipping the effects above
  // would crash React with "fewer hooks than the previous render".
  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const allFilled = digits.every((d) => d !== '')

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setError(`Please enter your ${idLabel.toLowerCase()}.`)
      return
    }
    setError('')
    setSending(true)
    try {
      await requestOtp(identifier.trim())
      setDigits(Array(OTP_LENGTH).fill(''))
      setStep(2)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not send the code — please try again.',
      )
    } finally {
      setSending(false)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (!allFilled) return
    setError('')
    setVerifying(true)
    try {
      await login(identifier.trim(), digits.join(''))
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Verification failed. Please try again.',
      )
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    if (resending) return
    setError('')
    setDigits(Array(OTP_LENGTH).fill(''))
    setResending(true)
    try {
      await requestOtp(identifier.trim())
      setResendCount((c) => c + 1)
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not resend the code — please try again.',
      )
    } finally {
      setResending(false)
    }
  }

  const backToStepOne = () => {
    setError('')
    setDigits(Array(OTP_LENGTH).fill(''))
    setStep(1)
  }

  const setDigit = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!pasted) return
    setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] ?? ''))
    otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  return (
    <div className="flex min-h-screen bg-page">
      {/* Left — Westin College hotel & business scene */}
      <div className="relative hidden w-[46%] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#5FB7F5] via-[#3BA7F2] to-[#168BE5] p-12 lg:flex">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        {/* Very subtle slow-moving shimmer across the gradient */}
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-shimmer bg-[linear-gradient(115deg,rgba(255,255,255,0)_30%,rgba(255,255,255,0.09)_50%,rgba(255,255,255,0)_70%)] bg-[length:220%_100%]"
        />

        {/* Ambient falling hospitality/business icons (behind text and scene) */}
        <FallingIcons />

        <div className="relative z-10 w-full">
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Welcome Back!
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-base leading-relaxed text-white/85 sm:text-lg">
              {welcomeMessage}
            </p>
          </div>
          <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
            <HotelScene />
          </div>
        </div>
      </div>

      {/* Right — login card */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-56 w-56 rounded-full bg-primary-light blur-3xl lg:hidden"
        />
        <div className="relative w-full max-w-md animate-fade-in-up">
          <div className="rounded-[20px] border border-line bg-white p-7 shadow-[0_8px_30px_rgba(20,33,61,0.06)] sm:p-9">
            <div
              className="mb-7 grid grid-cols-2 rounded-xl bg-primary-lighter/70 p-1"
              role="tablist"
              aria-label="Choose portal"
            >
              {(['faculty', 'admin'] as const).map((portal) => {
                const selected = activePortal === portal
                return (
                  <button
                    key={portal}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => navigate(`/${portal}/login`)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                      selected
                        ? 'bg-white text-primary-dark shadow-sm'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {portal}
                  </button>
                )
              })}
            </div>

            <div className="mb-8 flex flex-col items-center text-center">
              <picture>
                <source srcSet={westinLogoAvif} type="image/avif" />
                <img
                  src={westinLogoPng}
                  width={575}
                  height={294}
                  alt="Westin College — College Of Hotel Management, College Of Business Management, Junior College"
                  className="h-16 w-auto object-contain sm:h-[72px]"
                />
              </picture>
              <p className="mt-3 text-sm font-semibold text-ink-soft">{portalName}</p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
                {step === 1 ? heading : 'Enter OTP'}
              </h1>
              {step === 1 ? (
                <p className="mt-1.5 text-sm text-ink-soft">Enter your credentials to continue.</p>
              ) : (
                <p className="mt-1.5 text-sm text-ink-soft">
                  We&apos;ve sent a 6-digit code to{' '}
                  <span className="font-semibold text-ink">{maskIdentifier(identifier.trim())}</span>
                </p>
              )}
            </div>

            {/* Step content — remounts with a gentle fade/slide on step change */}
            <div key={step} className="animate-fade-in-up">
              {step === 1 ? (
                <form onSubmit={handleSendOtp} noValidate>
                  <div>
                    <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-ink">
                      {idLabel}
                    </label>
                    <div className="relative">
                      <Mail
                        size={17}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/70"
                        aria-hidden="true"
                      />
                      <input
                        id="identifier"
                        type="text"
                        autoComplete="username"
                        placeholder={idPlaceholder}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="h-11 w-full rounded-xl border border-line bg-primary-lighter/60 pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/60 transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
                      {error}
                    </p>
                  )}

                  <Button type="submit" size="lg" loading={sending} className="mt-6 w-full">
                    {sending ? 'Sending OTP…' : 'Send OTP'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerify} noValidate>
                  {/* OTP boxes */}
                  <div className="grid grid-cols-6 gap-2.5" role="group" aria-label="6-digit OTP">
                    {digits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          otpRefs.current[i] = el
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                        onChange={(e) => setDigit(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        onFocus={(e) => e.target.select()}
                        className="h-12 w-full rounded-xl border border-line bg-primary-lighter/60 text-center text-lg font-semibold text-ink transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none"
                      />
                    ))}
                  </div>

                  {/* Countdown / resend */}
                  <div className="mt-4 text-center text-sm">
                    {secondsLeft > 0 ? (
                      <p className="text-ink-soft">
                        Resend OTP in{' '}
                        <span className="font-semibold text-ink">
                          00:{pad(secondsLeft)}
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending}
                        className="inline-flex items-center gap-1.5 font-semibold text-primary-dark transition-colors duration-200 hover:text-primary disabled:pointer-events-none disabled:opacity-60"
                      >
                        {resending ? 'Resending…' : 'Resend OTP'}
                      </button>
                    )}
                  </div>

                  {error && (
                    <p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    loading={verifying}
                    disabled={!allFilled}
                    className="mt-6 w-full"
                  >
                    {verifying ? 'Verifying…' : 'Verify & Login'}
                  </Button>

                  <button
                    type="button"
                    onClick={backToStepOne}
                    className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary-dark transition-colors duration-200 hover:text-primary"
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    Change ID/Email
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ink-soft">
            Having trouble signing in?{' '}
            <span className="font-semibold text-primary-dark">Contact the college IT desk</span>
          </p>
        </div>
      </div>
    </div>
  )
}
