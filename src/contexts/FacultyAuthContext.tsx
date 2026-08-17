import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiFetch,
  clearApiCache,
  clearSession,
  getSession,
  setSession,
  type AuthUserPayload,
  type Session,
  type SessionKey,
} from '../lib/api'
import type { FacultyUser } from '../types'

const STORAGE_KEY: SessionKey = 'faculty-portal.session'

interface FacultyAuthValue {
  user: FacultyUser | null
  isAuthenticated: boolean
  /** Step 1 — ask the API to email a 6-digit code to the identifier. */
  requestOtp: (_identifier: string) => Promise<void>
  /** Step 2 — verify the code and store the returned session. */
  login: (_identifier: string, _code: string) => Promise<void>
  logout: () => void
}

const FacultyAuthContext = createContext<FacultyAuthValue | undefined>(undefined)

/** The API's firstName is the first token of the display name ("Dr.") —
 * fall back to the first real name part for the greeting. */
function displayFirstName(payload: AuthUserPayload): string {
  const honorific = /^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)$/i
  if (payload.firstName && !honorific.test(payload.firstName)) return payload.firstName
  const parts = payload.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim().split(/\s+/)
  return parts[0] || payload.firstName || ''
}

function toFacultyUser(payload: AuthUserPayload): FacultyUser {
  return {
    id: payload.id,
    name: payload.name,
    firstName: displayFirstName(payload),
    facultyId: payload.facultyId ?? '',
    email: payload.email,
    department: payload.department ?? '',
    designation: payload.designation ?? '',
  }
}

function sessionUser(session: Session | null): FacultyUser | null {
  if (!session || session.user.role !== 'faculty') return null
  return toFacultyUser(session.user)
}

/** Faculty authentication backed by /api/auth (OTP request → verify → session). */
export function FacultyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FacultyUser | null>(() => sessionUser(getSession(STORAGE_KEY)))

  const requestOtp = useCallback(async (identifier: string) => {
    await apiFetch('/api/auth/otp/request', { method: 'POST', body: { identifier } })
  }, [])

  const login = useCallback(async (identifier: string, code: string) => {
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUserPayload }>(
      '/api/auth/otp/verify',
      { method: 'POST', body: { identifier, code } },
    )
    if (data.user.role !== 'faculty') {
      throw new Error('This account does not have faculty access.')
    }
    setSession(STORAGE_KEY, data)
    setUser(toFacultyUser(data.user))
  }, [])

  const logout = useCallback(() => {
    const session = getSession(STORAGE_KEY)
    if (session) {
      void apiFetch('/api/auth/logout', {
        method: 'POST',
        body: { refreshToken: session.refreshToken },
        sessionKey: STORAGE_KEY,
      }).catch(() => undefined)
    }
    clearSession(STORAGE_KEY)
    clearApiCache()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, requestOtp, login, logout }),
    [user, requestOtp, login, logout],
  )

  return <FacultyAuthContext.Provider value={value}>{children}</FacultyAuthContext.Provider>
}

export function useFacultyAuth(): FacultyAuthValue {
  const context = useContext(FacultyAuthContext)
  if (!context) throw new Error('useFacultyAuth must be used within FacultyAuthProvider')
  return context
}
