import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { identifyOneSignalUser, logoutOneSignalUser, subscribeOneSignal } from '../lib/onesignal'

const STORAGE_KEY: SessionKey = 'admin-portal.session'

interface AdminAuthValue {
  user: AdminUser | null
  isAuthenticated: boolean
  requestOtp: (_identifier: string) => Promise<void>
  login: (_identifier: string, _code: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  updateAvatar: (url: string | null) => void
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
    avatarUrl: (payload as any).avatarUrl ?? null,
  }
}

function sessionUser(session: Session | null): AdminUser | null {
  if (!session || session.user.role !== 'admin') return null
  return toAdminUser(session.user)
}

/** Admin authentication backed by /api/auth (OTP request → verify → session). */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => sessionUser(getSession(STORAGE_KEY)))

  // OneSignal: identify on login AND on session restore (page reload) — OneSignal best
  // practice is to call login(external_id) on every load once the user is known. When the
  // browser already granted permission this also silently re-subscribes the device under
  // the current identity; the native prompt itself only ever comes from a user gesture
  // (post-login banner / Settings toggle), never from here.
  useEffect(() => {
    if (!user?.id) return
    void identifyOneSignalUser({ id: user.id, role: 'admin' }).catch(() => undefined)
  }, [user?.id])

  const requestOtp = useCallback(async (identifier: string) => {
    await apiFetch('/api/auth/otp/request', { method: 'POST', body: { identifier, portal: 'admin' } })
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
    // Ask for notification permission immediately on successful login, while the login
    // click's transient activation is still valid (browsers require a gesture for the
    // native prompt). Identify first so the new subscription attaches to THIS account,
    // then subscribeOneSignal() prompts (or silently re-subscribes if already granted).
    // If the timing misses the gesture window, the post-login banner is the fallback.
    // Session restore (effect above) identifies only — it never prompts.
    void (async () => {
      await identifyOneSignalUser({ id: data.user.id, role: 'admin' })
      await subscribeOneSignal()
    })().catch(() => undefined)
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
    void logoutOneSignalUser().catch(() => undefined)
    clearSession(STORAGE_KEY)
    clearApiCache()
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUserPayload } | AuthUserPayload>('/api/auth/me', { sessionKey: STORAGE_KEY })
      const payload: AuthUserPayload = (data as any).user ?? (data as any)
      const session = getSession(STORAGE_KEY)
      if (session) {
        const updated = { ...session, user: payload }
        setSession(STORAGE_KEY, updated)
        setUser(toAdminUser(payload))
      }
    } catch {}
  }, [])

  const updateAvatar = useCallback((avatarUrl: string | null) => {
    setUser((prev) => (prev ? { ...prev, avatarUrl } : prev))
    const session = getSession(STORAGE_KEY)
    if (session) {
      ;(session.user as any).avatarUrl = avatarUrl
      setSession(STORAGE_KEY, session)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, requestOtp, login, logout, refreshProfile, updateAvatar }),
    [user, requestOtp, login, logout, refreshProfile, updateAvatar],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth(): AdminAuthValue {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return context
}
