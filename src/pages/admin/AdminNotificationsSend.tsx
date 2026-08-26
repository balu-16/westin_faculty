import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Bell, CheckCircle2, Search, Send, Users } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SelectField, TextAreaField, TextField } from '../../components/FormFields'
import { PageLoader } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { ApiError, apiFetch, useApi } from '../../lib/api'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

type TargetType = 'all_faculty' | 'selected_faculty' | 'admins' | 'all_students' | 'selected_students'

interface FacultyListItem {
  id: string
  name: string
  department: string
}

interface StudentListItem {
  id: string
  name: string
  studentId: string
  department: string
  year: string
}

interface TemplateItem {
  id: string
  name: string
  title: string
  message: string
  targetType: TargetType | null
}

/** Uniform row for the recipient checklist (faculty or students). */
interface DirectoryRow {
  id: string
  name: string
  sub: string
}

export function AdminNotificationsSend() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const navigate = useNavigate()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetType, setTargetType] = useState<TargetType>('all_faculty')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; message?: string; recipients?: string }>({})

  const { data: templates } = useApi<TemplateItem[]>('admin-portal.session', '/api/notifications/templates')
  const [templateId, setTemplateId] = useState('')

  const applyTemplate = (id: string) => {
    setTemplateId(id)
    const tpl = templates?.find((t) => t.id === id)
    if (!tpl) return
    setTitle(tpl.title)
    setMessage(tpl.message)
    if (tpl.targetType) setTargetType(tpl.targetType)
    setErrors({})
  }

  const { data: facultyList, error: facultyError, loading: facultyLoading, reload: reloadFaculty } =
    useApi<FacultyListItem[]>('admin-portal.session', targetType === 'selected_faculty' ? '/api/faculty/list' : null)

  const { data: studentList, error: studentError, loading: studentLoading, reload: reloadStudents } =
    useApi<StudentListItem[]>('admin-portal.session', targetType === 'selected_students' ? '/api/students/list' : null)

  const listError = targetType === 'selected_faculty' ? facultyError : targetType === 'selected_students' ? studentError : undefined
  const listLoading = targetType === 'selected_faculty' ? facultyLoading : targetType === 'selected_students' ? studentLoading : false
  const reloadList = targetType === 'selected_faculty' ? reloadFaculty : reloadStudents

  const directory = useMemo<DirectoryRow[]>(() => {
    if (targetType === 'selected_faculty') {
      return (facultyList ?? []).map((f) => ({ id: f.id, name: f.name, sub: f.department }))
    }
    if (targetType === 'selected_students') {
      return (studentList ?? []).map((s) => ({ id: s.id, name: s.name, sub: `${s.studentId} • ${s.department} • ${s.year}` }))
    }
    return []
  }, [targetType, facultyList, studentList])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return directory
    return directory.filter((r) => r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q))
  }, [directory, search])

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setErrors((p) => ({ ...p, recipients: undefined }))
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id))
  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const r of filtered) next.delete(r.id)
      } else {
        for (const r of filtered) next.add(r.id)
      }
      return next
    })
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!title.trim()) nextErrors.title = 'Title is required.'
    else if (title.trim().length > 120) nextErrors.title = 'Title must be 120 characters or fewer.'
    if (!message.trim()) nextErrors.message = 'Message is required.'
    else if (message.trim().length > 500) nextErrors.message = 'Message must be 500 characters or fewer.'
    if (
      (targetType === 'selected_faculty' || targetType === 'selected_students') &&
      selectedIds.size === 0
    )
      nextErrors.recipients = 'Select at least one recipient.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSending(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
        target_type: targetType,
      }
      if (targetType === 'selected_faculty') body.faculty_ids = [...selectedIds]
      if (targetType === 'selected_students') body.student_ids = [...selectedIds]
      const res = (await apiFetch('/api/notifications/send', {
        method: 'POST',
        sessionKey: 'admin-portal.session',
        body,
      })) as { recipientCount: number; messageTitle: string }
      toast.success(`Notification sent to ${res.recipientCount} recipient${res.recipientCount === 1 ? '' : 's'}.`)
      navigate('/admin/notifications/history')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not send notification.'
      if (err instanceof ApiError && /No (other active )?admins/i.test(msg)) {
        setErrors((p) => ({ ...p, recipients: msg }))
        toast.danger(msg)
      } else {
        toast.danger(msg)
        if (/Title/i.test(msg)) setErrors((p) => ({ ...p, title: msg }))
        else if (/Message/i.test(msg)) setErrors((p) => ({ ...p, message: msg }))
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Send Notification"
        subtitle="Push a notification to faculty or other admins. Every send is permanently recorded."
        onMenuClick={openMenu}
        onToggleSidebar={toggleSidebar}
        collapsed={collapsed}
      />

      <Card>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <Bell size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Compose Notification</h2>
            <p className="text-xs text-ink-soft">Delivered via browser push (OneSignal) to subscribed recipients.</p>
          </div>
        </div>

        <form onSubmit={handleSend} noValidate className="space-y-5">
          <div>
            <SelectField
              id="notif-template"
              label="Load template"
              options={[
                { value: '', label: 'Start from scratch (no template)' },
                ...(templates ?? []).map((t) => ({ value: t.id, label: t.name })),
              ]}
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              Fills the fields below — you can still edit before sending. Manage templates on the Notification
              Templates page.
            </p>
          </div>
          <TextField
            id="notif-title"
            label="Title"
            required
            placeholder="e.g. Staff meeting tomorrow"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setErrors((p) => ({ ...p, title: undefined }))
            }}
            error={errors.title}
            maxLength={120}
          />
          <TextAreaField
            id="notif-message"
            label="Message"
            required
            placeholder="Write the notification body…"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setErrors((p) => ({ ...p, message: undefined }))
            }}
            error={errors.message}
            maxLength={500}
            rows={4}
          />
          <p className="text-right text-xs text-ink-soft">{message.length}/500</p>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-ink">
              Recipient type <span className="ml-0.5 text-danger">*</span>
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  { value: 'all_faculty', label: 'All Faculty', hint: 'Every active faculty member' },
                  { value: 'selected_faculty', label: 'Selected Faculty', hint: 'Pick specific people' },
                  { value: 'admins', label: 'Other Admins', hint: 'All other admins (excl. you)' },
                  { value: 'all_students', label: 'All Students', hint: 'Every active student' },
                  { value: 'selected_students', label: 'Selected Students', hint: 'Pick specific students' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3.5 transition-colors ${
                    targetType === opt.value ? 'border-primary bg-primary-lighter' : 'border-line bg-white hover:border-primary/30'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="target_type"
                      value={opt.value}
                      checked={targetType === opt.value}
                      onChange={() => {
                        setTargetType(opt.value)
                        setErrors((p) => ({ ...p, recipients: undefined }))
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-semibold text-ink">{opt.label}</span>
                  </span>
                  <span className="pl-6 text-xs text-ink-soft">{opt.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {(targetType === 'selected_faculty' || targetType === 'selected_students') && (
            <div className="rounded-xl border border-line bg-primary-lighter/30 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Users size={16} className="text-primary" aria-hidden="true" />
                  {targetType === 'selected_faculty' ? 'Choose Faculty' : 'Choose Students'}
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{selectedIds.size} selected</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={toggleAllFiltered} className="text-xs font-semibold text-primary-dark hover:text-primary">
                    {allFilteredSelected ? 'Deselect filtered' : 'Select filtered'}
                  </button>
                  <span className="text-xs text-ink-soft">• {filtered.length} shown</span>
                </div>
              </div>
              <div className="relative mb-3">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/70" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={targetType === 'selected_faculty' ? 'Search by name or department…' : 'Search by name, ID, department or year…'}
                  className="h-9 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-primary focus:outline-none"
                />
              </div>
              {listError && directory.length === 0 ? (
                <ErrorState message={listError} onRetry={reloadList} compact />
              ) : listLoading && directory.length === 0 ? (
                <PageLoader label="Fetching recipients" size={96} className="min-h-[220px] py-4" />
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-line bg-white scrollbar-thin">
                  {filtered.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-ink-soft">
                      No matches for &quot;{search}&quot;.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line/60">
                      {filtered.map((r) => {
                        const checked = selectedIds.has(r.id)
                        return (
                          <li key={r.id}>
                            <label className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors ${checked ? 'bg-primary-lighter/70' : 'hover:bg-primary-lighter/40'}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleId(r.id)} className="h-4 w-4 rounded accent-primary" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                                <span className="block truncate text-xs text-ink-soft">{r.sub}</span>
                              </span>
                              {checked && <CheckCircle2 size={18} className="shrink-0 text-primary" aria-hidden="true" />}
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}
              {errors.recipients && (
                <p role="alert" className="mt-2 text-xs font-medium text-danger">
                  {errors.recipients}
                </p>
              )}
              <p className="mt-2 text-xs text-ink-soft">All selections are resolved server-side — tampered IDs are rejected.</p>
            </div>
          )}

          {targetType === 'all_students' && (
            <div className="rounded-xl border border-line bg-primary-lighter/40 px-4 py-3 text-sm text-ink">
              <p className="font-medium">All Students</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Sends to every active student subscribed on the student portal (https://westin-student.vercel.app). Students who
                haven&apos;t enabled notifications there yet are skipped automatically — nothing fails.
              </p>
              {errors.recipients && (
                <p role="alert" className="mt-2 text-xs font-medium text-danger">
                  {errors.recipients}
                </p>
              )}
            </div>
          )}

          {targetType === 'admins' && (
            <div className="rounded-xl border border-line bg-amber-50 px-4 py-3 text-sm text-ink">
              <p className="font-medium">Other Admins</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Sends to every other active admin (each admin can opt out in their settings). Only admins subscribed on this portal
                receive the push.
              </p>
              {errors.recipients && (
                <p role="alert" className="mt-2 text-xs font-medium text-danger">
                  {errors.recipients}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button type="submit" loading={sending}>
              <Send size={16} aria-hidden="true" />
              Send Notification
            </Button>
            <span className="text-xs text-ink-soft">
              Faculty/admins receive from westin-faculty.vercel.app • students from westin-student.vercel.app
            </span>
          </div>
        </form>
      </Card>
    </div>
  )
}
