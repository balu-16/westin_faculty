import { useMemo, useState, type FormEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Megaphone,
  Music,
  PartyPopper,
  Pencil,
  Plus,
  Presentation,
  Sparkles,
  Trash2,
  Trophy,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card, SectionCard } from '../../components/Card'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { SelectField, TextAreaField, TextField } from '../../components/FormFields'
import { Skeleton, SkeletonRows, Spinner } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { apiFetch, useApi, type SessionKey } from '../../lib/api'
import { mapEvent, type ApiEvent } from '../../lib/mappers'
import type { EventCategory, PortalEvent } from '../../types'
import { cx, displayDate, todayISO } from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

const categoryIcons: Record<string, LucideIcon> = {
  music: Music,
  presentation: Presentation,
  trophy: Trophy,
  wrench: Wrench,
  sparkles: Sparkles,
}

/** Sidebar/tile icon per event category (API categories are uppercase). */
const CATEGORY_ICON: Record<string, string> = {
  CULTURAL: 'music',
  'TECH TALK': 'presentation',
  SPORTS: 'trophy',
  WORKSHOP: 'wrench',
  SEMINAR: 'presentation',
}

const categoryIconFor = (category: string): LucideIcon =>
  categoryIcons[CATEGORY_ICON[category] ?? 'sparkles'] ?? Sparkles

