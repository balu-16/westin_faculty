import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'
import { cx } from '../utils'

interface ErrorStateProps {
  /** API/error message to surface; falls back to a friendly line. */
  message?: string
  /** Retry callback — hides the button when omitted. */
  onRetry?: () => void
  /** Row layout for tabs, table cards and other small panels. */
  compact?: boolean
}

/**
 * Friendly error panel for failed data loads — danger-tinted card with an
 * alert icon, the API message (when available) and a retry button wired to
 * the consuming hook's `reload`.
 */
export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  const detail =
    message?.trim() || 'We could not load this content. Please check your connection and try again.'

  if (compact) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3"
      >
        <AlertCircle size={18} className="shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Something went wrong</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{detail}</p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="shrink-0">
            <RefreshCw size={14} aria-hidden="true" />
            Try Again
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-center rounded-[20px] border border-danger/20 bg-danger/5 text-center shadow-card',
        'min-h-[200px] justify-center px-6 py-10',
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertCircle size={22} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-base font-bold tracking-tight text-ink">Something went wrong</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-soft">{detail}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-5">
          <RefreshCw size={16} aria-hidden="true" />
          Try Again
        </Button>
      )}
    </div>
  )
}
