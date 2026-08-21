import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Layers, User, Users } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { Skeleton, SkeletonCards, SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useApi } from '../../lib/api'
import { useSections } from '../../contexts/SectionsContext'
import type { ApiWeekDay } from '../../lib/mappers'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const PAGE_SIZE = 10

interface RosterStudent {
  id: string
  studentId: string
  rollNo: string
  name: string
  email: string
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
  const total = roster.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const visible = roster.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)
  void start
  void end

  useEffect(() => {
    setPage(1)
  }, [roster.length])

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
        <SkeletonCards count={4} />
        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <SkeletonRows rows={6} />
        </Card>
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
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-ink">Students in {section.name}</h3>
          <span className="text-sm font-medium text-ink-soft">{roster.length} students</span>
        </div>

        {rosterError && !rosterData ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={rosterError} onRetry={reloadRoster} />
          </div>
        ) : rosterLoading && !rosterData ? (
          <SkeletonRows rows={6} />
        ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Student ID</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Email</th>
                <th scope="col" className="px-6 py-3.5 font-semibold">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((student) => (
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
                  <td className="px-6 py-3.5">
                    <span className="text-sm font-bold text-ink-soft">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
