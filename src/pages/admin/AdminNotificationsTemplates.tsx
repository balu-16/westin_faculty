import { useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LayoutList, Pencil, Plus, Trash2 } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SelectField, TextAreaField, TextField } from '../../components/FormFields'
import { Modal } from '../../components/Modal'
import { Skeleton } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { apiFetch, useApi } from '../../lib/api'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

type TargetType = 'all_faculty' | 'selected_faculty' | 'admins' | 'all_students' | 'selected_students'

interface TemplateItem {
  id: string
  name: string
  title: string
  message: string
  targetType: TargetType | null
  createdAt: string
  updatedAt: string
}

const TARGET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Ask every time (no default)' },
  { value: 'all_faculty', label: 'All Faculty' },
  { value: 'selected_faculty', label: 'Selected Faculty' },
  { value: 'admins', label: 'Other Admins' },
  { value: 'all_students', label: 'All Students' },
  { value: 'selected_students', label: 'Selected Students' },
]

function targetLabel(t: TargetType | null): string {
  return TARGET_OPTIONS.find((o) => o.value === t)?.label ?? 'Ask every time'
}

type FormState = { name: string; title: string; message: string; targetType: string }

const EMPTY_FORM: FormState = { name: '', title: '', message: '', targetType: '' }

export function AdminNotificationsTemplates() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()

  const { data, error, loading, reload } = useApi<TemplateItem[]>('admin-portal.session', '/api/notifications/templates')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TemplateItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<{ name?: string; title?: string; message?: string }>({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const set = (key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (t: TemplateItem) => {
    setEditing(t)
    setForm({ name: t.name, title: t.title, message: t.message, targetType: t.targetType ?? '' })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!form.name.trim()) nextErrors.name = 'Name is required.'
    else if (form.name.trim().length > 80) nextErrors.name = 'Name must be 80 characters or fewer.'
    if (!form.title.trim()) nextErrors.title = 'Title is required.'
    else if (form.title.trim().length > 120) nextErrors.title = 'Title must be 120 characters or fewer.'
    if (!form.message.trim()) nextErrors.message = 'Message is required.'
    else if (form.message.trim().length > 500) nextErrors.message = 'Message must be 500 characters or fewer.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        title: form.title.trim(),
        message: form.message.trim(),
        target_type: form.targetType || null,
      }
      if (editing) {
        await apiFetch(`/api/notifications/templates/${editing.id}`, {
          method: 'PATCH',
          sessionKey: 'admin-portal.session',
          body,
        })
        toast.success('Template updated.')
      } else {
        await apiFetch('/api/notifications/templates', {
          method: 'POST',
          sessionKey: 'admin-portal.session',
          body,
        })
        toast.success('Template created.')
      }
      setModalOpen(false)
      reload()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not save template.')
    } finally {
      setSaving(false)
    }
  }

  const askDelete = (t: TemplateItem) => {
    setDeletingId(t.id)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await apiFetch(`/api/notifications/templates/${deletingId}`, {
        method: 'DELETE',
        sessionKey: 'admin-portal.session',
      })
      toast.success('Template deleted.')
      setDeleteOpen(false)
      reload()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not delete template.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Notification Templates"
        subtitle="Predefined messages you send often — load them on the Send page instead of retyping."
        onMenuClick={openMenu}
        onToggleSidebar={toggleSidebar}
        collapsed={collapsed}
      />

      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark">
              <LayoutList size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Templates <span className="ml-1 text-xs font-normal text-ink-soft">({data?.length ?? 0})</span>
              </h2>
              <p className="text-xs text-ink-soft">Shared across all admins.</p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            New Template
          </Button>
        </div>

        {error && (data ?? []).length === 0 ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && (data ?? []).length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-soft">
            No templates yet. Create one for the messages you send frequently.
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {data!.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-1 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{t.name}</span>
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                      {targetLabel(t.targetType)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink">{t.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{t.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-primary-light hover:text-primary-dark"
                    aria-label={`Edit ${t.name}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => askDelete(t)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label={`Delete ${t.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Template' : 'New Template'}
        subtitle="Templates appear in the picker on the Send Notification page."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="template-form" loading={saving}>
              {editing ? 'Save Changes' : 'Create Template'}
            </Button>
          </>
        }
      >
        <form id="template-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField
            id="tpl-name"
            label="Template name"
            required
            placeholder="e.g. Holiday Tomorrow"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            maxLength={80}
          />
          <TextField
            id="tpl-title"
            label="Notification title"
            required
            placeholder="e.g. Holiday Tomorrow"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
            maxLength={120}
          />
          <TextAreaField
            id="tpl-message"
            label="Notification message"
            required
            placeholder="Write the message body…"
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            error={errors.message}
            maxLength={500}
            rows={4}
          />
          <p className="text-right text-xs text-ink-soft">{form.message.length}/500</p>
          <SelectField
            id="tpl-target"
            label="Default recipients"
            placeholder="Ask every time (no default)"
            options={TARGET_OPTIONS}
            value={form.targetType}
            onChange={(e) => set('targetType', e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete template?"
        subtitle="This cannot be undone. Sent notifications are not affected."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-ink">{data?.find((t) => t.id === deletingId)?.name}</span>?
        </p>
      </Modal>
    </div>
  )
}
