import { Loader2 } from 'lucide-react'
import { cx } from '../utils'

/** Spinning loader icon — use inside buttons or tight inline spots. */
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <Loader2 size={size} className={cx('animate-spin text-primary', className)} aria-hidden="true" />
  )
}

/** Base skeleton block — pulse animation, soft primary tint. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-xl bg-primary-lighter', className)} />
}

/** Stat-card grid placeholder — mirrors the StatCard layout used on dashboards. */
export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading statistics"
      className={cx('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="mt-5 h-9 w-24" />
          <Skeleton className="mt-2.5 h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Table-row / list placeholder — mirrors directory, roster and report rows. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading data"
      className={cx('min-h-[120px] p-5 sm:p-6', className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-line/60 py-3.5 last:border-0"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-3 w-20 shrink-0 sm:block" />
          <Skeleton className="hidden h-3 w-14 shrink-0 lg:block" />
        </div>
      ))}
    </div>
  )
}

/** Small inline "loading" label for compact areas (tab panels, footers). */
export function InlineSpinner({ label }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-ink-soft">
      <Spinner size={16} />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  )
}
