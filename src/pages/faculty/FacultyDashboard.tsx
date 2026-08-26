import { useOutletContext } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Layers,
  Megaphone,
} from 'lucide-react'
import { PushPermissionBanner } from '../../components/PushPermissionBanner'
import { InstallPwaBanner } from '../../components/InstallPwaBanner'
import { Header } from '../../components/Header'
import { StatCard } from '../../components/StatCard'
import { TimetableCard } from '../../components/TimetableCard'
import { AnnouncementCard } from '../../components/AnnouncementCard'
import { QuickLink } from '../../components/QuickLink'
import { SectionCard } from '../../components/Card'
import { PageLoader } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useApi } from '../../lib/api'
import {
  mapAnnouncement,
  mapClassSession,
  type ApiAnnouncement,
  type ApiClassSession,
} from '../../lib/mappers'
import { useFacultyAuth } from '../../contexts/FacultyAuthContext'
import type { QuickLinkItem } from '../../types'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const facultyQuickLinks: QuickLinkItem[] = [
  { id: 'ql-1', label: 'Take Attendance', to: '/faculty/attendance', icon: 'clipboard' },
  { id: 'ql-2', label: 'Upload Materials', to: '/faculty/materials', icon: 'book' },
  { id: 'ql-3', label: 'Submit Daily Report', to: '/faculty/reports', icon: 'file' },
  { id: 'ql-4', label: 'Add Event', to: '/faculty/events', icon: 'calendar' },
]

interface FacultyDashboardPayload {
  stats: {
    classesToday: number
    classesCompleted: number
    sections: number
    pendingReports: number
    attendanceMarked: number
  }
  pendingReports: Array<{ id: string; section: string; subject: string; date: string; topic: string }>
  todaySessions: ApiClassSession[]
  announcements: ApiAnnouncement[]
}

export function FacultyDashboard() {
  const { user } = useFacultyAuth()
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const { data, error, loading, reload } = useApi<FacultyDashboardPayload>(
    'faculty-portal.session',
    '/api/faculty/me/dashboard',
  )

  const stats = data?.stats
  const todaySessions = (data?.todaySessions ?? []).map(mapClassSession)
  const announcements = (data?.announcements ?? []).map(mapAnnouncement)
  /** First load (no data yet) — skeleton the data areas; refetches keep stale data. */
  const initialLoading = loading && !data

  return (
    <div className="space-y-6">
      <Header
        title="Dashboard"
        subtitle="Here's your teaching day at a glance."
        onMenuClick={openMenu}
        showGreeting
        firstName={user?.firstName}
      />
      <PushPermissionBanner />
      <InstallPwaBanner />

      {error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : initialLoading ? (
        <PageLoader label="Loading your dashboard" size={130} className="min-h-[440px]" />
      ) : (
        <>
      {/* Statistics */}
      <section aria-label="Statistics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          title="Classes Today"
          value={String(stats?.classesToday ?? 0)}
          footnote={`${stats?.classesCompleted ?? 0} Completed`}
        />
        <StatCard
          icon={Layers}
          title="Total Sections Assigned"
          value={String(stats?.sections ?? 0)}
          footnote={user?.department ?? '—'}
        />
        <StatCard
          icon={FileText}
          title="Pending Reports"
          value={String(stats?.pendingReports ?? 0)}
          footnote="Due Soon"
          footnoteClassName="text-warning"
        />
        <StatCard
          icon={CheckCircle2}
          title="Attendance Marked Today"
          value={`${stats?.attendanceMarked ?? 0}/${stats?.classesToday ?? 0}`}
          footnote="On track"
          footnoteClassName="text-success"
        />
      </section>

      {/* Timetable + pending reports */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <SectionCard
          title="Today's Schedule"
          icon={<CalendarDays size={18} className="text-primary" aria-hidden="true" />}
          actionLabel="View Full Timetable"
          actionTo="/faculty/timetable"
          className="lg:col-span-3"
        >
          {todaySessions.length > 0 ? (
            <ol className="relative">
              <span
                aria-hidden="true"
                className="absolute bottom-2 left-[100px] top-2 w-px bg-line sm:left-[138px] lg:left-[148px]"
              />
              {todaySessions.map((session) => (
                <TimetableCard key={session.id} session={session} />
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-ink-soft">No classes scheduled for today.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Pending Daily Reports"
          icon={<FileText size={18} className="text-primary" aria-hidden="true" />}
          actionLabel="Submit Report"
          actionTo="/faculty/reports"
          className="lg:col-span-2"
        >
          {data && data.pendingReports.length > 0 ? (
            <ul className="relative">
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-[5px] top-3 w-px bg-line"
              />
              {data.pendingReports.map((report) => (
                <li key={report.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-3 z-10 h-2.5 w-2.5 rounded-full bg-warning ring-4 ring-warning/15"
                  />
                  <div className="ml-7 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <h4 className="font-semibold text-ink">{report.subject}</h4>
                      <span className="text-xs font-semibold text-warning">Due today</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{report.section}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-ink-soft">
              No reports pending — all caught up!
            </p>
          )}
        </SectionCard>
      </div>

      {/* Announcements + Quick links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <SectionCard
          title="Announcements"
          icon={<Megaphone size={18} className="text-primary" aria-hidden="true" />}
          className="lg:col-span-3"
        >
          {announcements.length > 0 ? (
            <ul className="relative">
              <span
                aria-hidden="true"
                className="absolute bottom-3 left-[5px] top-3 w-px bg-line"
              />
              {announcements.map((a, i) => (
                <AnnouncementCard key={a.id} announcement={a} isLast={i === announcements.length - 1} />
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-ink-soft">No announcements right now.</p>
          )}
        </SectionCard>

        <SectionCard title="Quick Links" className="lg:col-span-2">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {facultyQuickLinks.map((link) => (
              <QuickLink key={link.id} item={link} />
            ))}
          </div>
        </SectionCard>
      </div>
        </>
      )}
    </div>
  )
}