const categoryOptions: Array<{ value: EventCategory; label: string }> = [
  { value: 'CULTURAL', label: 'Cultural' },
  { value: 'TECH TALK', label: 'Tech Talk' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SEMINAR', label: 'Seminar' },
]

const prettyCategory = (category: string) => {
  const option = categoryOptions.find((o) => o.value === category)
  return option?.label ?? category
}

function eventDayParts(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`)
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-GB', { month: 'short' }),
    year: d.getFullYear(),
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short' }),
  }
}

function fullDateLabel(dateISO: string) {
  return displayDate(dateISO)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** The API stores creator user ids — hide those from the "by …" line. */
const looksLikeUuid = (value: string) => UUID_RE.test(value)

interface EventFormState {
  title: string
  category: EventCategory | ''
  date: string
  endDate: string
  time: string
  location: string
  description: string
}

const emptyForm: EventFormState = {
  title: '',
  category: '',
  date: '',
  endDate: '',
  time: '',
  location: '',
  description: '',
}

interface FormErrors {
  title?: string
  category?: string
  date?: string
  time?: string
  location?: string
  description?: string
}

function FeaturedBanner({ event, onEdit }: { event: PortalEvent; onEdit: (_event: PortalEvent) => void }) {
  return (
    <div className="relative overflow-hidden rounded-[20px] shadow-card">
      {/* Dark concert-style backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,167,242,0.5),transparent_55%),radial-gradient(circle_at_80%_75%,rgba(239,68,68,0.45),transparent_50%),linear-gradient(135deg,#111A33_0%,#1B2A52_55%,#0D142B_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3B6B] px-3 py-1 text-xs font-bold tracking-wide text-white shadow-[0_4px_12px_rgba(255,59,107,0.45)]">
            {event.isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                LIVE NOW
              </>
            ) : (
              'UPCOMING'
            )}
          </span>
          <PartyPopper size={22} className="text-white/60" aria-hidden="true" />
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#7EC3F3]">
          {event.category}
        </p>
        <h2 className="mt-1.5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {event.title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">{event.description}</p>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
          <span className="flex items-center gap-2">
            <CalendarDays size={15} className="text-[#7EC3F3]" aria-hidden="true" />
            {event.endDateISO
              ? `${event.fullDate} - ${fullDateLabel(event.endDateISO)}`
              : event.fullDate}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={15} className="text-[#7EC3F3]" aria-hidden="true" />
            {event.time}
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={15} className="text-[#7EC3F3]" aria-hidden="true" />
            {event.location}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={() => onEdit(event)}>Edit Event</Button>
          {!looksLikeUuid(event.createdBy) && event.createdBy && (
            <span className="text-xs font-medium text-white/60">Created by {event.createdBy}</span>
          )}
        </div>
      </div>
    </div>
  )
}

interface EventRowProps {
  event: PortalEvent
  showCreator: boolean
  /** Row-level delete in flight — spinner + disabled icon button. */
  deleting?: boolean
  onEdit: (_event: PortalEvent) => void
  onDelete: (_event: PortalEvent) => void
}

function EventRow({ event, showCreator, deleting = false, onEdit, onDelete }: EventRowProps) {
  const parts = eventDayParts(event.dateISO)
  const Icon = categoryIconFor(event.category)
  return (
    <li className="flex gap-4 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
      {/* Thumbnail */}
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white sm:h-[72px] sm:w-[72px]"
        style={{ background: `linear-gradient(135deg, ${event.accent}, ${event.accent}B3)` }}
        aria-hidden="true"
      >
        <Icon size={26} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide"
            style={{ backgroundColor: `${event.accent}1A`, color: event.accent }}
          >
            {event.category}
          </span>
          {event.isLive && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#FF3B6B]/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#FF3B6B]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF3B6B]" aria-hidden="true" />
              LIVE
            </span>
          )}
        </div>
        <h4 className="mt-1.5 truncate font-semibold text-ink">{event.title}</h4>
        <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{event.description}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={13} className="text-primary" aria-hidden="true" />
            {event.endDateISO
              ? `${event.fullDate} – ${fullDateLabel(event.endDateISO)}`
              : event.fullDate}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={13} className="text-primary" aria-hidden="true" />
            {event.time}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-primary" aria-hidden="true" />
            {event.location}
          </span>
          {showCreator && !looksLikeUuid(event.createdBy) && event.createdBy && (
            <span className="text-ink-soft/70">by {event.createdBy}</span>
          )}
        </div>
      </div>

      {/* Date box + row actions */}
      <div className="flex w-[72px] shrink-0 flex-col items-center gap-2">
        <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-line bg-primary-lighter py-2">
          <span className="text-xl font-bold leading-none text-ink">{parts.day}</span>
          <span className="mt-1 text-[11px] font-semibold leading-none text-primary-dark">
            {parts.month} '{String(parts.year).slice(2)}
          </span>
          <span className="mt-1 text-[10px] leading-none text-ink-soft">{parts.weekday}</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(event)}
            aria-label={`Edit ${event.title}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:bg-primary-light hover:text-primary-dark"
          >
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(event)}
            aria-label={`Delete ${event.title}`}
            disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:pointer-events-none disabled:opacity-60"
          >
            {deleting ? <Spinner size={14} className="text-danger" /> : <Trash2 size={14} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </li>
  )
}

