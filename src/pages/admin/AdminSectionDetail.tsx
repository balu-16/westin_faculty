import { useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, CheckCircle2, Layers, User, Users } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { StatCard } from '../../components/StatCard'
import { Avatar } from '../../components/Avatar'
import { Modal } from '../../components/Modal'
import { SelectField } from '../../components/FormFields'
import { Skeleton, SkeletonCards, SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { useSections } from '../../contexts/SectionsContext'
import { attendanceHealth, cx, healthClasses } from '../../utils'
import type { StudentRow } from '../../types'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

export function AdminSectionDetail() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const navigate = useNavigate()
  const { sectionId } = useParams<{ sectionId: string }>()
  const { sections, students, loading, error, reload: reloadSections, moveStudent } = useSections()

  const section = sections.find((s) => s.id === sectionId)
  // Roster comes from /api/admin/students (mapped in SectionsContext).
  const roster = students.filter((s) => s.sectionId === section?.id || s.section === section?.name)

  const [moving, setMoving] = useState<StudentRow | null>(null)
  const [targetSection, setTargetSection] = useState('')
  const [moveBusy, setMoveBusy] = useState(false)

  if (error && sections.length === 0) {
    return (
      <div className="space-y-6">
        <Header title="Section" subtitle="Section not found." onMenuClick={openMenu} />
        <ErrorState message={error} onRetry={() => void reloadSections()} />
      </div>
    )
  }

  // Directory still loading — mirror the page layout instead of flashing
  // "no longer exists" for a section that has not arrived yet.
  if (!section && loading) {
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
          <p className="text-sm text-ink-soft">This section no longer exists.</p>
          <Link
            to="/admin/sections"
            className="text-sm font-semibold text-primary-dark hover:text-primary"
          >
            ← Back to all sections
          </Link>
        </Card>
      </div>
    )
  }

  const otherSections = sections.filter((s) => s.id !== section.id)

  const openMove = (student: StudentRow) => {
    setMoving(student)
    setTargetSection('')
  }

  const handleMove = async () => {
    if (!moving || !targetSection) return
    const targetName = sections.find((s) => s.id === targetSection)?.name ?? targetSection
    setMoveBusy(true)
    try {
      await moveStudent(moving.id, targetSection)
      toast.success(`${moving.name} moved to ${targetName}.`)
      setMoving(null)
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not move the student.')
    } finally {
      setMoveBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title={section.name}
        subtitle={`${section.department} • ${section.year}`}
        onMenuClick={openMenu}
        actions={
          <Button variant="secondary" onClick={() => navigate('/admin/sections')}>
            <ArrowLeft size={16} aria-hidden="true" />
            All Sections
          </Button>
        }
      />

      {/* Summary */}
      <section aria-label="Section summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          title="Total Students"
          value={String(roster.length)}
          footnote={`of ${section.maxStrength} max strength`}
        />
        <StatCard icon={Layers} title="Department" value={section.department} footnote={section.year} />
        <StatCard
          icon={User}
          title="Class Teacher"
          value={section.classTeacherName || 'Unassigned'}
          footnote="Assigned mentor"
          footnoteClassName="text-primary-dark"
        />
        <StatCard
          icon={CheckCircle2}
          title="Available Seats"
          value={String(Math.max(0, section.maxStrength - roster.length))}
          footnote="Move students in from other sections"
          footnoteClassName="text-success"
        />
      </section>

      {/* Roster */}
      <Card className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-ink">Students in {section.name}</h3>
          <span className="text-sm font-medium text-ink-soft">{roster.length} students</span>
        </div>

        {loading && roster.length === 0 ? (
          <SkeletonRows rows={6} />
        ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Student ID</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Email</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Attendance %</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => {
                const meta = healthClasses(attendanceHealth(student.attendance))
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
                      <span className={cx('text-sm font-bold', meta.text)}>{student.attendance}%</span>
                      <span className="ml-2 text-[11px] font-medium text-ink-soft">{meta.label}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-end">
                        <Button variant="secondary" size="sm" onClick={() => openMove(student)}>
                          <ArrowRightLeft size={14} aria-hidden="true" />
                          Move
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {!loading && roster.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">
            No students allocated to {section.name} yet.
          </p>
        )}
      </Card>

      {/* Move student dialog */}
      <Modal
        open={moving !== null}
        onClose={() => setMoving(null)}
        title="Move Student"
        subtitle={moving ? `Reassign ${moving.name} to another section` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoving(null)}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={!targetSection} loading={moveBusy}>
              <ArrowRightLeft size={16} aria-hidden="true" />
              Confirm Move
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-soft">
          {moving?.name} is currently in{' '}
          <span className="font-semibold text-ink">{section.name}</span>. Choose the new section:
        </p>
        <SelectField
          id="move-target-section"
          label="Move to Section"
          required
          placeholder="Select section"
          options={otherSections.map((s) => ({
            value: s.id,
            label: `${s.name} (${students.filter((st) => st.section === s.name).length}/${s.maxStrength})`,
          }))}
          value={targetSection}
          onChange={(e) => setTargetSection(e.target.value)}
        />
      </Modal>
    </div>
  )
}
