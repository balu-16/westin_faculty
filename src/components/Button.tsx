import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cx } from '../utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'white' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const sizes = {
  sm: 'px-3.5 py-2 text-sm h-9',
  md: 'px-5 py-2.5 text-sm h-10',
  lg: 'px-7 py-3.5 text-base h-12',
}

const variants = {
  primary:
    'bg-primary text-white shadow-[0_6px_16px_rgba(59,167,242,0.35)] hover:bg-primary-dark hover:shadow-[0_8px_20px_rgba(22,139,229,0.4)]',
  secondary:
    'bg-white text-primary-dark border border-primary/40 hover:border-primary hover:bg-primary-lighter',
  white:
    'bg-white text-primary-dark shadow-[0_6px_16px_rgba(20,33,61,0.12)] hover:bg-primary-lighter',
  ghost: 'text-ink-soft hover:bg-primary-light hover:text-primary-dark',
  danger:
    'bg-danger text-white shadow-[0_6px_16px_rgba(239,68,68,0.30)] hover:bg-red-600 hover:shadow-[0_8px_20px_rgba(220,38,38,0.35)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
