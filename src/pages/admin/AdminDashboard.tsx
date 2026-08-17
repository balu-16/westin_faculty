import { Link, useOutletContext } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  FileText as ReportIcon,
  GraduationCap,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Header } from '../../components/Header'
import { StatCard } from '../../components/StatCard'
import { SectionCard } from '../../components/Card'
import { QuickLink } from '../../components/QuickLink'
import { Skeleton, SkeletonCards } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useApi } from '../../lib/api'
import { mapActivityIcon, mapEvent, type ApiEvent } from '../../lib/mappers'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
import type { ActivityItem, QuickLinkItem } from '../../types'
import { timeAgo } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const adminQuickLinks: QuickLinkItem[] = [
  { id: 'ql-1', label: 'Manage Teachers', to: '/admin/teachers', icon: 'clipboard' },
  { id: 'ql-2', label: 'Manage Students', to: '/admin/students', icon: 'book' },
  { id: 'ql-3', label: 'Review Daily Reports', to: '/admin/reports', icon: 'file' },
  { id: 'ql-4', label: 'Add Event', to: '/admin/events', icon: 'calendar' },
]

const activityIcons: Record<ActivityItem['icon'], LucideIcon> = {
  report: ReportIcon,
  attendance: ClipboardCheck,
  event: CalendarClock,
  material: FolderOpen,
  user: UserPlus,
}

interface AdminDashboardPayload {
  totals: { faculty: number; students: number; events: number; reportsToday: number }
  activityFeed: Array<{ id: string; actor: string; action: string; target: string; time: string }>
  upcomingEvents: ApiEvent[]
}

function ActivityRow({ item }: { item: AdminDashboardPayload['activityFeed'][number] }) {
  const Icon = activityIcons[mapActivityIcon(item.id)]
  return (
    <li className="flex items-start gap-3.5 border-b border-line py-3.5 first:pt-0 last:border-0 last:pb-0">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-ink">
          <span className="font-semibold">{item.actor}</span> {item.action}{' '}
          <span className="font-semibold text-primary-dark">{item.target}</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">{timeAgo(item.time)}</p>
      </div>
    </li>
  )
}

export function AdminDashboard() {
  const { user } = useAdminAuth()
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const { data, error, loading, reload } = useApi<AdminDashboardPayload>(
    'admin-portal.session',
    '/api/admin/dashboard',
  )

  const totals = data?.totals
  const feed = data?.activityFeed ?? []
  const upcoming = (data?.upcomingEvents ?? []).map(mapEvent).slice(0, 4)
  const initialLoading = loading && !data

  return (
    <div className="space-y-6">
      <Header
        title="Dashboard"
        subtitle="College-wide overview at a glance."
        onMenuClick={openMenu}
        showGreeting
        firstName={user?.firstName}
      />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
      {/* Statistics */}
      {initialLoading ? (
        <SkeletonCards count={4} />
      ) : (
      <section aria-label="Statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          title="Total Faculty"
          value={String(totals?.faculty ?? 0)}
          footnote="All Departments"
        />
        <StatCard
          icon={GraduationCap}
          title="Total Students"
          value={(totals?.students ?? 0).toLocaleString('en-IN')}
          footnote="All Years"
        />
        <StatCard
          icon={CalendarClock}
          title="Total Events"
          value={String(totals?.events ?? 0)}
          footnote="This Semester"
          footnoteClassName="text-primary-dark"
        />
        <StatCard
          icon={FileText}
          title="Reports Submitted Today"
          value={String(totals?.reportsToday ?? 0)}
          footnote="Across All Sections"
          footnoteClassName="text-success"
        />
      </section>
      )}

      {/* Activity + upcoming events */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <SectionCard
          title="Recent Activity"
          icon={<Activity size={18} className="text-primary" aria-hidden="true" />}
          className="xl:col-span-3"
        >
          {initialLoading ? (
            <div role="status" aria-label="Loading activity" className="min-h-[200px] space-y-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : feed.length > 0 ? (
            <ul>
              {feed.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-ink-soft">No recent activity.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming Events"
          icon={<CalendarClock size={18} className="text-primary" aria-hidden="true" />}
          actionLabel="View All"
          actionTo="/admin/events"
          className="xl:col-span-2"
        >
          {initialLoading ? (
            <div role="status" aria-label="Loading upcoming events" className="min-h-[180px] space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <ul className="flex-1 divide-y divide-line">
            {upcoming.map((event) => {
              const d = new Date(`${event.dateISO}T00:00:00`)
              return (
                <li key={event.id} className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${event.accent}, ${event.accent}B3)` }}
                  >
                    <CalendarClock size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{event.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {event.fullDate} • {event.location}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-primary-dark">
                    {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </li>
              )
            })}
          </ul>
          )}
          <Link
            to="/admin/events"
            className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-primary-lighter px-3 py-2.5 text-sm font-semibold text-primary-dark transition-colors duration-200 hover:bg-primary hover:text-white"
          >
            Manage Events
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        </SectionCard>
      </div>

      {/* Quick links */}
      <SectionCard title="Quick Links">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {adminQuickLinks.map((link) => (
            <QuickLink key={link.id} item={link} />
          ))}
        </div>
      </SectionCard>
        </>
      )}
    </div>
  )
}
