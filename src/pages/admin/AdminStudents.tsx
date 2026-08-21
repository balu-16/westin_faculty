import { memo, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { GraduationCap, Monitor, Pencil, Plus, Search, TriangleAlert } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Avatar } from '../../components/Avatar'
import { StatusBadge } from '../../components/StatusBadge'
import { SubTabs } from '../../components/SubTabs'
import { Modal } from '../../components/Modal'
import { SelectField, TextField } from '../../components/FormFields'
import { SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { ApiError, apiFetch, useApi } from '../../lib/api'
import {
  mapLoginLog,
  mapStudent,
  type ApiLoginLog,
  type ApiStudent,
  type Paginated,
} from '../../lib/mappers'
import { useSections } from '../../contexts/SectionsContext'
import type { LoginLog, StudentRow as DirectoryRow } from '../../types'
import { attendanceHealth, cx, healthClasses, yearToNumber } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

/** One memoized login-log row — the logs tab re-renders the table on every
 *  keystroke in the list tab's search box, so rows skip re-rendering when
 *  their `log` object is unchanged. */
const LoginLogRow = memo(function LoginLogRow({ log }: { log: LoginLog }) {
  return (
    <tr className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60">
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={log.name} />
          <span className="font-semibold text-ink">{log.name}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-ink-soft">{log.date}</td>
      <td className="whitespace-nowrap px-4 py-3.5 text-ink-soft">{log.time}</td>
      <td className="px-6 py-3.5">
        <span className="flex items-center gap-2 text-ink-soft">
          <Monitor size={14} className="text-primary" aria-hidden="true" />
          {log.device} • {log.ip}
        </span>
      </td>
    </tr>
  )
})

function LoginLogsTable({
  logs,
  emptyLabel,
}: {
  logs: LoginLog[]
  emptyLabel: string
}) {
  if (logs.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-ink-soft">{emptyLabel}</p>
  }
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
            <th scope="col" className="px-6 py-3.5 font-semibold">Student Name</th>
            <th scope="col" className="px-4 py-3.5 font-semibold">Date</th>
            <th scope="col" className="px-4 py-3.5 font-semibold">Time</th>
            <th scope="col" className="px-6 py-3.5 font-semibold">IP / Device</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <LoginLogRow key={log.id} log={log} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Memoized student table row — only re-renders when its own student record
 *  changes, not on every search keystroke or unrelated state update. */
const StudentTableRow = memo(function StudentTableRow({
  student,
  onEdit,
}: {
  student: DirectoryRow
  onEdit: (student: DirectoryRow) => void
}) {
  const health = attendanceHealth(student.attendance)
  const meta = healthClasses(health)
  return (
    <tr className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60">
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={student.name} />
          <span className="font-semibold text-ink">{student.name}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 text-ink-soft">{student.studentId}</td>
      <td className="whitespace-nowrap px-4 py-3.5">
        <span className="rounded-md bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
          {student.section}
        </span>
      </td>
      <td className="px-4 py-3.5 text-ink-soft">{student.email}</td>
      <td className="px-4 py-3.5">
        <span className={cx('text-sm font-bold', meta.text)}>{student.attendance}%</span>
        <span className="ml-2 text-[11px] font-medium text-ink-soft">{meta.label}</span>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={student.status} />
      </td>
      <td className="px-6 py-3.5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onEdit(student)}
            aria-label={`Edit ${student.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:bg-primary-light hover:text-primary-dark"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  )
})

export function AdminStudents() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const {
    sections: directorySections,
    addStudent,
    error: sectionsError,
    reload: reloadSections,
  } = useSections()

  const [tab, setTab] = useState('list')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  // Debounce the search box so the API is hit once typing settles (300 ms)
  // instead of on every keystroke; the input itself stays bound to `query`.
  const [search, setSearch] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  // Server-side filtering + paging: /api/admin/students?sectionId=&search=&page=
  const searchParams = new URLSearchParams()
  if (sectionFilter !== 'all') searchParams.set('sectionId', sectionFilter)
  if (search) searchParams.set('search', search)
  searchParams.set('page', String(page))
  const listPath = `/api/admin/students?${searchParams.toString()}`
  const { data, error, loading, reload } = useApi<Paginated<ApiStudent>>(
    'admin-portal.session',
    listPath,
    [search, sectionFilter, page],
  )
  const rows = useMemo(() => (data?.rows ?? []).map(mapStudent), [data])
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 50)))

  const {
    data: loginLogsData,
    error: logsError,
    loading: logsLoading,
    reload: reloadLogs,
  } = useApi<ApiLoginLog[]>('admin-portal.session', '/api/admin/login-logs?role=student')
  const loginLogs = useMemo(() => (loginLogsData ?? []).map(mapLoginLog), [loginLogsData])

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [year, setYear] = useState('3rd Year')
  const [department, setDepartment] = useState('')
  const [adding, setAdding] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    studentId?: string
    email?: string
    section?: string
    department?: string
  }>({})

  // Edit state
  const [editingStudent, setEditingStudent] = useState<DirectoryRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editSectionId, setEditSectionId] = useState('')
  const [editYear, setEditYear] = useState('3rd Year')
  const [editDepartment, setEditDepartment] = useState('')
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active')
  const [editErrors, setEditErrors] = useState<{
    name?: string
    email?: string
    section?: string
    department?: string
  }>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const filtered = rows

  const openAdd = () => {
    setName('')
    setStudentId('')
    setEmail('')
    setSectionId('')
    setYear('3rd Year')
    setDepartment('')
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (student: DirectoryRow) => {
    setEditingStudent(student)
    setEditName(student.name)
    setEditEmail(student.email)
    setEditSectionId(student.sectionId ?? '')
    setEditYear(student.year || '3rd Year')
    setEditDepartment(student.department ?? '')
    setEditStatus(student.status)
    setEditErrors({})
  }

  const closeEdit = () => setEditingStudent(null)

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = 'Name is required.'
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.'
    if (!sectionId) nextErrors.section = 'Select a section.'
    if (!department.trim()) nextErrors.department = 'Department is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const section = directorySections.find((s) => s.id === sectionId)
    setAdding(true)
    try {
      // Student IDs are auto-generated by the API (STU-2025-<seq>).
      await addStudent({
        name: name.trim(),
        email: email.trim(),
        sectionId,
        year,
        department: department.trim(),
      })
      toast.success(`${name.trim()} enrolled in ${section?.name ?? 'the section'}.`)
      setModalOpen(false)
      reload()
      void reloadSections()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors((prev) => ({ ...prev, email: err.message }))
      }
      toast.danger(err instanceof Error ? err.message : 'Could not enrol the student.')
    } finally {
      setAdding(false)
    }
  }

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    const nextErrors: typeof editErrors = {}
    if (!editName.trim()) nextErrors.name = 'Name is required.'
    if (!editEmail.trim()) nextErrors.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(editEmail.trim())) nextErrors.email = 'Enter a valid email address.'
    if (!editSectionId) nextErrors.section = 'Select a section.'
    if (!editDepartment.trim()) nextErrors.department = 'Department is required.'
    setEditErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSavingEdit(true)
    try {
      await apiFetch(`/api/admin/students/${editingStudent.id}`, {
        method: 'PATCH',
        sessionKey: 'admin-portal.session',
        body: {
          name: editName.trim(),
          email: editEmail.trim(),
          sectionId: editSectionId,
          year: yearToNumber(editYear),
          department: editDepartment.trim(),
          status: editStatus,
        },
      })
      toast.success(`${editName.trim()} updated successfully.`)
      setEditingStudent(null)
      reload()
      void reloadSections()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEditErrors((prev) => ({ ...prev, email: err.message }))
        toast.danger(err.message)
      } else {
        toast.danger(err instanceof Error ? err.message : 'Could not update the student.')
      }
    } finally {
      setSavingEdit(false)
    }
  }

  const isSectionChanged = editingStudent ? editSectionId !== (editingStudent.sectionId ?? '') : false

  return (
    <div className="space-y-6">
      <Header
        title="Students"
        subtitle="Enrolled students across all sections"
        onMenuClick={openMenu}
        actions={
          <Button onClick={openAdd}>
            <Plus size={16} aria-hidden="true" />
            Add Student
          </Button>
        }
      />

      <SubTabs
        tabs={[
          { id: 'list', label: 'Student List' },
          { id: 'logs', label: 'Login Logs' },
        ]}
        active={tab}
        onChange={setTab}
        aria-label="Students sections"
      />

      {tab === 'list' ? (
        <>
      {sectionsError && directorySections.length === 0 && (
        <ErrorState message={sectionsError} onRetry={() => void reloadSections()} compact />
      )}
      <Card className="p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <h3 className="text-base font-semibold text-ink">All Students</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/70"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Search students..."
                  aria-label="Search students"
                  className="h-9 w-44 rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors duration-200 focus:border-primary focus:outline-none sm:w-52"
                />
              </div>
              <label className="relative">
                <span className="sr-only">Filter by section</span>
                <select
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Filter by section"
                  className="h-9 appearance-none rounded-xl border border-line bg-white pl-3.5 pr-9 text-sm font-semibold text-ink transition-colors duration-200 focus:border-primary focus:outline-none"
                >
                  <option value="all">All Sections</option>
                  {directorySections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft"
                >
                  ▾
                </span>
              </label>
            </div>
          </div>

          {error && !data ? (
            <div className="p-5 sm:p-6">
              <ErrorState message={error} onRetry={reload} compact />
            </div>
          ) : loading && !data ? (
            <SkeletonRows rows={6} />
          ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="px-6 py-3.5 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Student ID</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Section</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Attendance %</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <StudentTableRow key={student.id} student={student} onEdit={openEdit} />
                ))}
              </tbody>
            </table>
          </div>
          )}

          {filtered.length === 0 && !loading && !error && (
            <p className="px-6 py-10 text-center text-sm text-ink-soft">
              No students match the current filters.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
            <p className="text-xs text-ink-soft sm:text-sm">
              Showing <strong className="text-ink">{filtered.length}</strong> of{' '}
              <strong className="text-ink">{total}</strong> students
            </p>
            <nav aria-label="Students pagination" className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                ‹ Prev
              </Button>
              <span className="px-1 text-sm font-medium text-ink-soft">
                Page <strong className="text-ink">{page}</strong> of{' '}
                <strong className="text-ink">{totalPages}</strong>
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                Next ›
              </Button>
            </nav>
          </div>
        </Card>
        </>
      ) : (
        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
              <GraduationCap size={18} className="text-primary" aria-hidden="true" />
              Student Login Logs
            </h3>
            <span className="text-sm font-medium text-ink-soft">{loginLogs.length} entries</span>
          </div>
          {logsError && !loginLogsData ? (
            <div className="p-5 sm:p-6">
              <ErrorState message={logsError} onRetry={reloadLogs} compact />
            </div>
          ) : logsLoading && !loginLogsData ? (
            <SkeletonRows rows={6} />
          ) : (
            <LoginLogsTable logs={loginLogs} emptyLabel="No login activity recorded yet." />
          )}
        </Card>
      )}

      {/* Add student dialog */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Student"
        subtitle="Enrol a new student into a section."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="student-form" loading={adding}>
              <Plus size={16} aria-hidden="true" />
              Add Student
            </Button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleAdd} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="student-name"
              label="Name"
              required
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
            />
            <TextField
              id="student-id"
              label="Student ID (auto-generated)"
              placeholder="e.g. STU-2026-001"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value)
                setErrors((prev) => ({ ...prev, studentId: undefined }))
              }}
              error={errors.studentId}
            />
            <TextField
              id="student-email"
              label="Email"
              required
              type="email"
              placeholder="e.g. aarav.sharma@university.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={errors.email}
            />
            <SelectField
              id="student-section"
              label="Section"
              required
              placeholder="Select section"
              options={directorySections.map((s) => ({ value: s.id, label: s.name }))}
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value)
                setErrors((prev) => ({ ...prev, section: undefined }))
              }}
              error={errors.section}
            />
            <SelectField
              id="student-year"
              label="Year"
              required
              options={[
                { value: '1st Year', label: '1st Year' },
                { value: '2nd Year', label: '2nd Year' },
                { value: '3rd Year', label: '3rd Year' },
                { value: '4th Year', label: '4th Year' },
              ]}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <TextField
              id="student-department"
              label="Department"
              required
              placeholder="e.g. CSE - AIML"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value)
                setErrors((prev) => ({ ...prev, department: undefined }))
              }}
              error={errors.department}
            />
          </div>
        </form>
      </Modal>

      {/* Edit student dialog */}
      <Modal
        open={editingStudent !== null}
        onClose={closeEdit}
        title="Edit Student"
        subtitle={editingStudent ? `Update details for ${editingStudent.name}` : undefined}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit" form="edit-student-form" loading={savingEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        {editingStudent && (
          <form id="edit-student-form" onSubmit={handleEdit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                id="edit-student-name"
                label="Name"
                required
                placeholder="e.g. Aarav Sharma"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value)
                  setEditErrors((prev) => ({ ...prev, name: undefined }))
                }}
                error={editErrors.name}
              />
              <div>
                <label htmlFor="edit-student-id" className="mb-1.5 block text-sm font-medium text-ink">
                  Student ID
                </label>
                <input
                  id="edit-student-id"
                  value={editingStudent.studentId}
                  readOnly
                  disabled
                  className="h-11 w-full rounded-xl border border-line bg-primary-lighter/40 px-4 text-sm font-semibold text-ink-soft"
                />
                <p className="mt-1 text-xs text-ink-soft">Student ID cannot be changed.</p>
              </div>
              <TextField
                id="edit-student-email"
                label="Email"
                required
                type="email"
                placeholder="e.g. aarav.sharma@university.edu"
                value={editEmail}
                onChange={(e) => {
                  setEditEmail(e.target.value)
                  setEditErrors((prev) => ({ ...prev, email: undefined }))
                }}
                error={editErrors.email}
              />
              <SelectField
                id="edit-student-section"
                label="Section"
                required
                placeholder="Select section"
                options={directorySections.map((s) => ({ value: s.id, label: s.name }))}
                value={editSectionId}
                onChange={(e) => {
                  setEditSectionId(e.target.value)
                  setEditErrors((prev) => ({ ...prev, section: undefined }))
                }}
                error={editErrors.section}
              />
              <SelectField
                id="edit-student-year"
                label="Year"
                required
                options={[
                  { value: '1st Year', label: '1st Year' },
                  { value: '2nd Year', label: '2nd Year' },
                  { value: '3rd Year', label: '3rd Year' },
                  { value: '4th Year', label: '4th Year' },
                ]}
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
              />
              <TextField
                id="edit-student-department"
                label="Department"
                required
                placeholder="e.g. CSE - AIML"
                value={editDepartment}
                onChange={(e) => {
                  setEditDepartment(e.target.value)
                  setEditErrors((prev) => ({ ...prev, department: undefined }))
                }}
                error={editErrors.department}
              />
              <SelectField
                id="edit-student-status"
                label="Status"
                required
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
              />
            </div>
            {isSectionChanged && (
              <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                <p className="text-xs font-medium leading-relaxed text-warning">
                  Changing the section will assign a new roll number for the student in the destination section.
                </p>
              </div>
            )}
          </form>
        )}
      </Modal>
    </div>
  )
}
