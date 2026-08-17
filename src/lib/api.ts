import { useCallback, useEffect, useRef, useState } from 'react'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

/** Build an API URL without duplicating /api across portal callers. */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const apiPath = normalizedPath === '/api' || normalizedPath.startsWith('/api/')
    ? normalizedPath
    : `/api${normalizedPath}`
  return `${API_BASE_URL}${apiPath}`
}

/* ---------- Sessions ---------- */

export type SessionKey = 'faculty-portal.session' | 'admin-portal.session'

/** User payload returned by /api/auth/login, /api/auth/otp/verify and /api/auth/refresh. */
export interface AuthUserPayload {
  id: string
  role: 'student' | 'faculty' | 'admin'
  name: string
  firstName: string
  email: string
  department: string | null
  designation: string | null
  studentId: string | null
  facultyId: string | null
  adminId: string | null
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: AuthUserPayload
}

/** Broadcast so providers (e.g. SectionsContext) reload when auth changes. */
const SESSION_EVENT = 'westin:session-changed'

function readSession(key: SessionKey): Session | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.accessToken || !parsed?.refreshToken) return null
    return parsed
  } catch {
    return null
  }
}

export function getSession(key: SessionKey): Session | null {
  return readSession(key)
}

export function setSession(key: SessionKey, session: Session): void {
  window.localStorage.setItem(key, JSON.stringify(session))
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: key }))
}

export function clearSession(key: SessionKey): void {
  window.localStorage.removeItem(key)
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: key }))
}

/** Silent session write (token refresh) — does not trigger provider reloads. */
function patchSession(key: SessionKey, session: Session): void {
  window.localStorage.setItem(key, JSON.stringify(session))
}

export function sessionLoginPath(key: SessionKey): string {
  return key === 'faculty-portal.session' ? '/faculty/login' : '/admin/login'
}

/* ---------- Fetch ---------- */

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, payload: unknown) {
    const message =
      (typeof payload === 'object' && payload !== null && 'message' in payload && typeof (payload as { message?: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : null) ?? `Request failed (${status})`
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export interface ApiFetchOptions {
  method?: string
  body?: unknown
  /** Session whose tokens are attached; omit for public endpoints. */
  sessionKey?: SessionKey
}

/** Single-flight refresh per session key: parallel 401s share one rotation.
 *  Without this, the first rotation revokes the refresh token and every
 *  concurrent attempt fails, logging the user out. */
const refreshInFlight = new Map<SessionKey, Promise<boolean>>()

function tryRefresh(key: SessionKey): Promise<boolean> {
  let flight = refreshInFlight.get(key)
  if (!flight) {
    flight = (async () => {
      const session = readSession(key)
      if (!session?.refreshToken) return false
      try {
        const res = await fetch(apiUrl('/api/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        })
        if (!res.ok) return false
        const data = (await res.json()) as { accessToken: string; refreshToken: string; user?: AuthUserPayload }
        patchSession(key, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user ?? session.user,
        })
        return true
      } catch {
        return false
      }
    })().finally(() => refreshInFlight.delete(key))
    refreshInFlight.set(key, flight)
  }
  return flight
}

async function request<T>(path: string, options: ApiFetchOptions, allowRefresh: boolean): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const session = options.sessionKey ? readSession(options.sessionKey) : null
  if (session) headers.Authorization = `Bearer ${session.accessToken}`

  const res = await fetch(apiUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 401 && allowRefresh && options.sessionKey && session) {
    if (await tryRefresh(options.sessionKey)) {
      return request<T>(path, options, false)
    }
    clearSession(options.sessionKey)
    const login = sessionLoginPath(options.sessionKey)
    if (window.location.pathname !== login) window.location.assign(login)
    throw new ApiError(401, { message: 'Your session has expired — please sign in again.' })
  }

  if (!res.ok) {
    let payload: unknown = null
    try {
      payload = await res.json()
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, payload)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/**
 * JSON fetch helper for the Westin API. Attaches the session's bearer token,
 * transparently refreshes it once on 401 and retries; when the refresh fails
 * the session is cleared and the browser is redirected to the portal login.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  return request<T>(path, options, true)
}

/** PUT raw file bytes to a signed upload URL (materials/reports attachments). */
export async function uploadBytes(url: string, file: File, contentType?: string): Promise<void> {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  const res = await fetch(url, { method: 'PUT', headers, body: file })
  if (!res.ok) throw new ApiError(res.status, { message: `File upload failed (${res.status})` })
}

/* ---------- useApi hook ---------- */

export interface UseApiResult<T> {
  data: T | undefined
  error: string
  loading: boolean
  reload: () => void
}

/** GET responses younger than this are served from cache without a refetch. */
const CACHE_TTL_MS = 30_000

/** Module-level GET cache: session-scoped path → last successful payload +
 *  timestamp. Keyed by session key as well — both portals can be signed in
 *  at the same time and must never share cached payloads. useApi only issues
 *  GETs, so every entry is cacheable. */
const cache = new Map<string, { data: unknown; at: number }>()

/** Dedupe map: concurrent identical GETs share one in-flight promise. */
const inflight = new Map<string, Promise<unknown>>()

const cacheKey = (sessionKey: SessionKey, path: string) => `${sessionKey} ${path}`

/** Empty the GET cache (e.g. on logout, so the next user sees fresh data). */
export function clearApiCache(): void {
  cache.clear()
}

/** GET `path`, caching the result and sharing the request with any
 *  concurrent callers asking for the same session + path. */
function fetchAndCache<T>(sessionKey: SessionKey, path: string): Promise<T> {
  const key = cacheKey(sessionKey, path)
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>
  const request = apiFetch<T>(path, { sessionKey })
    .then((result) => {
      cache.set(key, { data: result, at: Date.now() })
      inflight.delete(key)
      return result
    })
    .catch((err: unknown) => {
      inflight.delete(key)
      throw err
    })
  inflight.set(key, request)
  return request
}

/**
 * Declarative GET. Skips the request while no session exists for `sessionKey`;
 * pass `null` as the path to pause fetching (e.g. a required filter is unset).
 *
 * GET responses are served stale-while-revalidate style: a fresh (<30s)
 * cached entry resolves immediately without hitting the network, a stale
 * entry is shown immediately while the request refreshes in the background.
 */
export function useApi<T>(sessionKey: SessionKey, path: string | null, deps: unknown[] = []): UseApiResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<boolean>(() => path !== null && readSession(sessionKey) !== null)
  const [tick, setTick] = useState(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    if (path === null || readSession(sessionKey) === null) {
      setLoading(false)
      return
    }
    let cancelled = false
    setError('')

    const cached = cache.get(cacheKey(sessionKey, path))
    if (cached) {
      // Paint the cached payload right away — no loading flash.
      setData(cached.data as T)
      setLoading(false)
      if (Date.now() - cached.at < CACHE_TTL_MS) return // fresh: skip the network
    } else {
      setLoading(true)
    }

    // No cache, or a stale entry: (re)fetch. With stale data on screen this
    // is a background refresh; concurrent identical GETs are deduped.
    fetchAndCache<T>(sessionKey, path)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (!cached) setError(err instanceof Error ? err.message : 'Something went wrong.')
        // Keep serving stale data when a background refresh fails.
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, path, tick, ...deps])

  // Explicit reloads usually follow a mutation, so they must hit the network
  // even inside the TTL — drop the cached entry before re-running the effect.
  const reload = useCallback(() => {
    if (path !== null) cache.delete(cacheKey(sessionKey, path))
    setTick((t) => t + 1)
  }, [sessionKey, path])

  return { data, error, loading, reload }
}
