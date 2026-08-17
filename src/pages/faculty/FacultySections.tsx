import { useNavigate, useOutletContext } from 'react-router-dom'
import { ChevronRight, Layers } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useSections } from '../../contexts/SectionsContext'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

/**
 * Read-only section browser. The list comes from /api/faculty/me/sections via
 * SectionsContext — only the sections this faculty member teaches (or mentors).
 */
export function FacultySections() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const navigate = useNavigate()
  const { sections, loading, error, reload } = useSections()
  const initialLoading = loading && sections.length === 0

  return (
    <div className="space-y-6">
      <Header
        title="Sections"
        subtitle="Browse the sections you teach and their students"
        onMenuClick={openMenu}
      />

      <Card className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
            <Layers size={18} className="text-primary" aria-hidden="true" />
            My Sections
          </h3>
          <span className="text-sm font-medium text-ink-soft">{sections.length} sections</span>
        </div>

        {error && sections.length === 0 ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={() => void reload()} />
          </div>
        ) : initialLoading ? (
          <SkeletonRows rows={6} />
        ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">Section</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Department</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Year</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Students</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Class Teacher</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr
                  key={section.id}
                  onClick={() => navigate(`/faculty/sections/${section.id}`)}
                  className="cursor-pointer border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60"
                >
                  <td className="px-6 py-3.5">
                    <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                      {section.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-ink-soft">{section.department}</td>
                  <td className="px-4 py-3.5 text-ink-soft">{section.year}</td>
                  <td className="px-4 py-3.5 font-semibold text-ink">
                    {section.studentCount ?? 0}
                    <span className="font-normal text-ink-soft"> / {section.maxStrength}</span>
                  </td>
                  <td className="px-4 py-3.5 text-ink-soft">
                    {section.classTeacherName || '—'}
                    {section.isClassTeacher ? ' (you)' : ''}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex justify-end">
                      <ChevronRight size={16} className="text-ink-soft/50" aria-hidden="true" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {!initialLoading && !error && sections.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">
            No sections assigned to your timetable yet.
          </p>
        )}
      </Card>
    </div>
  )
}
