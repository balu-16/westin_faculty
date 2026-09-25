import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { Button } from '../../components/Button'
import { LoginPullScene } from '../../components/LoginPullScene'
import { OtpAnimation } from '../../components/OtpAnimation'
import { InstallPwaBanner } from '../../components/InstallPwaBanner'
import westinLogoAvif from '../../assets/images/westin-logo.avif'
import westinLogoPng from '../../assets/images/westin-logo.png'
import { ApiError } from '../../lib/api'

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
interface LoginScreenProps {
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
  const [otpStatus, setOtpStatus] = useState<'idle' | 'success' | 'error'>('idle')
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
      let message: string
      if (err instanceof ApiError) {
        const payload = err.payload as { code?: string; message?: string } | null
        const code = payload?.code
        const serverMessage = typeof payload?.message === 'string' ? payload.message : ''
        if (code === 'ACCOUNT_NOT_REGISTERED' || /not registered/i.test(serverMessage)) {
          message = 'This email is not registered for the Westin Faculty/Admin Portal.'
          // Prefer portal-specific message from server when available (e.g. Faculty vs Admin)
          if (serverMessage && /Westin/.test(serverMessage)) message = serverMessage
        } else if (code === 'PORTAL_ACCESS_DENIED' || /cannot sign in/i.test(serverMessage)) {
          message = serverMessage || 'This account cannot sign in to the Westin Faculty/Admin Portal.'
        } else if (code === 'ACCOUNT_INACTIVE' || /inactive/i.test(serverMessage)) {
          message = 'This account is inactive. Contact your college administration.'
          if (serverMessage && /inactive/i.test(serverMessage)) message = serverMessage
        } else {
          message = err.message || 'Could not send the code — please try again.'
        }
      } else {
        message =
          err instanceof Error && err.message
            ? err.message
            : 'Could not send the code — please try again.'
      }
      setError(message)
      // Stay on step 1 — do not advance to OTP entry and do not show "We've sent a 6-digit code"
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
      setOtpStatus('success')
      // Let the OTP success animation play (~1.4s into verified) before navigating
      window.setTimeout(() => navigate(from, { replace: true }), 1400)
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : 'Verification failed. Please try again.'
      setError(message)
      setOtpStatus('error')
      setVerifying(false)
      // Show red + X for ~2.2s, then allow retry with cleared inputs
      window.setTimeout(() => {
        setOtpStatus('idle')
        setDigits(Array(OTP_LENGTH).fill(''))
        // Refocus first box after the error animation clears
        window.setTimeout(() => otpRefs.current[0]?.focus(), 100)
      }, 2200)
    }
  }

  const handleResend = async () => {
    if (resending) return
    setError('')
    setResending(true)
    try {
      await requestOtp(identifier.trim())
      setDigits(Array(OTP_LENGTH).fill(''))
      setResendCount((c) => c + 1)
    } catch (err) {
      let message: string
      if (err instanceof ApiError) {
        const payload = err.payload as { code?: string; message?: string } | null
        const code = payload?.code
        const serverMessage = typeof payload?.message === 'string' ? payload.message : ''
        if (code === 'ACCOUNT_NOT_REGISTERED' || /not registered/i.test(serverMessage)) {
          message = 'This email is not registered for the Westin Faculty/Admin Portal.'
          if (serverMessage && /Westin/.test(serverMessage)) message = serverMessage
        } else if (code === 'PORTAL_ACCESS_DENIED' || /cannot sign in/i.test(serverMessage)) {
          message = serverMessage || 'This account cannot sign in to the Westin Faculty/Admin Portal.'
        } else if (code === 'ACCOUNT_INACTIVE' || /inactive/i.test(serverMessage)) {
          message = 'This account is inactive. Contact your college administration.'
          if (serverMessage && /inactive/i.test(serverMessage)) message = serverMessage
        } else {
          message = err.message || 'Could not resend the code — please try again.'
        }
      } else {
        message =
          err instanceof Error && err.message
            ? err.message
            : 'Could not resend the code — please try again.'
      }
      setError(message)
      // Do not increment resendCount — countdown restarts only after a successful resend
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
    <div className="login-page-shell">
      <header className="login-page-header mx-auto flex w-full max-w-[1280px] items-center justify-between px-3 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <picture>
            <source srcSet={westinLogoAvif} type="image/avif" />
            <img
              src={westinLogoPng}
              width={575}
              height={294}
              alt="Westin College"
              className="h-10 w-auto object-contain sm:h-12"
            />
          </picture>
          <div className="hidden border-l border-[#d4e1e9] pl-3 sm:block">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#325d77]">
              Staff access
            </p>
            <p className="text-xs text-[#5d6f7e]">A clear path into the Westin portal</p>
          </div>
        </div>
        <span className="rounded-full border border-[#cce7f7] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#32637c]">
          {portalName}
        </span>
      </header>

      <main className="login-page-main">
        <LoginPullScene>
          <div className="login-card">
            <div className="login-card-topline mb-7 flex items-center justify-between gap-3">
              <span className="rounded-full border border-[#e0ece6] bg-[#eef5f4] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#32637c]">
                {portalName}
              </span>
              <span className="text-[10px] font-medium text-[#6b7f8d]">OTP protected</span>
            </div>

            <div className="login-card-intro mb-8 flex flex-col items-center text-center">
              <picture>
                <source srcSet={westinLogoAvif} type="image/avif" />
                <img
                  src={westinLogoPng}
                  width={575}
                  height={294}
                  alt="Westin College — College Of Hotel Management, College Of Business Management, Junior College"
                  className="h-14 w-auto object-contain sm:h-16"
                />
              </picture>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink">
                {step === 1 ? heading : 'Enter OTP'}
              </h2>
              {step === 1 ? (
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-soft">
                  {welcomeMessage}
                </p>
              ) : (
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  We&apos;ve sent a 6-digit code to{' '}
                  <span className="font-semibold text-ink">{maskIdentifier(identifier.trim())}</span>
                </p>
              )}
            </div>

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
                        className="h-12 w-full rounded-xl border border-line bg-[#f9fbfc] pl-10 pr-4 text-base text-ink placeholder:text-ink-soft/60 transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                      {error}
                    </p>
                  )}

                  <Button type="submit" size="lg" loading={sending} className="mt-6 w-full">
                    {sending ? 'Sending OTP…' : 'Send OTP'}
                  </Button>
                </form>
              ) : otpStatus !== 'idle' ? (
                <div className="login-otp-feedback py-2">
                  <OtpAnimation
                    digits={digits}
                    phone={maskIdentifier(identifier.trim())}
                    autoPlay
                    width={340}
                    variant={otpStatus === 'error' ? 'error' : 'success'}
                  />
                  <p
                    className={`mt-4 text-center text-sm font-medium ${otpStatus === 'error' ? 'text-danger' : 'text-ink-soft'}`}
                    role="status"
                  >
                    {otpStatus === 'error' ? error || 'Incorrect code. Please try again.' : 'Verified — redirecting…'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleVerify} noValidate>
                  <div className="grid grid-cols-6 gap-1.5 sm:gap-2.5" role="group" aria-label="6-digit OTP">
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
                        className="h-12 w-full rounded-xl border border-line bg-[#f9fbfc] text-center text-lg font-semibold text-ink transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none"
                      />
                    ))}
                  </div>

                  <div className="mt-4 text-center text-sm">
                    {secondsLeft > 0 ? (
                      <p className="text-ink-soft">
                        Resend OTP in{' '}
                        <span className="font-semibold text-ink">00:{pad(secondsLeft)}</span>
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
                    <p role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm text-danger">
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
                    className="mt-5 flex min-h-10 w-full items-center justify-center gap-1.5 text-sm font-semibold text-primary-dark transition-colors duration-200 hover:text-primary"
                  >
                    <ArrowLeft size={14} aria-hidden="true" />
                    Change ID/Email
                  </button>
                </form>
              )}
            </div>
          </div>
        </LoginPullScene>

        <div className="login-page-install mx-auto w-full max-w-[470px]">
          <InstallPwaBanner />
        </div>
      </main>

      <footer className="login-page-footer mx-auto flex w-full max-w-[1264px] justify-center px-3 py-6 text-center text-xs text-ink-soft sm:justify-between sm:px-6">
        <span className="font-semibold text-[#536b7e]">Learn. Grow. Belong.</span>
        <span className="hidden sm:inline">Westin College · Staff portal</span>
        <span>Need help? Contact the college IT desk.</span>
      </footer>
    </div>
  )
}
