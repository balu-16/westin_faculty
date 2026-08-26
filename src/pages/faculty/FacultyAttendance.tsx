import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { CheckCircle2, ClipboardCheck, ListChecks, RefreshCw, Users } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Avatar } from '../../components/Avatar'
import { SelectField } from '../../components/FormFields'
import { PageLoader } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { apiFetch, ApiError, useApi } from '../../lib/api'
import { useSections } from '../../contexts/SectionsContext'
import type { AttendanceMark, SectionStudent, SubmittedAttendance } from '../../types'
import { cx, getTodayISO, kolkataTodayISO, periodLabel, periods } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const markOptions: Array<{ value: AttendanceMark; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'Leave' },
]

const markStyles: Record<AttendanceMark, string> = {
  present: 'bg-success text-white',
  absent: 'bg-danger text-white',
  leave: 'bg-warning text-white',
}

const countStyles: Record<AttendanceMark, string> = {
  present: 'bg-[#DCFCE7] text-[#15803D]',
  absent: 'bg-[#FEE2E2] text-[#B91C1C]',
  leave: 'bg-[#FEF3C7] text-[#B45309]',
}

interface StudentRowProps {
  student: SectionStudent
  mark: AttendanceMark
  disabled?: boolean
  /** Stable across renders: takes the student id, so memoized rows don't
   *  re-render when an unrelated student's mark changes. */
  onSet: (_id: string, _mark: AttendanceMark) => void
}

const StudentRow = memo(function StudentRow({ student, mark, disabled = false, onSet }: StudentRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors duration-150 hover:bg-primary-lighter/40 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={student.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{student.name}</p>
          <p className="text-xs text-ink-soft">{student.rollNo}</p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={`Attendance for ${student.name}`}
        aria-disabled={disabled}
        className={cx(
          'flex gap-1 rounded-xl border border-line bg-primary-lighter/50 p-1',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        {markOptions.map((option) => {
          const active = mark === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => {
                if (!disabled) onSet(student.id, option.value)
              }}
              className={cx(
                'h-8 rounded-lg px-3 text-xs font-bold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none',
                active ? markStyles[option.value] : 'text-ink-soft hover:bg-white',
                disabled && 'opacity-60',
              )}
            >
              <span className="hidden sm:inline">{option.label}</span>
              <span className="sm:hidden">{option.label[0]}</span>
            </button>
          )
        })}
      </div>
    </li>
  )
})

interface RosterPayload {
  sessionExists: boolean
  editable: boolean
  editableUntil: string | null
  marks: Record<string, AttendanceMark>
  students: Array<{ id: string; studentId: string; rollNo: string; name: string }>
}

