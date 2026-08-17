import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cx } from '../utils'

interface CardProps {
  children: ReactNode
  className?: string
}

/** Base card: white, soft border, 16-20px radius, subtle shadow. */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-[20px] border border-line bg-white p-5 shadow-card sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface SectionCardProps {
  title: string
  icon?: ReactNode
  actionLabel?: string
  actionTo?: string
  children: ReactNode
  className?: string
}

/** Dashboard card with a title row, optional icon and a link action. */
export function SectionCard({
  title,
  icon,
  actionLabel,
  actionTo,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={cx('flex flex-col', className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
          {icon}
          {title}
        </h3>
        {actionLabel && actionTo && (
          <Link
            to={actionTo}
            className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-sm font-semibold text-primary-dark transition-colors duration-200 hover:bg-primary-light hover:text-primary"
          >
            {actionLabel}
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </Card>
  )
}
