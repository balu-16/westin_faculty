import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { SubTabs } from '../../components/SubTabs'
import { Modal } from '../../components/Modal'
import { Skeleton, SkeletonRows, Spinner } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { FileField, SelectField } from '../../components/FormFields'
import { ApiError, apiFetch, useApi } from '../../lib/api'
import { mapTeacher, type ApiSubject, type ApiTeacher, type Paginated } from '../../lib/mappers'
import { useSections } from '../../contexts/SectionsContext'
import {
  canonicalPeriods,
  cx,
  slotStartMinutes,
  timeToMinutes,
  to12h,
  to24h,
  weekDays,
} from '../../utils'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

/* ---------- Types ---------- */

/** Builder row in the portal's display format (AM/PM times, day names). */
interface TimetableSlot {
  id: string
  sectionId: string
  day: string
  start: string
  end: string
  /** '' = free / unassigned period (draft only) */
  subjectId: string
  facultyId: string
  roomId: string
}

interface ApiSlot {
  id: string
  day: number
  startTime: string
  endTime: string
  subjectId: string
  subject: string
  code: string
  facultyId: string
  faculty: string
  roomId: string
  room: string
}

interface ApiRoom {
  id: string
  name: string
}

interface Catalog {
  subjectName: (_id: string) => string
  subjectCode: (_id: string) => string
  facultyName: (_id: string) => string
  roomLabel: (_id: string) => string
  sectionLabel: (_id: string) => string
  subjectOptions: Array<{ value: string; label: string }>
  facultyOptions: Array<{ value: string; label: string }>
  roomOptions: Array<{ value: string; label: string }>
}

const mapApiSlot = (row: ApiSlot, sectionId: string): TimetableSlot => ({
  id: row.id,
  sectionId,
  day: weekDays[row.day] ?? String(row.day),
  start: to12h(row.startTime),
  end: to12h(row.endTime),
  subjectId: row.subjectId,
  facultyId: row.facultyId,
  roomId: row.roomId,
})

const dayIndex = (day: string) => Math.max(0, weekDays.indexOf(day))

/* ---------- Excel import ---------- */

/** One parsed spreadsheet row, with per-row validation messages. */
interface ImportRow {
  key: string
  rowNum: number
  sectionName: string
  sectionId: string
  day: string
  start: string
  end: string
  subjectRaw: string
  subjectId: string
  facultyRaw: string
  facultyId: string
  roomRaw: string
  roomId: string
  errors: string[]
  /** Filled in by conflict detection (client or server); '' when clean */
  conflict: string
}

interface TimeLike {
  day: string
  start: string
  end: string
}

function overlapsTime(a: TimeLike, b: TimeLike): boolean {
  return (
    a.day === b.day &&
    timeToMinutes(a.start) < timeToMinutes(b.end) &&
    timeToMinutes(b.start) < timeToMinutes(a.end)
  )
}

const TIME_SLOT_PATTERN =
  /^\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*$/i

function normalizeTime(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/^(\d):/, '0$1:')
}

const TEMPLATE_ROWS = [
  ['Section', 'Day', 'Time Slot', 'Subject', 'Faculty', 'Room'],
  ['CSE-AIML 3A', 'Monday', '09:00 AM - 10:00 AM', 'CS301', 'Dr. Shreeram Hudda', 'Room 301'],
  ['CSE-AIML 3A', 'Monday', '10:15 AM - 11:15 AM', 'CS302', 'Dr. Ravi Kant Kumar', 'Room 305'],
  ['CSE-AIML 3B', 'Tuesday', '11:30 AM - 12:30 PM', 'Machine Learning', 'Dr. Priya Sharma', 'Room 309'],
]