export function FacultyAttendance() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const navigate = useNavigate()
  const { sections, loading: sectionsLoading, error: sectionsError, reload: reloadSections } =
    useSections()

  const [sectionId, setSectionId] = useState('')
  const [periodId, setPeriodId] = useState('')
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({})
  const [submitted, setSubmitted] = useState<SubmittedAttendance | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cutoffError, setCutoffError] = useState<string | null>(null)

  const section = sections.find((s) => s.id === sectionId)
  // Kolkata-aware recomputable date — not a stale module constant
  // Prefer getTodayISO; fallback to kolkataTodayISO for compat
  const today = useMemo(() => {
    try {
      return getTodayISO()
    } catch {
      return kolkataTodayISO()
    }
  }, [])
  // Recompute on each render for midnight rollover (cheap Intl call)
  const todayISOValue = (() => {
    try {
      return getTodayISO()
    } catch {
      return kolkataTodayISO()
    }
  })()
  // Use recomputed value so roster stays Kolkata-correct even if the tab was open overnight
  const effectiveToday = todayISOValue || today

  const rosterPath =
    sectionId && periodId
      ? `/api/attendance/roster?sectionId=${sectionId}&date=${effectiveToday}&period=${periodId}`
      : null
  const { data: rosterData, error: rosterError, loading: rosterLoading, reload: reloadRoster } =
    useApi<RosterPayload>('faculty-portal.session', rosterPath, [sectionId, periodId, effectiveToday])

  const isEditable = rosterData ? rosterData.editable !== false : true

  const roster: SectionStudent[] = useMemo(
    () =>
      (rosterData?.students ?? []).map((s) => ({
        id: s.id,
        rollNo: s.rollNo,
        name: s.name,
      })),
    [rosterData],
  )

  // Fresh roster → everyone starts as present; a saved session restores its marks
  useEffect(() => {
    const initial: Record<string, AttendanceMark> = {}
    roster.forEach((student) => {
      const saved = rosterData?.marks?.[student.id]
      initial[student.id] = saved ?? 'present'
    })
    setMarks(initial)
  }, [roster, rosterData])

  // Clear cutoff banner when switching class/period
  useEffect(() => {
    setCutoffError(null)
  }, [sectionId, periodId])

  const counts = useMemo(() => {
    const c: Record<AttendanceMark, number> = { present: 0, absent: 0, leave: 0 }
    roster.forEach((student) => {
      c[marks[student.id] ?? 'present']++
    })
    return c
  }, [roster, marks])

  const setMark = useCallback(
    (id: string, mark: AttendanceMark) => {
      if (!isEditable) return
      setMarks((prev) => ({ ...prev, [id]: mark }))
    },
    [isEditable],
  )

  const markAllPresent = () => {
    if (!isEditable) return
    const all: Record<string, AttendanceMark> = {}
    roster.forEach((student) => {
      all[student.id] = 'present'
    })
    setMarks(all)
    toast.success('All students marked present.')
  }

  const handleSubmit = async () => {
    if (!sectionId || !periodId) return
    // Recompute Kolkata date at submit time — guards against stale midnight value
    const submitDate = (() => {
      try {
        return getTodayISO()
      } catch {
        return kolkataTodayISO()
      }
    })()
    setSubmitting(true)
    setCutoffError(null)
    try {
      const result = await apiFetch<{ counts: Record<AttendanceMark, number> }>(
        '/api/attendance/mark',
        {
          method: 'POST',
          sessionKey: 'faculty-portal.session',
          body: {
            sectionId,
            date: submitDate,
            period: periodId,
            records: roster.map((student) => ({
              studentId: student.id,
              status: marks[student.id] ?? 'present',
            })),
          },
        },
      )
      setSubmitted({
        section: section?.name ?? sectionId,
        periodLabel: periodLabel(periodId),
        present: result.counts?.present ?? counts.present,
        absent: result.counts?.absent ?? counts.absent,
        leave: result.counts?.leave ?? counts.leave,
        total: roster.length,
      })
      toast.success('Attendance submitted.')
      // Keep editable for same-day corrections — reload roster in background
      reloadRoster()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const payload = err.payload as { code?: string; message?: string } | null
        if (payload?.code === 'ATTENDANCE_NOT_EDITABLE') {
          const msg = 'Attendance can be marked or edited only on the class date before midnight IST.'
          setCutoffError(msg)
          toast.danger(msg)
          return
        }
      }
      // Generic fallback preserves server's authoritative period/membership validation message
      toast.danger(err instanceof Error ? err.message : 'Could not submit attendance.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSubmitted(null)
    setCutoffError(null)
    setSectionId('')
    setPeriodId('')
  }

  const ready = sectionId && periodId

  return (
    <div className="space-y-6">
      <Header
        title={
          <span className="flex items-center gap-2.5">
            <ClipboardCheck size={26} className="text-primary" aria-hidden="true" />
            Attendance
          </span>
        }
        subtitle="Mark attendance for your classes"
        onMenuClick={openMenu}
        onToggleSidebar={toggleSidebar}
        collapsed={collapsed}
      />

      {cutoffError && !submitted ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
        >
          {cutoffError}
        </div>
      ) : null}

      {submitted ? (
        <Card className="flex flex-col items-center py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7]">
            <CheckCircle2 size={32} className="text-success" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-bold tracking-tight text-ink">Attendance Submitted!</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            {submitted.section} • {submitted.periodLabel} —{' '}
            <span className="font-semibold text-success">{submitted.present} Present</span> •{' '}
            <span className="font-semibold text-danger">{submitted.absent} Absent</span> •{' '}
            <span className="font-semibold text-warning">{submitted.leave} Leave</span> out of{' '}
            {submitted.total} students.
          </p>
          <p className="mt-2 text-xs text-ink-soft">You can edit again before midnight IST if needed.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" onClick={reset}>
              <RefreshCw size={16} aria-hidden="true" />
              Take Another Attendance
            </Button>
            <Button variant="ghost" onClick={() => navigate('/faculty/reports')}>
              Submit Daily Report →
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Selection */}
          <Card>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                <ListChecks size={18} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink">Select Class</h2>
                <p className="text-xs text-ink-soft">Pick the section and hour you are handling.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                id="attendance-section"
                label="Section"
                required
                placeholder="Select section"
                options={sections.map((s) => ({ value: s.id, label: s.name }))}
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              />
              <SelectField
                id="attendance-period"
                label="Hour / Period"
                required
                placeholder="Select hour"
                options={periods.map((p) => ({ value: p.id, label: p.label }))}
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              />
            </div>
          </Card>

          {ready ? (
            <Card className="p-0 sm:p-0">
              {/* Closed banner */}
              {rosterData && !isEditable ? (
                <div
                  role="alert"
                  className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800 sm:px-6"
                >
                  Attendance for this date is closed — it can only be edited on the class date before midnight IST.
                </div>
              ) : null}
              {/* Roster header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-ink">{section?.name ?? 'Section'}</h3>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {rosterLoading ? 'Loading roster…' : `${roster.length} students`} • {periodLabel(periodId)}
                    {rosterData?.sessionExists ? ' • already marked (editing)' : ''}
                    {rosterData && !isEditable ? ' • closed' : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {markOptions.map((option) => (
                    <span
                      key={option.value}
                      className={cx(
                        'rounded-full px-2.5 py-1 text-[11px] font-bold',
                        countStyles[option.value],
                      )}
                    >
                      {option.label} {counts[option.value]}
                    </span>
                  ))}
                </div>
              </div>

              {rosterError && !rosterData ? (
                <div className="px-5 py-6 sm:px-6">
                  <ErrorState message={rosterError} onRetry={reloadRoster} compact />
                </div>
              ) : rosterLoading && !rosterData ? (
                <PageLoader label="Fetching students" size={110} className="min-h-[260px] py-6" />
              ) : (
                <>
                  {/* Student list */}
                  <ul className="max-h-[520px] divide-y divide-line/60 overflow-y-auto scrollbar-thin">
                    {roster.map((student) => (
                      <StudentRow
                        key={student.id}
                        student={student}
                        mark={marks[student.id] ?? 'present'}
                        disabled={!isEditable}
                        onSet={setMark}
                      />
                    ))}
                  </ul>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                    <Button variant="secondary" size="sm" onClick={markAllPresent} disabled={!isEditable}>
                      <CheckCircle2 size={15} aria-hidden="true" />
                      Mark All Present
                    </Button>
                    <Button onClick={handleSubmit} loading={submitting} disabled={!isEditable}>
                      <ClipboardCheck size={16} aria-hidden="true" />
                      Submit Attendance
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ) : sectionsError && sections.length === 0 ? (
            <Card className="p-5 sm:p-6">
              <ErrorState message={sectionsError} onRetry={() => void reloadSections()} compact />
            </Card>
          ) : sectionsLoading && sections.length === 0 ? (
            <PageLoader label="Fetching sections" />
          ) : (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                <Users size={22} aria-hidden="true" />
              </span>
              <p className="text-sm text-ink-soft">
                Select a section and hour above to load the student roster.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
