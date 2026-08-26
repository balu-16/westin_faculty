import type {
  ActivityItem,
  Announcement,
  ClassSession,
  ClassStatus,
  DailyReport,
  DaySchedule,
  FileType,
  LoginLog,
  PortalEvent,
  StudentRow,
  TeacherRow,
} from '../types'
import {
  displayDate,
  displayTime,
  roomDisplay,
  to12h,
  todayISO,
  yearToLabel,
} from '../utils'

/* ---------- Raw API payload shapes (see westin-api SPEC.md) ---------- */

/** Envelope returned by the paginated list endpoints
 *  (/api/admin/students, /api/admin/teachers, /api/reports). */
export interface Paginated<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiSubject {
  id: string
  name: string
  code: string
}

export interface ApiSection {
  id: string
  label: string
  department: string
  year: number
  classTeacherId: string | null
  classTeacherName: string | null
  maxStrength: number
  studentCount: number
}

export interface ApiFacultySection {
  id: string
  label: string
  department: string
  year: number
  studentCount: number
  subjects: string[]
  isClassTeacher: boolean
}

export interface ApiStudent {
  id: string
  studentId: string
  name: string
  email: string
  section: string | null
  sectionId: string | null
  year: number | string
  department: string | null
  rollNo: string | null
  attendance: number
  status: 'active' | 'inactive'
}

export interface ApiTeacher {
  id: string
  facultyId: string | null
  name: string
  email: string
  designation: string | null
  department: string | null
  phone: string | null
  subjects: string[]
  status: 'active' | 'inactive'
}

export interface ApiLoginLog {
  id: string | number
  name: string
  identifier: string | null
  device: string | null
  ip: string | null
  time: string
}

export interface ApiEvent {
  id: string
  title: string
  category: PortalEvent['category'] | string
  startDate: string
  endDate: string | null
  time: string | null
  location: string | null
  isLive: boolean
  description: string | null
  createdBy: string | null
  posterPath?: string | null
  posterUrl?: string | null
}

export interface ApiReport {
  id: string
  section: string
  sectionId: string
  subject: string
  subjectId: string
  date: string
  topic: string
  fileName: string | null
  fileType: string | null
  attachmentUrl: string | null
  submittedBy: string
}

export interface ApiAnnouncement {
  id: string
  title: string
  message: string
  date: string
  category: string
  audience?: string
}

export interface ApiClassSession {
  id: string
  subject: string
  code: string
  subjectId?: string
  faculty: string
  facultyId?: string
  startTime: string // "HH:MM" 24h
  endTime: string
  room: string
  section: string
  sectionId?: string
  day?: number
  status: string
}

export interface ApiWeekDay {
  day: number
  dayName: string
  sessions: ApiClassSession[]
}

/* ---------- Mappers ---------- */

export function mapClassSession(raw: ApiClassSession): ClassSession {
  return {
    id: raw.id,
    subject: raw.subject,
    code: raw.code,
    faculty: raw.faculty,
    startTime: to12h(raw.startTime),
    endTime: to12h(raw.endTime),
    room: roomDisplay(raw.room),
    section: raw.section,
    status: raw.status as ClassStatus,
    subjectId: raw.subjectId,
    facultyId: raw.facultyId,
    sectionId: raw.sectionId,
    day: raw.day,
  }
}

export function mapWeek(week: ApiWeekDay[]): DaySchedule[] {
  return week.map((d) => ({
    day: d.dayName,
    classes: d.sessions.map(mapClassSession),
  }))
}

const EVENT_ACCENTS: Record<string, string> = {
  CULTURAL: '#EF4444',
  'TECH TALK': '#3BA7F2',
  SPORTS: '#16A34A',
  WORKSHOP: '#F59E0B',
  SEMINAR: '#8B5CF6',
}

export function eventAccent(category: string): string {
  return EVENT_ACCENTS[category] ?? '#3BA7F2'
}

function fullDateLabel(dateISO: string): string {
  return displayDate(dateISO)
}

export function mapEvent(raw: ApiEvent): PortalEvent {
  return {
    id: raw.id,
    category: raw.category as PortalEvent['category'],
    title: raw.title,
    description: raw.description ?? '',
    dateISO: raw.startDate,
    endDateISO: raw.endDate ?? undefined,
    fullDate: fullDateLabel(raw.startDate),
    time: raw.time ?? 'TBA',
    location: raw.location ?? 'TBA',
    accent: eventAccent(raw.category),
    createdBy: raw.createdBy ?? '',
    isLive: raw.isLive,
    posterPath: raw.posterPath ?? null,
    posterUrl: raw.posterUrl ?? null,
  }
}

export function mapAnnouncement(raw: ApiAnnouncement): Announcement {
  return {
    id: raw.id,
    title: raw.title,
    message: raw.message,
    date: displayDate(raw.date),
    category: (raw.category as Announcement['category']) ?? 'general',
  }
}

export function mapStudent(raw: ApiStudent): StudentRow {
  return {
    id: raw.id,
    name: raw.name,
    studentId: raw.studentId,
    section: raw.section ?? '',
    sectionId: raw.sectionId ?? undefined,
    email: raw.email,
    year: yearToLabel(raw.year),
    attendance: Math.round(raw.attendance ?? 0),
    status: raw.status,
    rollNo: raw.rollNo ?? undefined,
    department: raw.department ?? undefined,
  }
}

export function mapTeacher(raw: ApiTeacher): TeacherRow {
  return {
    id: raw.id,
    name: raw.name,
    designation: raw.designation ?? '—',
    department: raw.department ?? '—',
    email: raw.email,
    phone: raw.phone ?? '—',
    subjects: raw.subjects ?? [],
    status: raw.status,
  }
}

export function mapLoginLog(raw: ApiLoginLog): LoginLog {
  const dateISO = raw.time?.slice(0, 10) ?? todayISO
  return {
    id: String(raw.id),
    name: raw.name,
    date: displayDate(raw.time),
    dateISO,
    time: displayTime(raw.time),
    device: raw.device ?? 'Unknown device',
    ip: raw.ip ?? '—',
  }
}

const FILE_TYPES: FileType[] = ['pdf', 'docx', 'pptx', 'xlsx']

export function mapReport(raw: ApiReport): DailyReport {
  const type = (raw.fileType?.toLowerCase() ?? '') as FileType
  return {
    id: raw.id,
    section: raw.section,
    subject: raw.subject,
    topic: raw.topic,
    date: displayDate(raw.date),
    dateISO: /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : raw.date.slice(0, 10),
    fileName: raw.fileName ?? '—',
    fileType: FILE_TYPES.includes(type) ? type : 'pdf',
    submittedBy: raw.submittedBy,
    sectionId: raw.sectionId,
    subjectId: raw.subjectId,
    attachmentUrl: raw.attachmentUrl,
  }
}

/** Activity feed ids look like "login-2026-08-16T08:42:00-Dr. Priya Sharma". */
export function mapActivityIcon(id: string): ActivityItem['icon'] {
  const kind = id.split('-')[0]
  if (kind === 'login') return 'user'
  if (kind === 'event') return 'event'
  if (kind === 'report') return 'report'
  return 'material'
}