function EventCalendarWidget({ events }: { events: PortalEvent[] }) {
  const [cursor, setCursor] = useState(() => new Date(`${todayISO}T00:00:00`))
  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`
  const liveDays = new Set(
    events.filter((e) => e.isLive && e.dateISO.startsWith(monthPrefix)).map((e) => Number(e.dateISO.slice(8, 10))),
  )
  const upcomingDays = new Set(
    events.filter((e) => !e.isLive && e.dateISO.startsWith(monthPrefix)).map((e) => Number(e.dateISO.slice(8, 10))),
  )
  const currentDay = todayISO.startsWith(monthPrefix) ? Number(todayISO.slice(8, 10)) : -1

  const shift = (delta: number) => setCursor(new Date(year, month + delta, 1))

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">
          {cursor.toLocaleDateString('en-GB', { month: 'long' })} {year}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:text-primary"
          >
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={`h-${i}`} className="py-1 text-[11px] font-semibold text-ink-soft">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />
          const isCurrent = day === currentDay
          const isLive = liveDays.has(day)
          const isUpcoming = upcomingDays.has(day)
          return (
            <span key={day} className="flex items-center justify-center py-0.5">
              <span
                className={cx(
                  'relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200',
                  isCurrent
                    ? 'bg-primary text-white'
                    : isLive || isUpcoming
                      ? 'bg-primary-light text-primary-dark'
                      : 'text-ink-soft hover:bg-primary-lighter',
                )}
              >
                {day}
                {(isLive || isUpcoming) && !isCurrent && (
                  <span
                    aria-hidden="true"
                    className={cx(
                      'absolute bottom-0.5 h-1 w-1 rounded-full',
                      isLive ? 'bg-danger' : 'bg-primary',
                    )}
                  />
                )}
              </span>
            </span>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-5 border-t border-line pt-3 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden="true" />
          Live Event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-white" aria-hidden="true" />
          Upcoming Event
        </span>
      </div>
    </Card>
  )
}

interface EventsPayload {
  featured: ApiEvent | null
  upcoming: ApiEvent[]
  calendarMarks: string[]
  categories: Array<{ category: string; count: number }>
}

interface ManageEventsProps {
  /** 'faculty' sees only events they created; 'admin' sees all */
  scope: 'faculty' | 'admin'
  /** Creator shown in the list for new events (faculty name / 'Admin') */
  ownerName: string
  /** API user id — used to filter "My Events" for the faculty scope */
  ownerId?: string
  /** Which portal session's tokens are attached to the API calls */
  sessionKey: SessionKey
  headerSubtitle: string
  listTitle: string
}

/**
 * Events manager shared by the faculty and admin portals — add, edit and
 * delete events. The same pool syncs to the student portal.
 */
export function ManageEvents({ scope, ownerName, ownerId, sessionKey, headerSubtitle, listTitle }: ManageEventsProps) {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()

  const { data, error, loading, reload } = useApi<EventsPayload>(sessionKey, '/api/events')
  const events = useMemo(() => (data?.upcoming ?? []).map(mapEvent), [data])
  const categories = data?.categories ?? []
  const initialLoading = loading && !data

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PortalEvent | null>(null)
  const [form, setForm] = useState<EventFormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
    [events],
  )
  const visible =
    scope === 'faculty'
      ? sorted.filter((e) => (ownerId ? e.createdBy === ownerId : e.createdBy === ownerName))
      : sorted
  const featured = data?.featured ? mapEvent(data.featured) : sorted[0]

  const set = (key: keyof EventFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (event: PortalEvent) => {
    setEditing(event)
    setForm({
      title: event.title,
      category: event.category,
      date: event.dateISO,
      endDate: event.endDateISO ?? '',
      time: event.time,
      location: event.location,
      description: event.description,
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const nextErrors: FormErrors = {}
    if (!form.title.trim()) nextErrors.title = 'Event name is required.'
    if (!form.category) nextErrors.category = 'Select a category.'
    if (!form.date) nextErrors.date = 'Start date is required.'
    if (!form.time.trim()) nextErrors.time = 'Time is required.'
    if (!form.location.trim()) nextErrors.location = 'Location is required.'
    if (!form.description.trim()) nextErrors.description = 'Description is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const body = {
      title: form.title.trim(),
      category: form.category as EventCategory,
      startDate: form.date,
      endDate: form.endDate || null,
      time: form.time.trim(),
      location: form.location.trim(),
      description: form.description.trim() || null,
      isLive: editing?.isLive ?? false,
    }

    setSaving(true)
    try {
      if (editing) {
        await apiFetch(`/api/events/${editing.id}`, { method: 'PUT', sessionKey, body })
        toast.success('Event updated — changes will sync to the student portal.')
      } else {
        await apiFetch('/api/events', { method: 'POST', sessionKey, body })
        toast.success('Event created — it will appear in the student portal once synced.')
      }
      setModalOpen(false)
      reload()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not save the event.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (event: PortalEvent) => {
    setDeletingId(event.id)
    try {
      await apiFetch(`/api/events/${event.id}`, { method: 'DELETE', sessionKey })
      toast.danger(`"${event.title}" was deleted.`)
      reload()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not delete the event.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Events"
        subtitle={headerSubtitle}
        onMenuClick={openMenu}
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            Add Event
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
        {/* Main column */}
        <div className="space-y-6 xl:col-span-7">
          {error && !data ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <>
          {initialLoading ? (
            <Skeleton className="h-64 w-full rounded-[20px]" />
          ) : featured ? (
            <section aria-label="Featured event">
              <FeaturedBanner event={featured} onEdit={openEdit} />
            </section>
          ) : null}

          <Card className={initialLoading ? 'p-0 sm:p-0' : undefined}>
            {initialLoading ? (
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <Skeleton className="h-5 w-44" />
              </div>
            ) : (
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">{listTitle}</h3>
              <span className="text-sm font-medium text-ink-soft">{visible.length} events</span>
            </div>
            )}
            {initialLoading ? (
              <SkeletonRows rows={4} />
            ) : visible.length > 0 ? (
              <ul>
                {visible.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    showCreator={scope === 'admin'}
                    deleting={deletingId === event.id}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                  <CalendarDays size={22} aria-hidden="true" />
                </span>
                <p className="text-sm text-ink-soft">
                  No events yet — create one to share it with students.
                </p>
                <Button variant="secondary" size="sm" onClick={openCreate}>
                  <Plus size={15} aria-hidden="true" />
                  Add Event
                </Button>
              </div>
            )}
          </Card>
            </>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-6 xl:col-span-3">
          <EventCalendarWidget events={sorted} />

          {/* Promo card */}
          <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#4FB0F4] via-[#3BA7F2] to-[#168BE5] p-5 shadow-card">
            <div
              aria-hidden="true"
              className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10"
            />
            <div className="relative">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                <Megaphone size={18} aria-hidden="true" />
              </span>
              <h3 className="mt-3.5 text-base font-bold text-white">Planning an event?</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/85">
                Events you add here show up in the student portal once synced.
              </p>
              <Button variant="white" size="sm" className="mt-4 w-full" onClick={openCreate}>
                Add Event
              </Button>
            </div>
          </div>

          {/* Categories */}
          <SectionCard title="Event Categories">
            <ul className="divide-y divide-line">
              {categories.map((category) => {
                const Icon = categoryIconFor(category.category)
                return (
                  <li key={category.category}>
                    <button
                      type="button"
                      onClick={openCreate}
                      className="group flex w-full items-center gap-3 py-3 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-dark transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="flex-1 text-sm font-medium text-ink">{prettyCategory(category.category)}</span>
                      <span className="text-sm font-semibold text-ink-soft">{category.count}</span>
                      <ChevronRight
                        size={15}
                        className="text-ink-soft/40 transition-colors duration-200 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* Add / edit event dialog */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Event' : 'Add Event'}
        subtitle="Events sync to the student portal."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="event-form" loading={saving}>
              {editing ? 'Save Changes' : 'Create Event'}
            </Button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField
            id="event-title"
            label="Event Name"
            required
            placeholder="e.g. Machine Learning Bootcamp"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            error={errors.title}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              id="event-category"
              label="Category"
              required
              placeholder="Select category"
              options={categoryOptions}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              error={errors.category}
            />
            <TextField
              id="event-time"
              label="Time"
              required
              placeholder="e.g. 02:00 – 04:00 PM"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              error={errors.time}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="event-date"
              label="Start Date"
              required
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              error={errors.date}
            />
            <TextField
              id="event-end-date"
              label="End Date"
              type="date"
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </div>
          <TextField
            id="event-location"
            label="Location"
            required
            placeholder="e.g. Seminar Hall B"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            error={errors.location}
          />
          <TextAreaField
            id="event-description"
            label="Description"
            required
            placeholder="What is this event about? Students see this in the event details."
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            error={errors.description}
          />
        </form>
      </Modal>
    </div>
  )
}