interface InlineSelectProps {
  label: string
  value: string
  onChange: (_value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
  danger?: boolean
}

function InlineSelect({ label, value, onChange, options, placeholder, danger }: InlineSelectProps) {
  return (
    <div className="relative min-w-[150px] flex-1">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          'h-10 w-full appearance-none rounded-xl border bg-primary-lighter/60 pl-3.5 pr-9 text-sm text-ink transition-colors duration-200 focus:bg-white focus:outline-none',
          danger ? 'border-danger focus:border-danger' : 'border-line focus:border-primary',
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
        aria-hidden="true"
      />
    </div>
  )
}

interface SlotRowProps {
  slot: TimetableSlot
  editing: boolean
  /** Conflict message (usually from the API's 409 response) rendered inline. */
  conflictMessage: string
  catalog: Catalog
  /** A save is in flight — spinner on the confirm button prevents double-submits. */
  saving?: boolean
  onEdit: () => void
  onConfirm: () => void
  onDelete: () => void
  onChange: (_patch: Partial<TimetableSlot>) => void
}

function SlotRow({ slot, editing, conflictMessage, catalog, saving = false, onEdit, onConfirm, onDelete, onChange }: SlotRowProps) {
  return (
    <li
      className={cx(
        'border-b border-line/70 px-5 py-4 last:border-0 sm:px-6',
        editing && 'bg-primary-lighter/40',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Time */}
        <div className="w-[104px] shrink-0">
          <p className="text-sm font-semibold text-ink">{slot.start}</p>
          <p className="text-xs text-ink-soft">– {slot.end}</p>
        </div>

        {editing ? (
          <>
            <InlineSelect
              label="Subject"
              value={slot.subjectId}
              onChange={(v) => onChange({ subjectId: v, facultyId: '' })}
              options={catalog.subjectOptions}
              placeholder="Subject…"
            />
            <InlineSelect
              label="Faculty"
              value={slot.facultyId}
              onChange={(v) => onChange({ facultyId: v })}
              options={catalog.facultyOptions}
              placeholder="Faculty…"
            />
            <InlineSelect
              label="Room"
              value={slot.roomId}
              onChange={(v) => onChange({ roomId: v })}
              options={catalog.roomOptions}
              placeholder="Room…"
              danger={!!conflictMessage}
            />
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={onConfirm}
                aria-label="Done editing period"
                disabled={saving}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-success/40 bg-success/10 text-success transition-colors duration-200 hover:bg-success hover:text-white disabled:pointer-events-none disabled:opacity-60"
              >
                {saving ? <Spinner size={15} className="text-success" /> : <Check size={15} aria-hidden="true" />}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {slot.subjectId ? catalog.subjectName(slot.subjectId) : 'Free Period'}
                {slot.subjectId && (
                  <span className="ml-2 rounded-md bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-dark">
                    {catalog.subjectCode(slot.subjectId)}
                  </span>
                )}
              </p>
              <p className="mt-0.5 truncate text-xs text-ink-soft">
                {slot.facultyId ? catalog.facultyName(slot.facultyId) : 'No faculty assigned'} •{' '}
                {slot.roomId ? catalog.roomLabel(slot.roomId) : 'No room assigned'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${slot.start} period`}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-primary/40 hover:bg-primary-light hover:text-primary-dark"
              >
                <Pencil size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={`Delete ${slot.start} period`}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-soft transition-colors duration-200 hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>

      {conflictMessage && (
        <p role="alert" className="mt-2.5 flex items-center gap-2 text-xs font-medium text-danger">
          <TriangleAlert size={13} className="shrink-0" aria-hidden="true" />
          {conflictMessage}
        </p>
      )}
    </li>
  )
}

function WeekOverview({ slots, catalog }: { slots: TimetableSlot[]; catalog: Catalog }) {
  const timeRows = useMemo(() => {
    const keys = new Map<string, { start: string; end: string }>()
    slots.forEach((s) => keys.set(`${s.start}-${s.end}`, { start: s.start, end: s.end }))
    return [...keys.values()].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
  }, [slots])

  return (
    <Card className="p-0 sm:p-0">
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold text-ink">Full Week Overview</h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          Read-only grid of every period scheduled for this section.
        </p>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
              <th scope="col" className="px-5 py-3.5 font-semibold sm:px-6">Time</th>
              {weekDays.map((day) => (
                <th key={day} scope="col" className="px-4 py-3.5 font-semibold">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeRows.map((time) => (
              <tr
                key={`${time.start}-${time.end}`}
                className="border-b border-line/70 transition-colors duration-150 last:border-0 hover:bg-primary-lighter/60"
              >
                <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                  <p className="font-semibold text-ink">{time.start}</p>
                  <p className="text-xs text-ink-soft">– {time.end}</p>
                </td>
                {weekDays.map((day) => {
                  const slot = slots.find(
                    (s) => s.day === day && s.start === time.start && s.end === time.end,
                  )
                  return (
                    <td key={day} className="px-4 py-3 align-top">
                      {slot && slot.subjectId ? (
                        <div>
                          <p className="font-semibold text-ink">
                            {catalog.subjectCode(slot.subjectId)}
                            <span className="ml-2 text-xs font-medium text-ink-soft">
                              {catalog.roomLabel(slot.roomId)}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-xs text-ink-soft">
                            {catalog.facultyName(slot.facultyId)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-ink-soft/60">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function AdminTimetable() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const {
    sections: directorySections,
    error: sectionsError,
    reload: reloadSections,
  } = useSections()

  // Reference data for the builder dropdowns
  const {
    data: subjectsData,
    error: subjectsError,
    reload: reloadSubjects,
  } = useApi<ApiSubject[]>('admin-portal.session', '/api/subjects')
  const {
    data: teachersData,
    error: teachersError,
    reload: reloadTeachers,
  } = useApi<Paginated<ApiTeacher>>('admin-portal.session', '/api/admin/teachers?pageSize=100')
  const {
    data: roomsData,
    error: roomsError,
    reload: reloadRooms,
  } = useApi<ApiRoom[]>('admin-portal.session', '/api/timetable/rooms')
  const subjects = subjectsData ?? []
  const teachers = (teachersData?.rows ?? []).map(mapTeacher).filter((t) => t.status === 'active')
  const rooms = roomsData ?? []

  const catalog: Catalog = useMemo(
    () => ({
      subjectName: (id) => subjects.find((s) => s.id === id)?.name ?? '',
      subjectCode: (id) => subjects.find((s) => s.id === id)?.code ?? '',
      facultyName: (id) => teachers.find((t) => t.id === id)?.name ?? '',
      roomLabel: (id) => rooms.find((r) => r.id === id)?.name ?? '',
      sectionLabel: (id) => directorySections.find((s) => s.id === id)?.name ?? id,
      subjectOptions: subjects.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` })),
      facultyOptions: teachers.map((t) => ({ value: t.id, label: t.name })),
      roomOptions: rooms.map((r) => ({ value: r.id, label: r.name })),
    }),
    [subjects, teachers, rooms, directorySections],
  )

