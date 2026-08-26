import { NavLink } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import westinLogo from '../assets/images/westin-logo.avif'
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
  onToggleCollapsed?: () => void
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
  onToggleCollapsed,
}: SidebarContentProps) {
  const width = collapsed ? 'w-[72px]' : 'w-[280px]'
  const responsiveWidth = collapsed ? width : 'w-[82vw] max-w-[320px] lg:w-[280px]'

  // Heuristic grouping: keep original order but inject section labels
  const renderFlatAsGroups = () => {
    const isAdmin = portalTitle.toLowerCase().includes('admin')
    let groups: { label: string; items: NavItem[] }[] = []

    if (isAdmin) {
      const byTo = new Map(navItems.map((i) => [i.to, i] as const))
      const pick = (tos: string[]) => tos.map((t) => byTo.get(t)).filter(Boolean) as NavItem[]
      groups = [
        { label: 'Overview', items: pick(['/admin']) },
        { label: 'Management', items: pick(['/admin/teachers', '/admin/students', '/admin/sections', '/admin/timetable']) },
        { label: 'Content', items: pick(['/admin/events', '/admin/materials', '/admin/reports']) },
        { label: 'Account', items: pick(['/admin/settings']) },
      ].filter((g) => g.items.length > 0)
    } else {
      const byTo = new Map(navItems.map((i) => [i.to, i] as const))
      const pick = (tos: string[]) => tos.map((t) => byTo.get(t)).filter(Boolean) as NavItem[]
      groups = [
        { label: 'Overview', items: pick(['/faculty']) },
        { label: 'Academics', items: pick(['/faculty/timetable', '/faculty/attendance', '/faculty/sections']) },
        { label: 'Resources', items: pick(['/faculty/events', '/faculty/materials']) },
        { label: 'Operations', items: pick(['/faculty/reports']) },
        { label: 'Account', items: pick(['/faculty/settings']) },
      ].filter((g) => g.items.length > 0)
    }
    const groupedTos = new Set(groups.flatMap((g) => g.items.map((i) => i.to)))
    const leftover = navItems.filter((i) => !groupedTos.has(i.to) && !i.children)
    if (leftover.length) groups.push({ label: 'Other', items: leftover })
    return groups
  }

  const flatGroups = renderFlatAsGroups()
  const notificationGroup = navItems.find((i) => Array.isArray(i.children) && i.children.length > 0)

  return (
    <div
      className={cx(
        'flex h-full shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#4FB0F4] via-[#3BA7F2] to-[#168BE5] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_20px_60px_rgba(14,110,189,0.22)]',
        collapsed ? 'overflow-visible' : 'overflow-hidden',
        responsiveWidth,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header */}
      <div className={cx('relative flex shrink-0 items-center', collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 pt-4 pb-3')}>
        <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-[0_4px_14px_rgba(12,64,115,0.18)]">
          <img
            src={westinLogo}
            width={575}
            height={294}
            decoding="async"
            alt="Westin College"
            className={cx('block h-auto object-contain', collapsed ? 'w-8' : 'w-9')}
          />
        </div>

        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold leading-none tracking-tight text-white">Westin College</p>
              <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/75">{portalTitle}</p>
            </div>
            {onToggleCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand' : 'Collapse'}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/16 lg:flex"
              >
                <PanelLeftClose size={16} aria-hidden="true" />
              </button>
            )}
          </>
        )}

        {collapsed && onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-ink-soft shadow-md transition-colors hover:text-primary lg:flex"
          >
            <PanelLeftOpen size={12} aria-hidden="true" />
          </button>
        )}
      </div>

      {onNavigate && (
        <div className="flex items-center justify-between px-4 pb-2 lg:hidden">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">Menu</span>
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/16"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      {!collapsed && <div className="mx-4 h-px shrink-0 bg-white/12" />}

      {/* Nav */}
      <nav
        aria-label="Portal navigation"
        className={cx(
          'flex-1 py-3 scrollbar-thin min-h-0',
          collapsed ? 'space-y-1 px-2 overflow-y-auto overflow-x-visible' : 'space-y-5 px-3 overflow-y-auto overflow-x-hidden',
        )}
      >
        {collapsed ? (
          <>
            {navItems.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0
              if (hasChildren) {
                return (
                  <div key={item.to} className="group relative flex justify-center">
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      aria-label={item.label}
                      title={item.label}
                      className={({ isActive }) =>
                        cx(
                          'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                          isActive ? 'bg-white text-[#168BE5] shadow-[0_4px_14px_rgba(12,64,115,0.22)]' : 'text-white/85 hover:bg-white/[0.10] hover:text-white',
                        )
                      }
                    >
                      <item.icon size={20} aria-hidden="true" />
                    </NavLink>
                    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                      {item.label}
                      <span className="absolute right-full top-1/2 h-2 w-2 -translate-y-1/2 translate-x-[3px] rotate-45 border-b border-l border-line bg-ink" />
                    </span>
                  </div>
                )
              }
              return (
                <div key={item.to} className="group relative flex justify-center">
                  <NavLink
                    to={item.to}
                    end={item.to === '/admin' || item.to === '/faculty' || !item.to.endsWith('/sections')}
                    onClick={onNavigate}
                    aria-label={item.label}
                    title={item.label}
                    className={({ isActive }) =>
                      cx(
                        'flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                        isActive ? 'bg-white text-[#168BE5] shadow-[0_4px_14px_rgba(12,64,115,0.22)]' : 'text-white/85 hover:bg-white/[0.10] hover:text-white',
                      )
                    }
                  >
                    <item.icon size={20} aria-hidden="true" />
                  </NavLink>
                  <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-20 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl group-hover:block">
                    {item.label}
                    <span className="absolute right-full top-1/2 h-2 w-2 -translate-y-1/2 translate-x-[3px] rotate-45 border-b border-l border-line bg-ink" />
                  </span>
                </div>
              )
            })}
          </>
        ) : (
          <>
            {flatGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/62">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/admin' || item.to === '/faculty' || !item.to.endsWith('/sections')}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cx(
                          'group flex h-[42px] items-center gap-3 rounded-xl px-3 text-[13.5px] font-semibold transition-all duration-200',
                          isActive ? 'bg-white text-[#168BE5] shadow-[0_4px_14px_rgba(12,64,115,0.20)]' : 'text-white/85 hover:bg-white/[0.10] hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cx(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                              isActive ? 'bg-[#EAF6FF] text-[#168BE5]' : 'bg-white/10 text-white/85 group-hover:bg-white/14 group-hover:text-white',
                            )}
                          >
                            <item.icon size={16} aria-hidden="true" />
                          </span>
                          <span className="truncate">{item.label}</span>
                          {isActive && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#168BE5]" aria-hidden="true" />}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}

            {notificationGroup && (
              <div className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/62">{notificationGroup.label}</p>
                <div className="space-y-0.5">
                  {notificationGroup.children!.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      end
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cx(
                          'flex h-[40px] items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-200',
                          isActive ? 'bg-white text-[#168BE5] shadow-[0_4px_14px_rgba(12,64,115,0.18)]' : 'text-white/85 hover:bg-white/[0.10] hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cx(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                              isActive ? 'bg-[#EAF6FF] text-[#168BE5]' : 'bg-white/10 text-white/80 group-hover:bg-white/14',
                            )}
                          >
                            <child.icon size={14} aria-hidden="true" />
                          </span>
                          <span className="truncate">{child.label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="relative shrink-0">
        {!collapsed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-[0.07]"
            style={{
              background: 'radial-gradient(ellipse 380px 120px at 50% 100%, white 0%, transparent 70%), linear-gradient(to top, rgba(255,255,255,0.14), transparent 60%)',
            }}
          />
        )}
        <div className={cx('relative', collapsed ? 'px-2 pb-3 pt-2' : 'px-3 pb-4 pt-2')}>
          <ProfileCard name={profileName} detail={profileDetail} avatarUrl={avatarUrl} collapsed={collapsed} onLogout={onLogout} />
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
  portalTitle: string
  navItems: NavItem[]
  profileName: string
  profileDetail: string
  avatarUrl?: string | null
  collapsed?: boolean
  onLogout: () => void
  onToggleCollapsed?: () => void
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
  onToggleCollapsed,
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
            onToggleCollapsed={onToggleCollapsed}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      <div className={cx('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
        <div
          onClick={onClose}
          className={cx(
            'absolute inset-0 bg-[#0F2A4A]/45 backdrop-blur-[6px] transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cx(
            'absolute inset-y-0 left-0 overflow-hidden rounded-r-[20px] shadow-[0_20px_80px_rgba(12,64,115,0.35)] transition-transform duration-300 ease-out',
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
