import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '../utils'

interface ModalProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  /** Action row pinned at the bottom (buttons) */
  footer?: ReactNode
  /** Wide variant for dense forms */
  wide?: boolean
}

/** Centred dialog used for all portal forms (Add Event, Add Faculty, …). */
export function Modal({ open, title, subtitle, onClose, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        className={cx(
          'relative max-h-[92vh] w-full animate-fade-in-up overflow-hidden rounded-2xl border border-line bg-white shadow-[0_8px_30px_rgba(20,33,61,0.12)] sm:max-h-[88vh] sm:rounded-[20px]',
          wide ? 'max-w-[calc(100vw-1.5rem)] sm:max-w-2xl' : 'max-w-[calc(100vw-1.5rem)] sm:max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-ink sm:text-lg">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors duration-200 hover:bg-primary-light hover:text-primary-dark sm:h-9 sm:w-9"
          >
            <X size={16} className="sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-4 scrollbar-thin sm:max-h-[62vh] sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-primary-lighter/40 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
