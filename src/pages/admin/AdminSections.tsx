import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { ChevronRight, Layers, Pencil, Plus, Trash2, TriangleAlert, Users } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { SelectField, TextField } from '../../components/FormFields'
import { SkeletonRows } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { useApi } from '../../lib/api'
import { type ApiTeacher, type Paginated } from '../../lib/mappers'
import { useSections } from '../../contexts/SectionsContext'
import type { SectionRecord } from '../../types'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const yearOptions = [
  { value: '1st Year', label: '1st Year' },
  { value: '2nd Year', label: '2nd Year' },
  { value: '3rd Year', label: '3rd Year' },
  { value: '4th Year', label: '4th Year' },
]

interface SectionFormState {
  name: string
  department: string
  year: string
  classTeacherId: string
  maxStrength: string
}

const emptyForm: SectionFormState = {
  name: '',
  department: '',
  year: '3rd Year',
  classTeacherId: '',
  maxStrength: '45',
}

const PAGE_SIZE = 10

export function AdminSections() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const navigate = useNavigate()
  const {
    sections,
    students,
    loading,
    error,
    reload: reloadSections,
    addSection,
    updateSection,
    deleteSection,
  } = useSections()
  const initialLoading = loading && sections.length === 0

  const {
    data: teachersData,
    error: teachersError,
    reload: reloadTeachers,
  } = useApi<Paginated<ApiTeacher>>('admin-portal.session', '/api/admin/teachers?pageSize=100')
  const teachers = teachersData?.rows ?? []
  const teacherOptions = teachers.map((t) => ({ value: t.id, label: t.name }))
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.name ?? '—'

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SectionRecord | null>(null)
  const [form, setForm] = useState<SectionFormState>(emptyForm)
  const [errors, setErrors] = useState<{ name?: string; department?: string }>({})
  const [deleting, setDeleting] = useState<SectionRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [page, setPage] = useState(1)
  const total = sections.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const visible = sections.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, total)
  void start
  void end

  useEffect(() => {
    setPage(1)
  }, [sections.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const studentCount = (section: SectionRecord) =>
    section.studentCount ?? students.filter((s) => s.sectionId === section.id).length

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (section: SectionRecord) => {
    setEditing(section)
    setForm({
      name: section.name,
      department: section.department,
      year: section.year,
      classTeacherId: section.classTeacherId,
      maxStrength: String(section.maxStrength),
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    const name = form.name.trim()
    if (!name) nextErrors.name = 'Section name is required.'
    else if (
      sections.some((s) => s.name.toLowerCase() === name.toLowerCase() && s.id !== editing?.id)
    )
      nextErrors.name = 'A section with this name already exists.'
    if (!form.department.trim()) nextErrors.department = 'Department is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload = {
      name,
      department: form.department.trim(),
      year: form.year,
      classTeacherId: form.classTeacherId,
      maxStrength: Number(form.maxStrength) > 0 ? Number(form.maxStrength) : 45,
    }
    setSaving(true)
    try {
      if (editing) {
        await updateSection(editing.id, payload)
        toast.success(`Section "${payload.name}" updated.`)
      } else {
        const created = await addSection(payload)
        toast.success(`Section "${created.name}" created — it now appears in the Timetable page.`)
      }
      setModalOpen(false)
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not save the section.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    const target = deleting
    setDeleteBusy(true)
    try {
      await deleteSection(target.id)
      toast.success(`Section "${target.name}" deleted.`)
      setDeleting(null)
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not delete the section.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Sections"
        subtitle="Manage class sections and student allocation"
        onMenuClick={openMenu}
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            Add Section
          </Button>
        }
      />

      <Card className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
            <Layers size={18} className="text-primary" aria-hidden="true" />
            All Sections
          </h3>
          <span className="text-sm font-medium text-ink-soft">{sections.length} sections</span>
        </div>

        {error && sections.length === 0 ? (
          <div className="p-5 sm:p-6">
            <ErrorState message={error} onRetry={() => void reloadSections()} />
          </div>
        ) : initialLoading ? (
          <SkeletonRows rows={6} />
        ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <th scope="col" className="px-6 py-3.5 font-semibold">Section</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Department</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Year</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Students</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Class Teacher</th>
                <th scope="col" className="px-6 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((section) => {
                const count = studentCount(section)
                return (
                  <tr
                    key={section.id}
                    onClick={() => navigate(`/admin/sections/${section.id}`)}
                    className="cursor-pointer border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60"
                  >
                    <td className="px-6 py-3.5">
                      <span className="rounded-md bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                        {section.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-ink-soft">{section.department}</td>
                    <td className="px-4 py-3.5 text-ink-soft">{section.year}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-ink">{count}</span>
                      <span className="text-ink-soft"> / {section.maxStrength}</span>
                    </td>
                    <td className="px-4 py-3.5 text-ink-soft">{teacherName(section.classTeacherId)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEdit(section)}
                          aria-label={`Edit ${section.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:bg-primary-light hover:text-primary-dark"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(section)}
                          aria-label={`Delete ${section.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}
        {!initialLoading && !error && sections.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-ink-soft">
            No sections yet — create the first one.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <p className="text-xs text-ink-soft sm:text-sm">
            Showing <strong className="text-ink">{visible.length}</strong> of{' '}
            <strong className="text-ink">{total}</strong> sections
          </p>
          <nav aria-label="Sections pagination" className="flex items-center gap-2">
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
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Section' : 'Add Section'}
        subtitle={editing ? `Update ${editing.name}` : 'New sections appear in the Timetable page dropdown.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="section-form" loading={saving}>
              {editing ? 'Save Changes' : 'Create Section'}
            </Button>
          </>
        }
      >
        <form id="section-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="section-name"
              label="Section Name"
              required
              placeholder="e.g. CSE-AIML 3E"
              value={form.name}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, name: e.target.value }))
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              error={errors.name}
            />
            <TextField
              id="section-department"
              label="Department"
              required
              placeholder="e.g. CSE - AIML"
              value={form.department}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, department: e.target.value }))
                setErrors((prev) => ({ ...prev, department: undefined }))
              }}
              error={errors.department}
            />
            <SelectField
              id="section-year"
              label="Year"
              required
              options={yearOptions}
              value={form.year}
              onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
            />
            <TextField
              id="section-strength"
              label="Max Strength"
              type="number"
              min={1}
              value={form.maxStrength}
              onChange={(e) => setForm((prev) => ({ ...prev, maxStrength: e.target.value }))}
            />
          </div>
          <SelectField
            id="section-teacher"
            label="Class Teacher"
            placeholder="Assign a class teacher"
            options={teacherOptions}
            value={form.classTeacherId}
            onChange={(e) => setForm((prev) => ({ ...prev, classTeacherId: e.target.value }))}
          />
          {teachersError && !teachersData && (
            <div className="mt-2">
              <ErrorState message={teachersError} onRetry={reloadTeachers} compact />
            </div>
          )}
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete Section"
        subtitle={deleting ? `Remove ${deleting.name} permanently?` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="text-danger hover:bg-danger/10 hover:text-danger"
              onClick={handleDelete}
              loading={deleteBusy}
            >
              <Trash2 size={16} aria-hidden="true" />
              Delete Section
            </Button>
          </>
        }
      >
        {deleting && studentCount(deleting) > 0 ? (
          <div className="flex items-start gap-3 rounded-xl bg-danger/10 px-4 py-3.5">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            <p className="text-sm font-medium text-danger">
              {studentCount(deleting)} student{studentCount(deleting) > 1 ? 's are' : ' is'} still
              assigned to {deleting.name}. Move them to other sections first — deleting is blocked
              until the section is empty.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            This section is empty and safe to delete. Its slots (if any) remain in the timetable
            until edited there.
          </p>
        )}
      </Modal>

      <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pb-2 text-center text-xs text-ink-soft/70">
        <Users size={12} aria-hidden="true" />
        Click a section to view and manage its students
        <ChevronRight size={12} aria-hidden="true" />
        <Link to="/admin/timetable" className="font-semibold text-primary-dark hover:text-primary">
          Or manage schedules in Timetable
        </Link>
      </p>
    </div>
  )
}
