import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, getSession, type SessionKey } from '../lib/api'
import {
  mapStudent,
  type ApiFacultySection,
  type ApiSection,
  type ApiStudent,
} from '../lib/mappers'
import type { SectionRecord, StudentRow } from '../types'
import { yearToLabel, yearToNumber } from '../utils'

const FACULTY_KEY: SessionKey = 'faculty-portal.session'
const ADMIN_KEY: SessionKey = 'admin-portal.session'
/** Dispatched by setSession/clearSession in src/lib/api.ts. */
const SESSION_EVENT = 'westin:session-changed'

type PortalMode = 'faculty' | 'admin' | null

function detectMode(): PortalMode {
  if (getSession(ADMIN_KEY)) return 'admin'
  if (getSession(FACULTY_KEY)) return 'faculty'
  return null
}

function mapApiSection(row: ApiSection): SectionRecord {
  return {
    id: row.id,
    name: row.label,
    department: row.department,
    year: yearToLabel(row.year),
    classTeacherId: row.classTeacherId ?? '',
    classTeacherName: row.classTeacherName ?? '',
    maxStrength: row.maxStrength,
    studentCount: row.studentCount,
  }
}

/** /api/admin/students/directory returns every student (same row shape as
 *  the paginated /api/admin/students) in one call — the directory here needs
 *  all of them for rosters, move-in dropdowns and per-section counts. */
async function fetchAllStudents(sessionKey: SessionKey): Promise<ApiStudent[]> {
  return apiFetch<ApiStudent[]>('/api/admin/students/directory', { sessionKey })
}

export interface NewStudentInput {
  name: string
  email: string
  sectionId: string
  year: string
  department?: string
}

interface SectionsContextValue {
  /** Sections visible to the signed-in portal (faculty: only sections they teach). */
  sections: SectionRecord[]
  /** Students directory — populated for the admin session only. */
  students: StudentRow[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  addSection: (_section: Omit<SectionRecord, 'id'>) => Promise<SectionRecord>
  updateSection: (_id: string, _patch: Partial<Omit<SectionRecord, 'id'>>) => Promise<void>
  /** Rejects (409) while students are still allocated to the section. */
  deleteSection: (_id: string) => Promise<void>
  /** Moves a student to another section (target identified by section id). */
  moveStudent: (_studentId: string, _targetSectionId: string) => Promise<void>
  addStudent: (_student: NewStudentInput) => Promise<void>
}

const SectionsContext = createContext<SectionsContextValue | undefined>(undefined)

/**
 * Single source of truth for sections and student allocation, backed by the
 * API. The Admin Sections page, the Students page and the Timetable section
 * dropdown all read from here, so a section created in one place shows up
 * everywhere. Admin sessions see the full directory; faculty sessions only
 * the sections they teach (via /api/faculty/me/sections).
 */
export function SectionsProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PortalMode>(detectMode)
  const [sections, setSections] = useState<SectionRecord[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(detectMode() !== null)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  // Re-detect the active portal whenever a session is stored/cleared.
  useEffect(() => {
    const update = () => setMode(detectMode())
    window.addEventListener(SESSION_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(SESSION_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  useEffect(() => {
    if (!mode) {
      setSections([])
      setStudents([])
      setError('')
      setLoading(false)
      return
    }
    const sessionKey: SessionKey = mode === 'admin' ? ADMIN_KEY : FACULTY_KEY
    let cancelled = false
    setLoading(true)
    setError('')
    void (async () => {
      try {
        if (mode === 'admin') {
          const [sectionRows, studentRows] = await Promise.all([
            apiFetch<ApiSection[]>('/api/sections', { sessionKey }),
            fetchAllStudents(sessionKey),
          ])
          if (cancelled) return
          setSections(sectionRows.map(mapApiSection))
          setStudents(studentRows.map(mapStudent))
        } else {
          const [mine, all] = await Promise.all([
            apiFetch<ApiFacultySection[]>('/api/faculty/me/sections', { sessionKey }),
            apiFetch<ApiSection[]>('/api/sections', { sessionKey }),
          ])
          if (cancelled) return
          setSections(
            mine.map((m) => {
              const base = all.find((a) => a.id === m.id)
              const mapped: SectionRecord = {
                id: m.id,
                name: m.label,
                department: m.department,
                year: yearToLabel(m.year),
                classTeacherId: base?.classTeacherId ?? '',
                classTeacherName: base?.classTeacherName ?? '',
                maxStrength: base?.maxStrength ?? 0,
                studentCount: m.studentCount,
                subjects: m.subjects ?? [],
                isClassTeacher: m.isClassTeacher,
              }
              return mapped
            }),
          )
          setStudents([])
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load sections.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, tick])

  const reload = useCallback(async () => {
    setTick((t) => t + 1)
  }, [])

  const addSection = useCallback(
    async (section: Omit<SectionRecord, 'id'>) => {
      const created = await apiFetch<ApiSection>('/api/sections', {
        method: 'POST',
        sessionKey: ADMIN_KEY,
        body: {
          label: section.name,
          department: section.department,
          year: yearToNumber(section.year),
          classTeacherId: section.classTeacherId || undefined,
          maxStrength: section.maxStrength,
        },
      })
      await reload()
      return mapApiSection(created)
    },
    [reload],
  )

  const updateSection = useCallback(
    async (id: string, patch: Partial<Omit<SectionRecord, 'id'>>) => {
      const body: Record<string, unknown> = {}
      if (patch.name !== undefined) body.label = patch.name
      if (patch.department !== undefined) body.department = patch.department
      if (patch.year !== undefined) body.year = yearToNumber(patch.year)
      if (patch.classTeacherId !== undefined) body.classTeacherId = patch.classTeacherId || null
      if (patch.maxStrength !== undefined) body.maxStrength = patch.maxStrength
      await apiFetch(`/api/sections/${id}`, { method: 'PATCH', sessionKey: ADMIN_KEY, body })
      await reload()
    },
    [reload],
  )

  const deleteSection = useCallback(
    async (id: string) => {
      await apiFetch(`/api/sections/${id}`, { method: 'DELETE', sessionKey: ADMIN_KEY })
      await reload()
    },
    [reload],
  )

  const moveStudent = useCallback(
    async (studentId: string, targetSectionId: string) => {
      await apiFetch(`/api/sections/${targetSectionId}/students/move`, {
        method: 'POST',
        sessionKey: ADMIN_KEY,
        body: { studentId },
      })
      await reload()
    },
    [reload],
  )

  const addStudent = useCallback(
    async (student: NewStudentInput) => {
      await apiFetch('/api/admin/students', {
        method: 'POST',
        sessionKey: ADMIN_KEY,
        body: {
          name: student.name,
          email: student.email,
          sectionId: student.sectionId,
          year: yearToNumber(student.year),
          department: student.department || undefined,
        },
      })
      await reload()
    },
    [reload],
  )

  const value = useMemo(
    () => ({
      sections,
      students,
      loading,
      error,
      reload,
      addSection,
      updateSection,
      deleteSection,
      moveStudent,
      addStudent,
    }),
    [sections, students, loading, error, reload, addSection, updateSection, deleteSection, moveStudent, addStudent],
  )

  return <SectionsContext.Provider value={value}>{children}</SectionsContext.Provider>
}

export function useSections(): SectionsContextValue {
  const context = useContext(SectionsContext)
  if (!context) throw new Error('useSections must be used within SectionsProvider')
  return context
}
