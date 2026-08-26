import { memo, useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Filter, Monitor, Pencil, Plus, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Avatar } from '../../components/Avatar'
import { StatusBadge } from '../../components/StatusBadge'
import { SubTabs } from '../../components/SubTabs'
import { Modal } from '../../components/Modal'
import { SelectField, TextField } from '../../components/FormFields'
import { PageLoader, SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { ApiError, apiFetch, useApi } from '../../lib/api'
import {
  mapLoginLog,
  mapTeacher,
  type ApiLoginLog,
  type ApiSubject,
  type ApiTeacher,
  type Paginated,
} from '../../lib/mappers'
import type { LoginLog, TeacherRow } from '../../types'
import { cx } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

/** One memoized login-log row — skips re-rendering while typing in the list
 *  tab's search box. */
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
            <th scope="col" className="px-6 py-3.5 font-semibold">Faculty Name</th>
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

/** Memoized faculty table row — re-renders only when its own record changes,
 *  not on every keystroke of the (client-side) search filter. */
const TeacherTableRow = memo(function TeacherTableRow({
  teacher,
  onEdit,
}: {
  teacher: TeacherRow
  onEdit: (teacher: TeacherRow) => void
}) {
  return (
    <tr className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60">
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={teacher.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{teacher.name}</p>
            <p className="truncate text-xs text-ink-soft">{teacher.designation}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-ink-soft">{teacher.department}</td>
      <td className="px-4 py-3.5 text-ink-soft">{teacher.email}</td>
      <td className="px-4 py-3.5">
        <div className="flex max-w-[260px] flex-wrap gap-1.5">
          {teacher.subjects.map((subject) => (
            <span
              key={subject}
              className="rounded-md bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark"
            >
              {subject}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-3.5">
        <StatusBadge status={teacher.status} />
      </td>
      <td className="px-6 py-3.5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onEdit(teacher)}
            aria-label={`Edit ${teacher.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:bg-primary-light hover:text-primary-dark"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  )
})

export function AdminTeachers() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()

  const [page, setPage] = useState(1)
  const { data: teachersData, loading, error, reload } = useApi<Paginated<ApiTeacher>>(
    'admin-portal.session',
    `/api/admin/teachers?page=${page}&pageSize=10`,
    [page],
  )
  const {
    data: loginLogsData,
    error: logsError,
    loading: logsLoading,
    reload: reloadLogs,
  } = useApi<ApiLoginLog[]>('admin-portal.session', '/api/admin/login-logs?role=teacher')
  const {
    data: subjectsData,
    error: subjectsError,
    reload: reloadSubjects,
  } = useApi<ApiSubject[]>('admin-portal.session', '/api/subjects')
  const subjects = subjectsData ?? []
  const rows = useMemo(() => (teachersData?.rows ?? []).map(mapTeacher), [teachersData])
  const loginLogs = useMemo(() => (loginLogsData ?? []).map(mapLoginLog), [loginLogsData])
  const total = teachersData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / (teachersData?.pageSize ?? 10)))

  const [tab, setTab] = useState('list')
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [designationFilter, setDesignationFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [phone, setPhone] = useState('')
  const [subjectIds, setSubjectIds] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    department?: string
    designation?: string
    subjects?: string
  }>({})

  // Edit state
  const [editingTeacher, setEditingTeacher] = useState<TeacherRow | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editDepartment, setEditDepartment] = useState('')
  const [editDesignation, setEditDesignation] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editSubjectIds, setEditSubjectIds] = useState<string[]>([])
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active')
  const [editErrors, setEditErrors] = useState<{
    name?: string
    email?: string
    department?: string
    designation?: string
    subjects?: string
  }>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const departmentOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.department).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [rows])

  const hasActiveTeacherFilters = departmentFilter !== 'all' || statusFilter !== 'all' || designationFilter !== 'all' || query.trim() !== ''

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((t) => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.department.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
      const matchesDept = departmentFilter === 'all' || t.department === departmentFilter
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter
      const matchesDesig = designationFilter === 'all' || t.designation === designationFilter
      return matchesSearch && matchesDept && matchesStatus && matchesDesig
    })
  }, [rows, query, departmentFilter, statusFilter, designationFilter])

  const clearTeacherFilters = () => {
    setQuery('')
    setDepartmentFilter('all')
    setStatusFilter('all')
    setDesignationFilter('all')
  }

  const openAdd = () => {
    setName('')
    setEmail('')
    setDepartment('')
    setDesignation('')
    setPhone('')
    setSubjectIds([])
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (teacher: TeacherRow) => {
    setEditingTeacher(teacher)
    setEditName(teacher.name)
    setEditEmail(teacher.email)
    setEditDepartment(teacher.department === '—' ? '' : teacher.department)
    setEditDesignation(teacher.designation === '—' ? '' : teacher.designation)
    setEditPhone(teacher.phone === '—' ? '' : teacher.phone)
    setEditStatus(teacher.status)
    // Map subject codes to ids using the subjects directory
    const ids = subjects
      .filter((s) => teacher.subjects.includes(s.code))
      .map((s) => s.id)
    setEditSubjectIds(ids)
    setEditErrors({})
  }

  const closeEdit = () => setEditingTeacher(null)

  const toggleSubject = (id: string) => {
    setSubjectIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    setErrors((prev) => ({ ...prev, subjects: undefined }))
  }

  const toggleEditSubject = (id: string) => {
    setEditSubjectIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    setEditErrors((prev) => ({ ...prev, subjects: undefined }))
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!name.trim()) nextErrors.name = 'Name is required.'
    if (!email.trim()) nextErrors.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.'
    if (!department.trim()) nextErrors.department = 'Department is required.'
    if (!designation.trim()) nextErrors.designation = 'Designation is required.'
    if (subjectIds.length === 0) nextErrors.subjects = 'Assign at least one subject.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const displayName = name.trim().startsWith('Dr.') || name.trim().startsWith('Prof.')
      ? name.trim()
      : `Dr. ${name.trim()}`
    setAdding(true)
    try {
      await apiFetch('/api/admin/teachers', {
        method: 'POST',
        sessionKey: 'admin-portal.session',
        body: {
          name: displayName,
          email: email.trim(),
          designation: designation.trim(),
          department: department.trim(),
          phone: phone.trim() || undefined,
          subjects: subjectIds,
        },
      })
      toast.success(`${displayName} added to the faculty directory.`)
      setModalOpen(false)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors((prev) => ({ ...prev, email: err.message }))
      }
      toast.danger(err instanceof Error ? err.message : 'Could not add the faculty member.')
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingTeacher) return
    const nextErrors: typeof editErrors = {}
    if (!editName.trim()) nextErrors.name = 'Name is required.'
    if (!editEmail.trim()) nextErrors.email = 'Email is required.'
    else if (!/^\S+@\S+\.\S+$/.test(editEmail.trim())) nextErrors.email = 'Enter a valid email address.'
    if (!editDepartment.trim()) nextErrors.department = 'Department is required.'
    if (!editDesignation.trim()) nextErrors.designation = 'Designation is required.'
    if (editSubjectIds.length === 0) nextErrors.subjects = 'Assign at least one subject.'
    setEditErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSavingEdit(true)
    try {
      await apiFetch(`/api/admin/teachers/${editingTeacher.id}`, {
        method: 'PATCH',
        sessionKey: 'admin-portal.session',
        body: {
          name: editName.trim(),
          email: editEmail.trim(),
          department: editDepartment.trim(),
          designation: editDesignation.trim(),
          phone: editPhone.trim() || undefined,
          subjects: editSubjectIds,
          status: editStatus,
        },
      })
      toast.success(`${editName.trim()} updated successfully.`)
      setEditingTeacher(null)
      reload()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setEditErrors((prev) => ({ ...prev, email: err.message }))
        toast.danger(err.message)
      } else {
        toast.danger(err instanceof Error ? err.message : 'Could not update the faculty member.')
      }
    } finally {
      setSavingEdit(false)
    }
  }

  // Resolve facultyId for the editing teacher (read-only display)
  const editingFacultyId = useMemo(() => {
    if (!editingTeacher) return ''
    const raw = teachersData?.rows.find((r) => r.id === editingTeacher.id) as ApiTeacher | undefined
    return raw?.facultyId ?? ''
  }, [editingTeacher, teachersData])

  return (
    <div className="space-y-6">
      <Header
        title="Teachers"
        subtitle="Faculty directory and login activity"
        onMenuClick={openMenu}
        actions={
          <Button onClick={openAdd}>
            <Plus size={16} aria-hidden="true" />
            Add Faculty
          </Button>
        }
      />

      <SubTabs
        tabs={[
          { id: 'list', label: 'Faculty List' },
          { id: 'logs', label: 'Login Logs' },
        ]}
        active={tab}
        onChange={setTab}
        aria-label="Teachers sections"
      />

      {tab === 'list' ? (
        <Card className="p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <h3 className="text-base font-semibold text-ink">All Faculty</h3>
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search faculty..."
                  aria-label="Search faculty"
                  className="h-9 w-48 rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors duration-200 focus:border-primary focus:outline-none sm:w-56"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                aria-label="Toggle filters"
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors',
                  showFilters || hasActiveTeacherFilters ? 'border-primary bg-primary text-white shadow-sm' : 'border-line bg-white text-ink-soft hover:border-primary/40 hover:text-primary',
                )}
              >
                <SlidersHorizontal size={14} aria-hidden="true" />
                Filters
                {hasActiveTeacherFilters && (
                  <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-bold">
                    {[departmentFilter !== 'all', statusFilter !== 'all', designationFilter !== 'all'].filter(Boolean).length + (query.trim() ? 1 : 0)}
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
                <span className="text-xs font-medium text-ink-soft">Dept</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-8 rounded-lg border border-line bg-white px-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {departmentOptions
                    .filter((d) => d !== 'all')
                    .map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <span className="text-xs font-medium text-ink-soft">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 rounded-lg border border-line bg-white px-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <span className="text-xs font-medium text-ink-soft">Role</span>
                <select
                  value={designationFilter}
                  onChange={(e) => setDesignationFilter(e.target.value)}
                  className="h-8 rounded-lg border border-line bg-white px-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                >
                  <option value="all">All Designations</option>
                  <option value="Professor">Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Lecturer">Lecturer</option>
                </select>
              </label>
              {hasActiveTeacherFilters && (
                <button
                  type="button"
                  onClick={clearTeacherFilters}
                  className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-sm transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <X size={12} aria-hidden="true" />
                  Clear all
                </button>
              )}
            </div>
          )}
          {hasActiveTeacherFilters && !showFilters && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-primary-lighter/30 px-5 py-2 sm:px-6">
              <span className="text-xs font-medium text-ink-soft">Active filters:</span>
              {query.trim() && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  Search: “{query.trim()}” <button type="button" onClick={() => setQuery('')} className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={10} /></button>
                </span>
              )}
              {departmentFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  {departmentFilter} <button type="button" onClick={() => setDepartmentFilter('all')} className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={10} /></button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  {statusFilter} <button type="button" onClick={() => setStatusFilter('all')} className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={10} /></button>
                </span>
              )}
              {designationFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  {designationFilter} <button type="button" onClick={() => setDesignationFilter('all')} className="ml-1 rounded-full p-0.5 hover:bg-white/20"><X size={10} /></button>
                </span>
              )}
              <button type="button" onClick={clearTeacherFilters} className="ml-auto text-xs font-semibold text-primary-dark hover:text-primary">
                Clear all
              </button>
            </div>
          )}

          {error && !teachersData ? (
            <div className="p-5 sm:p-6">
              <ErrorState message={error} onRetry={reload} compact />
            </div>
          ) : loading && !teachersData ? (
            <PageLoader label="Fetching teachers" />
          ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                  <th scope="col" className="px-6 py-3.5 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Department</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Subjects Assigned</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher) => (
                  <TeacherTableRow key={teacher.id} teacher={teacher} onEdit={openEdit} />
                ))}
              </tbody>
            </table>
          </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <p className="text-sm text-ink-soft">
                {hasActiveTeacherFilters ? 'No faculty match the current filters.' : `No faculty found for “${query}”.`}
              </p>
              {hasActiveTeacherFilters && (
                <button
                  type="button"
                  onClick={clearTeacherFilters}
                  className="rounded-full bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary-dark hover:bg-primary hover:text-white"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
            <p className="text-xs text-ink-soft sm:text-sm">
              Showing <strong className="text-ink">{filtered.length}</strong> of{' '}
              <strong className="text-ink">{total}</strong> faculty
            </p>
            <nav aria-label="Faculty pagination" className="flex items-center gap-2">
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
      ) : (
        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
              <Users size={18} className="text-primary" aria-hidden="true" />
              Faculty Login Logs
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

      {/* Add faculty dialog */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Faculty"
        subtitle="Create a directory entry for a new faculty member."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="teacher-form" loading={adding}>
              <Plus size={16} aria-hidden="true" />
              Add Faculty
            </Button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={handleAdd} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="teacher-name"
              label="Name"
              required
              placeholder="e.g. Dr. Priya Sharma"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
            />
            <TextField
              id="teacher-email"
              label="Email"
              required
              type="email"
              placeholder="e.g. priya.sharma@westin.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              error={errors.email}
            />
            <TextField
              id="teacher-department"
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
            <SelectField
              id="teacher-designation"
              label="Designation"
              required
              placeholder="Select designation"
              options={[
                { value: 'Professor', label: 'Professor' },
                { value: 'Associate Professor', label: 'Associate Professor' },
                { value: 'Assistant Professor', label: 'Assistant Professor' },
                { value: 'Lecturer', label: 'Lecturer' },
              ]}
              value={designation}
              onChange={(e) => {
                setDesignation(e.target.value)
                setErrors((prev) => ({ ...prev, designation: undefined }))
              }}
              error={errors.designation}
            />
            <TextField
              id="teacher-phone"
              label="Phone"
              type="tel"
              placeholder="e.g. +91 98450 11209"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="sm:col-span-2"
            />
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-ink">
              Subjects
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => {
                const selected = subjectIds.includes(subject.id)
                return (
                  <button
                    key={subject.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSubject(subject.id)}
                    className={
                      selected
                        ? 'rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150'
                        : 'rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors duration-150 hover:border-primary/40 hover:text-primary-dark'
                    }
                  >
                    {subject.code}
                  </button>
                )
              })}
            </div>
            {subjectsError && !subjectsData && (
              <div className="mt-2">
                <ErrorState message={subjectsError} onRetry={reloadSubjects} compact />
              </div>
            )}
            {errors.subjects && (
              <p role="alert" className="mt-1 text-xs font-medium text-danger">
                {errors.subjects}
              </p>
            )}
          </fieldset>
        </form>
      </Modal>

      {/* Edit faculty dialog */}
      <Modal
        open={editingTeacher !== null}
        onClose={closeEdit}
        title="Edit Faculty"
        subtitle={editingTeacher ? `Update details for ${editingTeacher.name}` : undefined}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={closeEdit}>
              Cancel
            </Button>
            <Button type="submit" form="edit-teacher-form" loading={savingEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        {editingTeacher && (
          <form id="edit-teacher-form" onSubmit={handleUpdate} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-teacher-facultyId" className="mb-1.5 block text-sm font-medium text-ink">
                  Faculty ID
                </label>
                <input
                  id="edit-teacher-facultyId"
                  value={editingFacultyId || '—'}
                  readOnly
                  disabled
                  className="h-11 w-full rounded-xl border border-line bg-primary-lighter/40 px-4 text-sm font-semibold text-ink-soft"
                />
                <p className="mt-1 text-xs text-ink-soft">Faculty ID cannot be changed.</p>
              </div>
              <TextField
                id="edit-teacher-name"
                label="Name"
                required
                placeholder="e.g. Dr. Priya Sharma"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value)
                  setEditErrors((prev) => ({ ...prev, name: undefined }))
                }}
                error={editErrors.name}
              />
              <TextField
                id="edit-teacher-email"
                label="Email"
                required
                type="email"
                placeholder="e.g. priya.sharma@westin.edu"
                value={editEmail}
                onChange={(e) => {
                  setEditEmail(e.target.value)
                  setEditErrors((prev) => ({ ...prev, email: undefined }))
                }}
                error={editErrors.email}
              />
              <TextField
                id="edit-teacher-department"
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
                id="edit-teacher-designation"
                label="Designation"
                required
                placeholder="Select designation"
                options={[
                  { value: 'Professor', label: 'Professor' },
                  { value: 'Associate Professor', label: 'Associate Professor' },
                  { value: 'Assistant Professor', label: 'Assistant Professor' },
                  { value: 'Lecturer', label: 'Lecturer' },
                ]}
                value={editDesignation}
                onChange={(e) => {
                  setEditDesignation(e.target.value)
                  setEditErrors((prev) => ({ ...prev, designation: undefined }))
                }}
                error={editErrors.designation}
              />
              <SelectField
                id="edit-teacher-status"
                label="Status"
                required
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
              />
              <TextField
                id="edit-teacher-phone"
                label="Phone"
                type="tel"
                placeholder="e.g. +91 98450 11209"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="sm:col-span-2"
              />
            </div>

            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-ink">
                Subjects
                <span className="ml-0.5 text-danger" aria-hidden="true">
                  *
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => {
                  const selected = editSubjectIds.includes(subject.id)
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleEditSubject(subject.id)}
                      className={
                        selected
                          ? 'rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150'
                          : 'rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors duration-150 hover:border-primary/40 hover:text-primary-dark'
                      }
                    >
                      {subject.code}
                    </button>
                  )
                })}
              </div>
              {subjectsError && !subjectsData && (
                <div className="mt-2">
                  <ErrorState message={subjectsError} onRetry={reloadSubjects} compact />
                </div>
              )}
              {editErrors.subjects && (
                <p role="alert" className="mt-1 text-xs font-medium text-danger">
                  {editErrors.subjects}
                </p>
              )}
            </fieldset>
          </form>
        )}
      </Modal>
    </div>
  )
}
