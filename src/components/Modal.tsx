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
      className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
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
          'relative max-h-[88vh] w-full animate-fade-in-up overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_8px_30px_rgba(20,33,61,0.12)]',
          wide ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors duration-200 hover:bg-primary-light hover:text-primary-dark"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto px-6 py-5 scrollbar-thin">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-primary-lighter/40 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