  /** First catalog source that failed without data — blocks the builder. */
  const catalogError =
    (subjectsError && !subjectsData ? subjectsError : '') ||
    (teachersError && !teachersData ? teachersError : '') ||
    (roomsError && !roomsData ? roomsError : '')
  const reloadCatalog = () => {
    reloadSubjects()
    reloadTeachers()
    reloadRooms()
  }

  const [sectionId, setSectionId] = useState('')
  const [day, setDay] = useState(weekDays[0])
  const [view, setView] = useState('edit')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Default to the first section once the directory loads
  useEffect(() => {
    if (!sectionId && directorySections.length > 0) {
      setSectionId(directorySections[0].id)
    }
  }, [directorySections, sectionId])

  const slotsPath = sectionId ? `/api/timetable/slots?sectionId=${sectionId}` : null
  const { data: slotsData, error: slotsError, loading: slotsLoading, reload: reloadSlots } =
    useApi<ApiSlot[]>('admin-portal.session', slotsPath, [sectionId])

  const [drafts, setDrafts] = useState<TimetableSlot[]>([])
  useEffect(() => {
    setDrafts([])
    setEditingId(null)
    setConflicts({})
  }, [sectionId])

  const serverSlots = useMemo(
    () => (slotsData ?? []).map((row) => mapApiSlot(row, sectionId)),
    [slotsData, sectionId],
  )
  const timetable = useMemo(() => [...serverSlots, ...drafts], [serverSlots, drafts])

