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
    <div className="group rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary-dark transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
          <Icon size={20} aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-ink-soft">{title}</p>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{value}</p>
      <p className={cx('mt-1 text-sm font-medium', footnoteClassName ?? 'text-ink-soft')}>
        {footnote}
      </p>
    </div>
  )
}
