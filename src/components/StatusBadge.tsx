import { cx } from '../utils'

type Status = 'active' | 'inactive'

const statusStyles: Record<Status, { className: string; label: string }> = {
  active: { className: 'bg-[#DCFCE7] text-[#15803D]', label: 'Active' },
  inactive: { className: 'bg-[#F3F4F6] text-[#6B7280]', label: 'Inactive' },
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = statusStyles[status]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
        meta.className,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {meta.label}
    </span>
  )
}