  const sectionSlots = useMemo(
    () => timetable.filter((s) => s.sectionId === sectionId),
    [timetable, sectionId],
  )
  const daySlots = useMemo(
    () =>
      [...sectionSlots.filter((s) => s.day === day)].sort(
        (a, b) => slotStartMinutes(a) - slotStartMinutes(b),
      ),
    [sectionSlots, day],
  )

  const sectionLabelOf = (id: string) =>
    directorySections.find((s) => s.id === id)?.name ?? id

  /* ----- Slot persistence ----- */

  const slotBody = (slot: TimetableSlot) => ({
    sectionId: slot.sectionId,
    day: dayIndex(slot.day),
    startTime: to24h(slot.start),
    endTime: to24h(slot.end),
    subjectId: slot.subjectId,
    facultyId: slot.facultyId,
    roomId: slot.roomId,
  })

  const extractConflictMessage = (err: unknown): string => {
    if (err instanceof ApiError) return err.message
    return err instanceof Error ? err.message : 'Could not save the period.'
  }

  const updateSlot = (id: string, patch: Partial<TimetableSlot>) => {
    setDrafts((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setConflicts((prev) => ({ ...prev, [id]: '' }))
  }

  const handleConfirmSlot = async (slot: TimetableSlot) => {
    if (!slot.subjectId || !slot.facultyId || !slot.roomId) {
      setConflicts((prev) => ({
        ...prev,
        [slot.id]: 'Select a subject, faculty and room before saving this period.',
      }))
      return
    }
    setBusy(true)
    try {
      const isDraft = drafts.some((d) => d.id === slot.id)
      if (isDraft) {
        await apiFetch('/api/timetable/slots', {
          method: 'POST',
          sessionKey: 'admin-portal.session',
          body: slotBody(slot),
        })
      } else {
        await apiFetch(`/api/timetable/slots/${slot.id}`, {
          method: 'PUT',
          sessionKey: 'admin-portal.session',
          body: slotBody(slot),
        })
      }
      setEditingId(null)
      setConflicts((prev) => ({ ...prev, [slot.id]: '' }))
      reloadSlots()
    } catch (err) {
      // 409s carry the conflicting room/faculty/section details — surface
      // them in the slot's inline warning area and keep editing.
      setConflicts((prev) => ({ ...prev, [slot.id]: extractConflictMessage(err) }))
      toast.danger(extractConflictMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteSlot = async (slot: TimetableSlot) => {
    if (drafts.some((d) => d.id === slot.id)) {
      setDrafts((prev) => prev.filter((d) => d.id !== slot.id))
      if (editingId === slot.id) setEditingId(null)
      return
    }
    try {
      await apiFetch(`/api/timetable/slots/${slot.id}`, {
        method: 'DELETE',
        sessionKey: 'admin-portal.session',
      })
      toast.danger(`${slot.start} period removed from ${sectionLabelOf(sectionId)} — ${day}.`)
      if (editingId === slot.id) setEditingId(null)
      reloadSlots()
    } catch (err) {
      toast.danger(err instanceof Error ? err.message : 'Could not delete the period.')
    }
  }

  const handleAddPeriod = () => {
    const usedKeys = new Set(daySlots.map((s) => `${s.start}-${s.end}`))
    const next =
      canonicalPeriods.find((p) => !usedKeys.has(`${p.start}-${p.end}`)) ??
      { start: '05:00 PM', end: '06:00 PM' }
    const id = `draft-${Date.now()}`
    setDrafts((prev) => [
      ...prev,
      {
        id,
        sectionId,
        day,
        start: next.start,
        end: next.end,
        subjectId: '',
        facultyId: '',
        roomId: '',
      },
    ])
    setEditingId(id)
  }

  const dayConflictCount = daySlots.filter((s) => conflicts[s.id]).length

  /** True while the period list cannot render meaningful content yet — either
   *  the slots request is in flight or the section directory has not loaded
   *  (so no section is selected and slotsPath is paused). */
  const slotsPending =
    (slotsLoading && !slotsData) || (!sectionId && !slotsData && directorySections.length === 0)

  /* ----- Import state ----- */
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importRows, setImportRows] = useState<ImportRow[] | null>(null)
  const [importMode, setImportMode] = useState<'replace' | 'add'>('replace')
  const [importError, setImportError] = useState('')
  const [serverImportErrors, setServerImportErrors] = useState<Record<number, string>>({})
  const [importSummary, setImportSummary] = useState<{ periods: number; sections: number } | null>(
    null,
  )
  const [importing, setImporting] = useState(false)

  const validatedRows = useMemo(() => {
    if (!importRows) return null
    return importRows.map((row) => {
      if (row.errors.length > 0 || !row.start || !row.end) return { ...row, conflict: '' }

      const rowLike: TimeLike = { day: row.day, start: row.start, end: row.end }

      // Within the file: same room held by two sections, or a section double-booked
      const fileRoomClash = importRows.some(
        (other) =>
          other !== row &&
          !other.errors.length &&
          row.roomId &&
          other.roomId === row.roomId &&
          other.sectionId !== row.sectionId &&
          overlapsTime(other, rowLike),
      )
      const fileSectionClash = importRows.some(
        (other) =>
          other !== row && !other.errors.length && other.sectionId === row.sectionId && overlapsTime(other, rowLike),
      )
      // Against the loaded timetable — cross-section room clashes are also
      // validated server-side on submit.
      const existingRoomClash = timetable.some(
        (existing) =>
          row.roomId &&
          existing.roomId === row.roomId &&
          existing.sectionId !== row.sectionId &&
          overlapsTime(existing, rowLike),
      )
      const existingSectionClash =
        importMode === 'add' &&
        timetable.some(
          (existing) => existing.sectionId === row.sectionId && overlapsTime(existing, rowLike),
        )

      if (fileSectionClash || existingSectionClash) return { ...row, conflict: 'Section double-booked at this time' }
      if (fileRoomClash || existingRoomClash)
        return { ...row, conflict: `Room ${row.roomRaw} already in use at this time` }
      return { ...row, conflict: '' }
    })
  }, [importRows, importMode, timetable])

  const displayedRows = useMemo(() => {
    if (!validatedRows) return null
    return validatedRows.map((row) => ({
      ...row,
      conflict: row.conflict || serverImportErrors[row.rowNum] || '',
    }))
  }, [validatedRows, serverImportErrors])

  const invalidCount = displayedRows?.filter((r) => r.errors.length > 0).length ?? 0
  const conflictCount = displayedRows?.filter((r) => r.conflict).length ?? 0
  const canConfirm =
    !!displayedRows &&
    displayedRows.length > 0 &&
    invalidCount === 0 &&
    conflictCount === 0

  // xlsx (~430 kB) is only needed for these two Excel flows — load it on
  // demand so it stays out of the route's initial chunk.
  const downloadTemplate = async () => {
    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable')
    XLSX.writeFile(workbook, 'timetable-template.xlsx')
  }

  const handleImportFile = async (file: File | null) => {
    setImportFile(file)
    setImportError('')
    setImportRows(null)
    setImportSummary(null)
    setServerImportErrors({})
    if (!file) return
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      if (records.length === 0) {
        setImportError('No data rows found — use the template for the expected columns.')
        return
      }
      const rows: ImportRow[] = records.map((record, index) => {
        const get = (key: string) => String(record[key] ?? '').trim()
        const sectionName = get('Section')
        const dayRaw = get('Day')
        const timeRaw = get('Time Slot')
        const subjectRaw = get('Subject')
        const facultyRaw = get('Faculty')
        const roomRaw = get('Room')
        const errors: string[] = []

        const section = directorySections.find(
          (s) => s.name.toLowerCase() === sectionName.toLowerCase(),
        )
        if (!sectionName) errors.push('Missing section')
        else if (!section) errors.push(`Unknown section "${sectionName}"`)

        const matchedDay = weekDays.find((wd) => wd.toLowerCase() === dayRaw.toLowerCase()) ?? ''
        if (!dayRaw) errors.push('Missing day')
        else if (!matchedDay) errors.push(`Invalid day "${dayRaw}"`)

        const timeMatch = TIME_SLOT_PATTERN.exec(timeRaw)
        if (!timeRaw) errors.push('Missing time slot')
        else if (!timeMatch) errors.push(`Unreadable time "${timeRaw}"`)

        const subject = subjects.find(
          (s) =>
            s.code.toLowerCase() === subjectRaw.toLowerCase() ||
            s.name.toLowerCase() === subjectRaw.toLowerCase(),
        )
        if (!subjectRaw) errors.push('Missing subject')
        else if (!subject) errors.push(`Unknown subject "${subjectRaw}"`)

        const faculty = teachers.find((t) => t.name.toLowerCase() === facultyRaw.toLowerCase())
        if (facultyRaw && !faculty) errors.push(`Unknown faculty "${facultyRaw}"`)

        const room = rooms.find((r) => r.name.toLowerCase() === roomRaw.toLowerCase())
        if (roomRaw && !room) errors.push(`Unknown room "${roomRaw}"`)

        return {
          key: `row-${index}`,
          rowNum: index + 2,
          sectionName: section?.name ?? sectionName,
          sectionId: section?.id ?? '',
          day: matchedDay,
          start: timeMatch ? normalizeTime(timeMatch[1]) : '',
          end: timeMatch ? normalizeTime(timeMatch[2]) : '',
          subjectRaw,
          subjectId: subject?.id ?? '',
          facultyRaw,
          facultyId: faculty?.id ?? '',
          roomRaw,
          roomId: room?.id ?? '',
          errors,
          conflict: '',
        }
      })
      setImportRows(rows)
    } catch {
      setImportError('Could not read this file. Upload an .xlsx or .csv based on the template.')
    }
  }

  const handleConfirmImport = async () => {
    if (!canConfirm || !validatedRows) return
    setImporting(true)
    try {
      // The server receives the raw strings from the sheet and validates every
      // row against the database in one transaction.
      const result = await apiFetch<{ inserted: number }>('/api/timetable/import', {
        method: 'POST',
        sessionKey: 'admin-portal.session',
        body: {
          mode: importMode,
          rows: validatedRows.map((row) => ({
            section: row.sectionName,
            day: row.day,
            timeSlot: `${to24h(row.start)} - ${to24h(row.end)}`,
            subject: row.subjectRaw,
            faculty: row.facultyRaw,
            room: row.roomRaw,
          })),
        },
      })
      const sectionCount = new Set(validatedRows.map((r) => r.sectionId)).size
      setImportSummary({ periods: result.inserted, sections: sectionCount })
      toast.success(`${result.inserted} periods imported across ${sectionCount} sections.`)
      reloadSlots()
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const payload = err.payload as { message?: string; errors?: Array<{ row: number; message: string }> } | null
        const rowErrors: Record<number, string> = {}
        for (const item of payload?.errors ?? []) {
          rowErrors[item.row] = item.message
        }
        setServerImportErrors(rowErrors)
        if (payload?.message && Object.keys(rowErrors).length === 0) {
          setImportError(payload.message)
        } else {
          setImportError('The server rejected some rows — fix them in the file and re-upload.')
        }
      } else {
        setImportError(err instanceof Error ? err.message : 'Import failed.')
      }
    } finally {
      setImporting(false)
    }
  }

  const closeImport = () => {
    setImportOpen(false)
    setImportFile(null)
    setImportRows(null)
    setImportError('')
    setServerImportErrors({})
    setImportSummary(null)
  }

  return (
    <div className="space-y-6">
      <Header
        title="Timetable Management"
        subtitle="Create and manage class schedules across all sections"
        onMenuClick={openMenu}
      />

      <SubTabs
        tabs={[
          { id: 'edit', label: 'Edit Schedule' },
          { id: 'week', label: 'Week Overview' },
        ]}
        active={view}
        onChange={setView}
        aria-label="Timetable views"
      />

      {/* Section selector + import */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full sm:w-72">
            <SelectField
              id="timetable-section"
              label="Section / Class"
              required
              placeholder="Select section"
              options={directorySections.map((s) => ({ value: s.id, label: s.name }))}
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value)
                setEditingId(null)
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-0.5">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet size={16} aria-hidden="true" />
              Import from Excel
            </Button>
            <Button variant="ghost" onClick={reloadSlots} aria-label="Reload slots">
              <RefreshCw size={16} aria-hidden="true" />
              Reload
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          This master timetable drives what students and faculty see in their portals — every
          change is saved to the server immediately. Sections come from the Sections page.
        </p>
        {sectionsError && directorySections.length === 0 && (
          <div className="mt-4">
            <ErrorState message={sectionsError} onRetry={() => void reloadSections()} compact />
          </div>
        )}
      </Card>

      {slotsError && !slotsData ? (
        <ErrorState message={slotsError} onRetry={reloadSlots} />
      ) : catalogError ? (
        <ErrorState message={catalogError} onRetry={reloadCatalog} />
      ) : view === 'edit' ? (
        <>
          {/* Day tabs */}
          <div
            role="tablist"
            aria-label="Select weekday"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-line bg-white p-2 shadow-card scrollbar-thin"
          >
            {weekDays.map((d) => {
              const active = d === day
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setDay(d)
                    setEditingId(null)
                  }}
                  className={cx(
                    'flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                    active
                      ? 'bg-primary text-white shadow-[0_4px_12px_rgba(59,167,242,0.35)]'
                      : 'text-ink-soft hover:bg-primary-light hover:text-primary-dark',
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <Card className="p-0 sm:p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink">
                <CalendarDays size={18} className="text-primary" aria-hidden="true" />
                {sectionId ? sectionLabelOf(sectionId) : 'Section'} — {day}
              </h3>
              <Button variant="secondary" size="sm" onClick={handleAddPeriod}>
                <Plus size={15} aria-hidden="true" />
                Add Period
              </Button>
            </div>

            {slotsPending ? (
              <SkeletonRows rows={5} />
            ) : daySlots.length > 0 ? (
              <ul>
                {daySlots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    editing={editingId === slot.id}
                    conflictMessage={conflicts[slot.id] ?? ''}
                    catalog={catalog}
                    saving={busy}
                    onEdit={() => setEditingId(slot.id)}
                    onConfirm={() => void handleConfirmSlot(slot)}
                    onDelete={() => void handleDeleteSlot(slot)}
                    onChange={(patch) => updateSlot(slot.id, patch)}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
                  <CalendarDays size={22} aria-hidden="true" />
                </span>
                <p className="text-sm text-ink-soft">No periods scheduled — add the first one.</p>
                <Button variant="secondary" size="sm" onClick={handleAddPeriod}>
                  <Plus size={15} aria-hidden="true" />
                  Add Period
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
              <p className="text-xs text-ink-soft">
                {dayConflictCount > 0 ? (
                  <span className="flex items-center gap-1.5 font-semibold text-danger">
                    <TriangleAlert size={13} aria-hidden="true" />
                    {dayConflictCount} conflict{dayConflictCount > 1 ? 's' : ''} on {day}
                  </span>
                ) : (
                  <>Changes save to {sectionId ? sectionLabelOf(sectionId) : 'the section'} automatically.</>
                )}
              </p>
            </div>
          </Card>
        </>
      ) : slotsPending ? (
        <Card className="p-0 sm:p-0">
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-2 h-3 w-64" />
          </div>
          <SkeletonRows rows={6} />
        </Card>
      ) : (
        <WeekOverview slots={sectionSlots} catalog={catalog} />
      )}

      {/* Import dialog */}
      <Modal
        open={importOpen}
        onClose={closeImport}
        title="Import Timetable from Excel"
        subtitle="Bulk-load periods from an .xlsx or .csv file."
        wide
        footer={
          importSummary ? (
            <Button onClick={closeImport}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeImport}>
                Cancel
              </Button>
              <Button onClick={() => void handleConfirmImport()} disabled={!canConfirm} loading={importing}>
                <FileSpreadsheet size={16} aria-hidden="true" />
                Confirm Import
              </Button>
            </>
          )
        }
      >
        {importSummary ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7]">
              <CheckCircle2 size={28} className="text-success" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-ink">Import Complete</h3>
            <p className="text-sm text-ink-soft">
              <strong className="text-ink">{importSummary.periods} periods</strong> imported across{' '}
              <strong className="text-ink">{importSummary.sections} sections</strong> (
              {importMode === 'replace' ? 'existing schedules replaced' : 'merged into existing schedules'}
              ).
            </p>
          </div>
        ) : (
          <>
            <FileField
              label="Excel / CSV File"
              required
              accept=".xlsx,.xls,.csv"
              hint="XLSX or CSV — start from the template below"
              fileName={importFile?.name ?? null}
              onChange={(f) => void handleImportFile(f)}
              error={importError || undefined}
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary-dark transition-colors duration-200 hover:text-primary"
              >
                <Download size={15} aria-hidden="true" />
                Download Template (.xlsx)
              </button>
              <span className="text-xs text-ink-soft">
                Columns: Section, Day, Time Slot, Subject, Faculty, Room
              </span>
            </div>

            {displayedRows && displayedRows.length > 0 && (
              <>
                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-medium text-ink">Import mode</legend>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'replace', label: 'Replace existing schedule' },
                        { id: 'add', label: 'Add to existing schedule' },
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        aria-pressed={importMode === mode.id}
                        onClick={() => setImportMode(mode.id)}
                        className={
                          importMode === mode.id
                            ? 'rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150'
                            : 'rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors duration-150 hover:border-primary/40 hover:text-primary-dark'
                        }
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-ink-soft">
                    {importMode === 'replace'
                      ? 'Imported rows overwrite every period of each affected section + day.'
                      : 'Imported rows are merged in; a slot at the same time replaces only that period.'}
                  </p>
                </fieldset>

                <div className="mt-4 overflow-x-auto rounded-xl border border-line scrollbar-thin">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-line bg-primary-lighter/60 text-[11px] uppercase tracking-wide text-ink-soft">
                        <th scope="col" className="px-3 py-2.5 font-semibold">#</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Section</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Day</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Time</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Subject</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Faculty</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Room</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRows.map((row) => (
                        <tr
                          key={row.key}
                          className={cx(
                            'border-b border-line/70 last:border-0',
                            (row.errors.length > 0 || row.conflict) && 'bg-danger/5',
                          )}
                        >
                          <td className="px-3 py-2.5 text-ink-soft">{row.rowNum}</td>
                          <td className="px-3 py-2.5 font-semibold text-ink">{row.sectionName}</td>
                          <td className="px-3 py-2.5 text-ink-soft">{row.day}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-ink-soft">
                            {row.start ? `${row.start} – ${row.end}` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-ink-soft">{row.subjectRaw}</td>
                          <td className="px-3 py-2.5 text-ink-soft">{row.facultyRaw || '—'}</td>
                          <td className="px-3 py-2.5 text-ink-soft">{row.roomRaw || '—'}</td>
                          <td className="px-3 py-2.5">
                            {row.errors.length > 0 ? (
                              <span className="font-semibold text-danger">{row.errors.join(' • ')}</span>
                            ) : row.conflict ? (
                              <span className="font-semibold text-[#B45309]">{row.conflict}</span>
                            ) : (
                              <span className="font-semibold text-success">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {invalidCount > 0 || conflictCount > 0 ? (
                  <p
                    role="alert"
                    className="mt-3 flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2.5 text-sm font-medium text-[#B45309]"
                  >
                    <TriangleAlert size={15} className="shrink-0" aria-hidden="true" />
                    Fix {invalidCount} invalid row{invalidCount === 1 ? '' : 's'} and {conflictCount}{' '}
                    conflict{conflictCount === 1 ? '' : 's'} in the file before importing.
                  </p>
                ) : (
                  <p className="mt-3 text-sm font-medium text-success">
                    All {displayedRows.length} rows valid — ready to import.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
