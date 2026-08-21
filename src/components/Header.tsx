import type { ReactNode } from 'react'
import { Bell, CalendarDays, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { cx, getTodayDateLabel, todayDateLabel } from '../utils'
import type { PortalLayoutContext } from '../layouts/PortalShell'

interface HeaderProps {
  title: ReactNode
  subtitle?: string
  onMenuClick?: () => void
  onToggleSidebar?: () => void
  collapsed?: boolean
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
  onToggleSidebar,
  collapsed,
  showGreeting = false,
  firstName,
  actions,
}: HeaderProps) {
  let outletCtx: PortalLayoutContext | null = null
  try {
    outletCtx = useOutletContext<PortalLayoutContext>() as any
  } catch {}
  const effToggle = onToggleSidebar ?? outletCtx?.toggleSidebar
  const effCollapsed = collapsed ?? outletCtx?.collapsed
  // Prefer toggleMenu (open+close via hamburger) over openMenu for mobile; fallback to openMenu for compat
  const effMenu = onMenuClick ?? outletCtx?.toggleMenu ?? outletCtx?.openMenu
  const isMenuOpen = outletCtx?.isMenuOpen ?? false
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 sm:gap-2.5 text-xl font-bold tracking-tight text-ink sm:text-2xl lg:text-[1.7rem]">
          {effMenu && (
            <button
              type="button"
              onClick={effMenu}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft shadow-sm transition-colors duration-200 hover:text-primary lg:hidden"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          )}
          {effToggle && (
            <button
              type="button"
              onClick={effToggle}
              aria-label={effCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={effCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors duration-200 hover:text-primary lg:flex"
            >
              {effCollapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
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
        {subtitle && <p className={cx('mt-1 text-ink-soft', 'text-xs sm:text-sm lg:text-base')}>{subtitle}</p>}
      </div>

      {actions ?? (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Notifications (1 unread)"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:text-primary sm:h-10 sm:w-10"
          >
            <Bell size={16} className="sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white sm:right-2.5 sm:top-2.5" />
          </button>
          <div className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-medium text-ink-soft sm:h-10 sm:gap-2 sm:px-4 sm:text-sm">
            <CalendarDays size={14} className="text-primary sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{(() => { try { return getTodayDateLabel() } catch { return todayDateLabel } })()}</span>
            <span className="sm:hidden">{(() => { try { return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return todayDateLabel.slice(0,6) } })()}</span>
          </div>
        </div>
      )}
    </header>
  )
}
