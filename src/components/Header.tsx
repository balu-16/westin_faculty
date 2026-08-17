import type { ReactNode } from 'react'
import { Bell, CalendarDays, Menu } from 'lucide-react'
import { cx, todayDateLabel } from '../utils'

interface HeaderProps {
  title: ReactNode
  subtitle?: string
  onMenuClick?: () => void
  /** Show the personalised greeting (dashboard); otherwise render `title` */
  showGreeting?: boolean
  /** First name for the greeting (portal-specific) */
  firstName?: string
  /** Optional custom top-right actions; defaults to bell + date pill */
  actions?: ReactNode
}

export function Header({
  title,
  subtitle,
  onMenuClick,
  showGreeting = false,
  firstName,
  actions,
}: HeaderProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">
          {onMenuClick && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors duration-200 hover:text-primary lg:hidden"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          )}
          {showGreeting ? (
            <span>
              {greeting}, {firstName ?? 'there'}! <span aria-hidden="true">👋</span>
            </span>
          ) : (
            title
          )}
        </h1>
        <p className={cx('mt-1 text-ink-soft', 'text-sm sm:text-base')}>{subtitle}</p>
      </div>

      {actions ?? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications (1 unread)"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <Bell size={18} aria-hidden="true" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
          </button>
          <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-medium text-ink-soft">
            <CalendarDays size={16} className="text-primary" aria-hidden="true" />
            <span>{todayDateLabel}</span>
          </div>
        </div>
      )}
    </header>
  )
}
