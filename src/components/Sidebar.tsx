import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import westinLogo from '../assets/images/westin-logo.avif'
import { CampusIllustration } from './CampusIllustration'
import { ProfileCard } from './ProfileCard'
import { cx } from '../utils'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  children?: NavItem[]
}

interface SidebarContentProps {
  portalTitle: string
  navItems: NavItem[]
  profileName: string
  profileDetail: string
  avatarUrl?: string | null
  collapsed?: boolean
  onLogout: () => void
  onNavigate?: () => void
}

function SidebarContent({
  portalTitle,
  navItems,
  profileName,
  profileDetail,
  avatarUrl,
  collapsed,
  onLogout,
  onNavigate,
}: SidebarContentProps) {
  const width = collapsed ? 'w-[88px]' : 'w-[288px]'
  // On mobile the drawer should not exceed viewport width (iPhone SE = 320px)
  const responsiveWidth = collapsed ? width : 'w-[82vw] max-w-[288px] lg:w-[288px]'
  return (
    <div className={cx('flex h-full shrink-0 flex-col bg-gradient-to-b from-[#4FB0F4] via-[#3BA7F2] to-[#168BE5]', responsiveWidth)}>
      {/* Mobile top bar inside drawer — hamburger to close (no X) */}
      {onNavigate && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2 lg:hidden">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/80">Menu</span>
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </div>
      )}
      {/* College logo + portal title */}
      <div className={cx('pt-2 lg:pt-4', collapsed ? 'px-2' : 'px-4')}>
        <div className="rounded-2xl bg-white p-2.5 shadow-[0_6px_18px_rgba(20,33,61,0.08)]">
          <img
            src={westinLogo}
            width={575}
            height={294}
            decoding="async"
            alt="Westin College — College Of Hotel Management, College Of Business Management, Junior College"
            className="mx-auto block h-auto w-full"
          />
        </div>
        {!collapsed && (
          <>
            <p className="mt-3 text-center text-[17px] font-bold text-white">{portalTitle}</p>
            <div className="mx-2 mt-3.5 h-px bg-white/25" role="presentation" />
          </>
        )}
        {collapsed && <div className="mx-2 mt-3 h-px bg-white/25" role="presentation" />}
      </div>

      {/* Navigation — modular: supports optional collapsible children (e.g., Notifications → Send/History/Settings) */}
      <nav aria-label="Portal navigation" className={cx('flex-1 overflow-y-auto scrollbar-thin', collapsed ? 'space-y-1 px-2' : 'space-y-1 px-4')}>
        {navItems.map((item) => {
          const hasChildren = Array.isArray(item.children) && item.children.length > 0
          if (hasChildren && collapsed) {
            // Collapsed: show parent icon linking to first child, plus children icons underneath
            return (
              <div key={item.to} className="space-y-1">
                <NavLink
                  to={item.children![0].to}
                  onClick={onNavigate}
                  title={item.label}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    cx(
                      'flex h-[52px] items-center justify-center rounded-xl text-base font-semibold transition-all duration-200',
                      isActive ? 'bg-white text-primary-dark shadow-[0_4px_12px_rgba(20,33,61,0.08)]' : 'text-white/90 hover:bg-white/15 hover:text-white',
                    )
                  }
                >
                  <item.icon size={21} aria-hidden="true" />
                </NavLink>
              </div>
            )
          }
          if (hasChildren) {
            return (
              <div key={item.to} className="space-y-1">
                <p className="px-4 pt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">{item.label}</p>
                {item.children!.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    end
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        'flex h-[44px] items-center gap-2.5 rounded-xl px-4 text-sm font-semibold transition-all duration-200',
                        isActive
                          ? 'bg-white text-primary-dark shadow-[0_4px_12px_rgba(20,33,61,0.08)]'
                          : 'text-white/90 hover:bg-white/15 hover:text-white',
                      )
                    }
                  >
                    <child.icon size={18} aria-hidden="true" />
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cx(
                  'flex h-[52px] items-center rounded-xl text-base font-semibold transition-all duration-200',
                  collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
                  isActive
                    ? 'bg-white text-primary-dark shadow-[0_4px_12px_rgba(20,33,61,0.08)]'
                    : 'text-white/90 hover:bg-white/15 hover:text-white',
                )
              }
            >
              <item.icon size={21} aria-hidden="true" />
              {!collapsed && item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Campus illustration fading into the sidebar */}
      {!collapsed && (
        <div className="pointer-events-none select-none px-3 opacity-95">
          <CampusIllustration tone="white" />
        </div>
      )}

      {/* Profile card */}
      <div className={cx(collapsed ? 'px-2 pb-5 pt-2' : 'px-4 pb-5 pt-2')}>
        <ProfileCard name={profileName} detail={profileDetail} avatarUrl={avatarUrl} collapsed={collapsed} onLogout={onLogout} />
      </div>
    </div>
  )
}

interface SidebarProps {
  /** Mobile drawer open state */
  open: boolean
  onClose: () => void
  portalTitle: string
  navItems: NavItem[]
  profileName: string
  profileDetail: string
  avatarUrl?: string | null
  collapsed?: boolean
  onLogout: () => void
}

export function Sidebar({
  open,
  onClose,
  portalTitle,
  navItems,
  profileName,
  profileDetail,
  avatarUrl,
  collapsed,
  onLogout,
}: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="fixed inset-y-0 left-0 z-30">
          <SidebarContent
            portalTitle={portalTitle}
            navItems={navItems}
            profileName={profileName}
            profileDetail={profileDetail}
            avatarUrl={avatarUrl}
            collapsed={collapsed}
            onLogout={onLogout}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cx(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <div
          onClick={onClose}
          className={cx(
            'absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cx(
            'absolute inset-y-0 left-0 w-[82vw] max-w-[288px] transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarContent
            portalTitle={portalTitle}
            navItems={navItems}
            profileName={profileName}
            profileDetail={profileDetail}
            avatarUrl={avatarUrl}
            onLogout={onLogout}
            onNavigate={onClose}
          />
        </div>
      </div>
    </>
  )
}
