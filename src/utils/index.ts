import type { ClassStatus, FileType } from '../types'

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export const statusLabels: Record<ClassStatus, string> = {
  completed: 'Completed ✓',
  'in-progress': 'In Progress •',
  upcoming: 'Upcoming',
}

/* ---------- Calendar constants (previously in src/data/sharedData.ts) ---------- */

/** Local ISO date (yyyy-mm-dd) without timezone drift. */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* ---------- Kolkata-aware date helpers (Asia/Kolkata) ---------- */

/** Stable formatter for YYYY-MM-DD in Asia/Kolkata — mirrors westin-api/src/common/util/time.ts kolkataNow */
const kolkataISOFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Kolkata wall-clock date (YYYY-MM-DD). Recomputes on each call so a stale
 * module-level constant after midnight does not leak yesterday's date.
 */
export function kolkataTodayISO(date = new Date()): string {
  return kolkataISOFormatter.format(date)
}

/** Alias recomputable Kolkata today — preferred import for attendance */
export function getTodayISO(date = new Date()): string {
  return kolkataTodayISO(date)
}

/** Backward-compatible module constant — now Kolkata-aware at load time */
export const todayISO = kolkataTodayISO()

/** "16 Aug 2026, Sunday" — matches the label style used in the student portal. */
export function formatDateLabel(date: Date): string {
  const day = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
  return `${day}, ${weekday}`
}

/** Kolkata-aware label: "16 Aug 2026, Sunday" using Asia/Kolkata */
export function getTodayDateLabel(date = new Date()): string {
  const day = date.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const weekday = date.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long' })
  return `${day}, ${weekday}`
}

/** Alias for Kolkata-aware date label */
export function kolkataTodayDateLabel(date = new Date()): string {
  return getTodayDateLabel(date)
}

/** Function form of todayDateLabel for recomputable Kolkata label */
export function todayDateLabelFn(date = new Date()): string {
  return getTodayDateLabel(date)
}

export const todayDateLabel = getTodayDateLabel()

/** Helper: is the supplied YYYY-MM-DD editable today in Kolkata? */
export function isAttendanceEditable(dateISO: string, today = kolkataTodayISO()): boolean {
  return dateISO === today
}

/** "2026-08-14" (or an already formatted date) → "14 Aug 2026". */
export function displayDate(value: string): string {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
  return value
}

/** ISO-ish timestamp → "08:42 AM". */
export function displayTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

/** ISO-ish timestamp → short relative label ("12 minutes ago"). */
export function timeAgo(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return displayDate(value)
}

/* ---------- Attendance periods (h1..h6 map straight onto API `period`) ---------- */

export interface PeriodDef {
  id: string
  label: string
}

export const periods: PeriodDef[] = [
  { id: 'h1', label: 'Hour 1 • 09:00 – 10:00 AM' },
  { id: 'h2', label: 'Hour 2 • 10:15 – 11:15 AM' },
  { id: 'h3', label: 'Hour 3 • 11:30 AM – 12:30 PM' },
  { id: 'h4', label: 'Hour 4 • 01:15 – 02:15 PM' },
  { id: 'h5', label: 'Hour 5 • 02:30 – 03:30 PM' },
  { id: 'h6', label: 'Hour 6 • 03:45 – 04:45 PM' },
]

export const periodLabel = (id: string) => periods.find((p) => p.id === id)?.label ?? id

/* ---------- Timetable helpers ---------- */

export const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Standard period times used across the college (display form). */
export const canonicalPeriods: Array<{ start: string; end: string }> = [
  { start: '09:00 AM', end: '10:00 AM' },
  { start: '10:15 AM', end: '11:15 AM' },
  { start: '11:30 AM', end: '12:30 PM' },
  { start: '01:15 PM', end: '02:15 PM' },
  { start: '02:30 PM', end: '03:30 PM' },
  { start: '03:45 PM', end: '04:45 PM' },
]

/** "10:15 AM" → minutes since midnight. */
export function timeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim())
  if (!match) {
    const h24 = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
    if (h24) return Number(h24[1]) * 60 + Number(h24[2])
    return 0
  }
  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3].toUpperCase()
  if (meridiem === 'PM' && hours !== 12) hours += 12
  if (meridiem === 'AM' && hours === 12) hours = 0
  return hours * 60 + minutes
}

/** Sort key for slots within a day. */
export const slotStartMinutes = (slot: { start: string }) => timeToMinutes(slot.start)

/** "14:15" (API HH:MM) → "02:15 PM" (portal display). */
export function to12h(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) return time
  let hours = Number(match[1])
  const minutes = match[2]
  const meridiem = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`
}

/** "02:15 PM" (portal display) → "14:15" (API HH:MM). */
export function to24h(time: string): string {
  const total = timeToMinutes(time)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Room names from the API look like "Room 308" — the cards render "Room …" already. */
export function roomDisplay(name: string): string {
  return name.replace(/^Room\s+/i, '')
}

/* ---------- Academic year labels (API stores ints) ---------- */

export function yearToLabel(year: number | string | null | undefined): string {
  const n = Number(year)
  if (!Number.isFinite(n) || n <= 0) return String(year ?? '')
  const suffixes = ['th', 'st', 'nd', 'rd']
  const remainder = n % 100
  const suffix = suffixes[(remainder - 20) % 10] ?? suffixes[remainder] ?? suffixes[0]
  return `${n}${suffix} Year`
}

export function yearToNumber(label: string): number {
  const match = /(\d)/.exec(label)
  return match ? Number(match[1]) : 3
}

/* ---------- File type presentation ---------- */

export const fileTypeMeta: Record<FileType, { label: string; color: string; bg: string }> = {
  pdf: { label: 'PDF', color: '#EF4444', bg: '#FEE2E2' },
  docx: { label: 'DOCX', color: '#3BA7F2', bg: '#EAF6FF' },
  pptx: { label: 'PPTX', color: '#F59E0B', bg: '#FEF3C7' },
  xlsx: { label: 'XLSX', color: '#16A34A', bg: '#DCFCE7' },
}

/* ---------- Attendance + misc ---------- */

/** Health bucket for attendance percentages, used across attendance UI. */
export function attendanceHealth(percentage: number): 'good' | 'warning' | 'low' {
  if (percentage >= 85) return 'good'
  if (percentage >= 75) return 'warning'
  return 'low'
}

export function healthClasses(health: 'good' | 'warning' | 'low') {
  switch (health) {
    case 'good':
      return { text: 'text-success', label: 'Good' }
    case 'warning':
      return { text: 'text-warning', label: 'Warning' }
    case 'low':
      return { text: 'text-danger', label: 'Low' }
  }
}

export function initials(name: string): string {
  const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim().split(/\s+/)
  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase()
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Best-effort file type from the extension — defaults to PDF. */
export function guessFileType(fileName: string): FileType {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'doc' || ext === 'docx') return 'docx'
  if (ext === 'ppt' || ext === 'pptx') return 'pptx'
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'xlsx'
  return 'pdf'
}
