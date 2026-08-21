import type { LucideIcon } from 'lucide-react'
import { cx } from '../utils'

interface StatCardProps {
  icon: LucideIcon
  title: string
  value: string
  footnote: string
  footnoteClassName?: string
}

export function StatCard({
  icon: Icon,
  title,
  value,
  footnote,
  footnoteClassName,
}: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-line bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5 lg:p-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark transition-colors duration-200 group-hover:bg-primary group-hover:text-white sm:h-11 sm:w-11">
          <Icon size={18} className="sm:h-5 sm:w-5" aria-hidden="true" />
        </span>
        <p className="min-w-0 text-xs font-medium leading-tight text-ink-soft sm:text-sm">{title}</p>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink sm:mt-4 sm:text-3xl lg:text-4xl">{value}</p>
      <p className={cx('mt-1 text-sm font-medium', footnoteClassName ?? 'text-ink-soft')}>
        {footnote}
      </p>
    </div>
  )
}
