import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Filter, Layers, Search, SlidersHorizontal, User, Users, X } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { StatusBadge } from '../../components/StatusBadge'
import { PageLoader } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useApi } from '../../lib/api'
import { useSections } from '../../contexts/SectionsContext'
import type { ApiWeekDay } from '../../lib/mappers'
import type { PortalLayoutContext } from '../../layouts/PortalShell'
import { attendanceHealth, cx, healthClasses } from '../../utils'

const PAGE_SIZE = 10

interface RosterStudent {
  id: string
  studentId: string
  rollNo: string
  name: string
  email: string
  attendance?: number
  status?: string
}

/** Read-only roster view of one section — the faculty counterpart of the admin detail page. */
export function FacultySectionDetail() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const { sectionId } = useParams<{ sectionId: string }>()
  const { sections, loading: sectionsLoading, error: sectionsError, reload: reloadSections } =
    useSections()

  const section = sections.find((s) => s.id === sectionId)
  const {
    data: rosterData,
    error: rosterError,
    loading: rosterLoading,
    reload: reloadRoster,
  } = useApi<RosterStudent[]>(
    'faculty-portal.session',
    section ? `/api/faculty/sections/${section.id}/students` : null,
    [sectionId],
  )
  const { data: weekData } = useApi<ApiWeekDay[]>(
    'faculty-portal.session',
    '/api/timetable/faculty/mine',
  )
  const roster = rosterData ?? []
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = query.trim() !== '' || attendanceFilter !== 'all' || statusFilter !== 'all'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return roster.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (attendanceFilter !== 'all') {
        const a = s.attendance ?? 0
        if (attendanceFilter === 'atRisk' && a >= 75) return false
        if (attendanceFilter === 'critical' && a >= 60) return false
        if (attendanceFilter === 'average' && (a < 75 || a >= 85)) return false
        if (attendanceFilter === 'good' && (a < 85 || a >= 90)) return false
        if (attendanceFilter === 'excellent' && a < 90) return false
      }
      if (statusFilter !== 'all' && (s.status ?? 'active') !== statusFilter) return false
      return true
    })
  }, [roster, query, attendanceFilter, statusFilter])

  const clearFilters = () => {
    setQuery('')
    setAttendanceFilter('all')
    setStatusFilter('all')
    setPage(1)
  }

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)
  void start
  void end

  useEffect(() => {
    setPage(1)
  }, [roster.length, attendanceFilter, statusFilter, query])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  if (sectionsError && sections.length === 0) {
    return (
      <div className="space-y-6">
        <Header title="Section" subtitle="Section not found." onMenuClick={openMenu} />
        <ErrorState message={sectionsError} onRetry={() => void reloadSections()} />
      </div>
    )
  }

  // Directory still loading — mirror the page layout with skeletons instead of
  // flashing "section not found" for a section that has not arrived yet.
  if (!section && sectionsLoading) {
    return (
      <div className="space-y-6">
        <Header title="Section" subtitle="Loading section…" onMenuClick={openMenu} />
        <PageLoader label="Loading section" />
      </div>
    )
  }

  if (!section) {
    return (
      <div className="space-y-6">
        <Header title="Section" subtitle="Section not found." onMenuClick={openMenu} />
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <Layers size={22} aria-hidden="true" />
          </span>
          <p className="text-sm text-ink-soft">This section is not part of your teaching schedule.</p>
          <Link
            to="/faculty/sections"
            className="text-sm font-semibold text-primary-dark hover:text-primary"
          >
            ← Back to my sections
          </Link>
        </Card>
      </div>
    )
  }

  const weeklyClasses = (weekData ?? []).filter((day) =>
    day.sessions.some((s) => s.sectionId === section.id),
  ).length

  return (
    <div className="space-y-6">
      <Header
        title={section.name}
        subtitle={`${section.department} • ${section.year} — read-only`}
        onMenuClick={openMenu}
        actions={
          <Link
            to="/faculty/sections"
            className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            My Sections
          </Link>
        }
      />

      {/* Summary */}
      <section aria-label="Section summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          title="Total Students"
          value={String(section.studentCount ?? roster.length)}
          footnote={`of ${section.maxStrength} max strength`}
        />
        <StatCard icon={Layers} title="Department" value={section.department} footnote={section.year} />
        <StatCard
          icon={User}
          title="Class Teacher"
          value={section.classTeacherName || 'Unassigned'}
          footnote={section.isClassTeacher ? 'You' : 'Assigned mentor'}
          footnoteClassName="text-primary-dark"
        />
        <StatCard
          icon={Layers}
          title="Weekly Classes"
          value={weekData ? String(weeklyClasses) : '—'}
          footnote="Days you teach this section"
          footnoteClassName="text-success"
        />
      </section>

      {/* Roster */}
      <Card className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-ink">Students in {section.name}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-sm font-medium text-ink-soft sm:inline">{roster.length} total</span>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/70" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search students..."
                aria-label="Search students"
                className="h-9 w-40 rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary focus:outline-none sm:w-48"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
                showFilters || hasActiveFilters ? 'border-primary bg-primary text-white' : 'border-line bg-white text-ink-soft hover:border-primary/40 hover:text-primary',
              )}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold">
                  {[attendanceFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length + (query.trim() ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-primary-lighter/40 px-5 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-ink-soft" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Filters</span>
            </div>
            <label className="flex items-center gap-1.5 text-sm">
              <span className="text-xs font-medium text-ink-soft">Attendance</span>
              <select
                value={attendanceFilter}
                onChange={(e) => setAttendanceFilter(e.target.value)}
                className="h-8 rounded-lg border border-line bg-white px-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
              >
                <option value="all">All</option>
                <option value="atRisk">Below 75% (At Risk)</option>
                <option value="critical">Below 60% (Critical)</option>
                <option value="average">75% - 84%</option>
                <option value="good">85% - 89%</option>
                <option value="excellent">90%+</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <span className="text-xs font-medium text-ink-soft">Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-line bg-white px-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm hover:bg-danger/10 hover:text-danger"
              >
                <X size={12} /> Clear all
              </button>
            )}
          </div>
        )}
        {hasActiveFilters && !showFilters && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-lighter/30 px-5 py-2 sm:px-6">
            <span className="text-xs font-medium text-ink-soft">Active filters:</span>
            {query.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                Search: “{query.trim()}” <button type="button" onClick={() => setQuery('')} className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={10} /></button>
              </span>
            )}
            {attendanceFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                {attendanceFilter === 'atRisk' ? '<75% At Risk' : attendanceFilter === 'critical' ? '<60% Critical' : attendanceFilter === 'average' ? '75-84%' : attendanceFilter === 'good' ? '85-89%' : '90%+'}
                <button type="button" onClick={() => setAttendanceFilter('all')} className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={10} /></button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                {statusFilter} <button type="button" onClick={() => setStatusFilter('all')} className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={10} /></button>
              </span>
            )}
            <button type="button" onClick={clearFilters} className="ml-auto text-xs font-semibold text-primary-dark hover:text-primary">
              Clear all
            </button>
          </div>
        )}

        {rosterError && !rosterData ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={rosterError} onRetry={reloadRoster} />
          </div>
        ) : rosterLoading && !rosterData ? (
          <PageLoader label="Fetching students" />
        ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Student ID</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Email</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Attendance</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => {
                const att = student.attendance ?? 0
                const health = attendanceHealth(att)
                const meta = healthClasses(health)
                return (
                  <tr
                    key={student.id}
                    className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} />
                        <span className="font-semibold text-ink">{student.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-ink-soft">{student.studentId}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{student.email}</td>
                    <td className="px-4 py-3.5">
                      <span className={cx('text-sm font-bold', meta.text)}>{att}%</span>
                      <span className="ml-2 text-[11px] font-medium text-ink-soft">{meta.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={(student.status as 'active' | 'inactive') ?? 'active'} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {!rosterLoading && !rosterError && filtered.length === 0 && roster.length > 0 && (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="text-sm text-ink-soft">No students match the current filters.</p>
            <button type="button" onClick={clearFilters} className="rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary-dark hover:bg-primary hover:text-white">
              Clear filters
            </button>
          </div>
        )}
        {!rosterLoading && !rosterError && roster.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">
            No students allocated to {section.name} yet.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <p className="text-xs text-ink-soft sm:text-sm">
            Showing <strong className="text-ink">{visible.length}</strong> of{' '}
            <strong className="text-ink">{total}</strong> students
          </p>
          <nav aria-label="Students pagination" className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-primary/40 hover:bg-primary-lighter disabled:pointer-events-none disabled:opacity-40"
            >
              ‹ Prev
            </button>
            <span className="px-1 text-sm font-medium text-ink-soft">
              Page <strong className="text-ink">{page}</strong> of{' '}
              <strong className="text-ink">{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-primary/40 hover:bg-primary-lighter disabled:pointer-events-none disabled:opacity-40"
            >
              Next ›
            </button>
          </nav>
        </div>
      </Card>
    </div>
  )
}
