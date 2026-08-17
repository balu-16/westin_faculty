/* ---------- Shared ---------- */

export type ClassStatus = 'completed' | 'in-progress' | 'upcoming'

export interface ClassSession {
  id: string
  subject: string
  code: string
  faculty: string
  startTime: string
  endTime: string
  room: string
  section: string
  status: ClassStatus
  /** Extra identifiers present on API payloads */
  subjectId?: string
  facultyId?: string
  sectionId?: string
  day?: number
}

export interface DaySchedule {
  day: string
  classes: ClassSession[]
}

export type FileType = 'pdf' | 'docx' | 'pptx' | 'xlsx'

export interface StudyFile {
  id: string
  name: string
  subtitle: string
  type: FileType
  subject: string
  uploadedBy: string
  date: string
  size: string
  /** Signed download URL from the API (1h validity) */
  downloadUrl?: string | null
  sizeBytes?: number
  description?: string | null
  subjectId?: string | null
}

export interface SubjectFolder {
  id: string
  subject: string
  fileCount: number
}

export type EventCategory = 'CULTURAL' | 'TECH TALK' | 'SPORTS' | 'WORKSHOP' | 'SEMINAR'

export interface PortalEvent {
  id: string
  category: EventCategory
  title: string
  description: string
  /** yyyy-mm-dd — used for sorting, filters and calendar marks */
  dateISO: string
  /** Optional second day for multi-day events */
  endDateISO?: string
  fullDate: string
  time: string
  location: string
  accent: string
  createdBy: string
  isLive?: boolean
}

export interface EventCategoryCount {
  id: string
  name: string
  count: number
  icon: 'music' | 'presentation' | 'trophy' | 'wrench' | 'sparkles'
}

export interface Announcement {
  id: string
  title: string
  message: string
  date: string
  category: 'exam' | 'event' | 'general'
}

export interface QuickLinkItem {
  id: string
  label: string
  to: string
  icon: 'book' | 'clipboard' | 'calendar' | 'bell' | 'file' | 'clock'
}

export interface LoginLog {
  id: string
  name: string
  date: string
  /** yyyy-mm-dd */
  dateISO: string
  time: string
  device: string
  ip: string
}

/* ---------- Faculty portal ---------- */

export interface FacultyUser {
  name: string
  firstName: string
  facultyId: string
  email: string
  department: string
  designation: string
  /** API user id — used to match resources created by this faculty member */
  id?: string
}

export interface SectionStudent {
  id: string
  rollNo: string
  name: string
}

export type AttendanceMark = 'present' | 'absent' | 'leave'

export interface SubmittedAttendance {
  section: string
  periodLabel: string
  present: number
  absent: number
  leave: number
  total: number
}

export interface DailyReport {
  id: string
  section: string
  subject: string
  topic: string
  /** Display date, e.g. "16 Aug 2026" */
  date: string
  /** yyyy-mm-dd */
  dateISO: string
  fileName: string
  fileType: FileType
  submittedBy: string
  /** Extra identifiers / signed URL present on API payloads */
  sectionId?: string
  subjectId?: string
  attachmentUrl?: string | null
}

/* ---------- Admin portal ---------- */

export interface AdminUser {
  name: string
  firstName: string
  adminId: string
  email: string
  role: string
  id?: string
}

export interface TeacherRow {
  id: string
  name: string
  designation: string
  department: string
  email: string
  phone: string
  subjects: string[]
  status: 'active' | 'inactive'
}

export interface SectionRecord {
  id: string
  /** Display name, e.g. "CSE-AIML 3A" — students reference sections by this */
  name: string
  department: string
  year: string
  classTeacherId: string
  maxStrength: number
  /** Extra fields present on API payloads */
  classTeacherName?: string
  studentCount?: number
  subjects?: string[]
  isClassTeacher?: boolean
}

export interface StudentRow {
  id: string
  name: string
  studentId: string
  section: string
  email: string
  year: string
  attendance: number
  status: 'active' | 'inactive'
  /** Extra fields present on API payloads */
  sectionId?: string
  rollNo?: string
  department?: string
}

export interface ActivityItem {
  id: string
  icon: 'report' | 'attendance' | 'event' | 'material' | 'user'
  actor: string
  action: string
  target: string
  time: string
}
