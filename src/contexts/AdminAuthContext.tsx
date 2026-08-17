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
import type { AdminUser } from '../types'

const STORAGE_KEY: SessionKey = 'admin-portal.session'

interface AdminAuthValue {
  user: AdminUser | null
  isAuthenticated: boolean
  /** Step 1 — ask the API to email a 6-digit code to the identifier. */
  requestOtp: (_identifier: string) => Promise<void>
  /** Step 2 — verify the code and store the returned session. */
  login: (_identifier: string, _code: string) => Promise<void>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined)

/** The API's firstName is the first token of the display name — fall back to
 * the first real name part when it is an honorific. */
function displayFirstName(payload: AuthUserPayload): string {
  const honorific = /^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)$/i
  if (payload.firstName && !honorific.test(payload.firstName)) return payload.firstName
  const parts = payload.name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim().split(/\s+/)
  return parts[0] || payload.firstName || ''
}

function toAdminUser(payload: AuthUserPayload): AdminUser {
  return {
    id: payload.id,
    name: payload.name,
    firstName: displayFirstName(payload),
    adminId: payload.adminId ?? '',
    email: payload.email,
    role: payload.role === 'admin' ? 'Admin' : payload.role,
  }
}

function sessionUser(session: Session | null): AdminUser | null {
  if (!session || session.user.role !== 'admin') return null
  return toAdminUser(session.user)
}

/** Admin authentication backed by /api/auth (OTP request → verify → session). */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => sessionUser(getSession(STORAGE_KEY)))

  const requestOtp = useCallback(async (identifier: string) => {
    await apiFetch('/api/auth/otp/request', { method: 'POST', body: { identifier } })
  }, [])

  const login = useCallback(async (identifier: string, code: string) => {
    const data = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUserPayload }>(
      '/api/auth/otp/verify',
      { method: 'POST', body: { identifier, code } },
    )
    if (data.user.role !== 'admin') {
      throw new Error('This account does not have admin access.')
    }
    setSession(STORAGE_KEY, data)
    setUser(toAdminUser(data.user))
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

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthValue {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return context
}
