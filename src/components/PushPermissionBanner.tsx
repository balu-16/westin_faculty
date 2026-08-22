import { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { getOneSignalExternalId, getOneSignalState, subscribeOneSignal } from '../lib/onesignal'
import { getSession } from '../lib/api'
import { useToast } from './Toast'

const DISMISS_KEY_BASE = 'westin:pushBanner:dismissed'

/** Current portal user, whichever faculty/admin session exists on this browser. */
function currentPortalUser(): { id: string; role: 'faculty' | 'admin' } | null {
  for (const key of ['faculty-portal.session', 'admin-portal.session'] as const) {
    const session = getSession(key)
    if (session?.user && (session.user.role === 'faculty' || session.user.role === 'admin')) {
      return { id: session.user.id, role: session.user.role }
    }
  }
  return null
}

/** Dismissal is per user (external id): a dismissal by one account never silences
 * the ask for a different account logging in on the same shared browser. */
function dismissKeyFor(user: { id: string; role: 'faculty' | 'admin' }): string {
  return `${DISMISS_KEY_BASE}:${getOneSignalExternalId(user)}`
}

/**
 * Fallback post-login banner — shown when push is not yet enabled after the automatic
 * login-time prompt was blocked or dismissed (the login flow itself asks for permission
 * right after a successful login; see the auth contexts and lib/onesignal.ts).
 * The "Enable" button is a direct user gesture, so Notification.requestPermission() is not "blocked".
 * If permission was already granted on this browser, login auto-subscribes silently and this
 * banner stays hidden — the browser can never re-show the native prompt once granted.
 * Dismiss is remembered per user (localStorage, keyed by external id) for 7 days.
 */
export function PushPermissionBanner() {
  const toast = useToast()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const user = currentPortalUser()
        if (!user) return
        // Respect this user's dismiss (7 days)
        try {
          const raw = localStorage.getItem(dismissKeyFor(user))
          if (raw) {
            const { at } = JSON.parse(raw) as { at: number }
            if (Date.now() - at < 7 * 24 * 60 * 60 * 1000) return
          }
        } catch {}
        const state = await getOneSignalState()
        if (cancelled) return
        // Show only if supported, not denied, and not yet opted-in
        if (!state.isSupported) return
        if (state.permissionNative === 'denied') return
        if (state.optedIn) return
        setVisible(true)
      } catch {}
    }
    // Defer slightly so OneSignal init has settled and doesn't double-prompt
    const t = window.setTimeout(check, 1500)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    try {
      const ok = await subscribeOneSignal()
      if (ok) {
        toast.success('Push notifications enabled — you’ll receive alerts on this device.')
        setVisible(false)
        try {
          const user = currentPortalUser()
          if (user) localStorage.removeItem(dismissKeyFor(user))
        } catch {}
      } else {
        const state = await getOneSignalState()
        if (state.permissionNative === 'denied') {
          toast.danger('Permission blocked — click the lock icon in the address bar → Reset permission → Reload.')
        } else {
          toast.danger('Permission dismissed — you can enable anytime in Settings.')
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    try {
      const user = currentPortalUser()
      if (user) localStorage.setItem(dismissKeyFor(user), JSON.stringify({ at: Date.now() }))
    } catch {}
  }

  if (!visible) return null

  return (
    <div className="animate-fade-in rounded-xl border border-primary/20 bg-primary-lighter/60 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark">
          <Bell size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Enable push notifications?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            Get instant alerts when an admin sends a notification. You can turn this off anytime in Settings.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={busy}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              <Bell size={14} aria-hidden="true" />
              {busy ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 text-xs font-semibold text-ink-soft hover:bg-primary-lighter"
            >
              <BellOff size={14} aria-hidden="true" />
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={handleDismiss} aria-label="Dismiss" className="shrink-0 rounded-lg p-1 text-ink-soft hover:bg-white">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
