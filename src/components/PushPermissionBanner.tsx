import { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { getOneSignalState, subscribeOneSignal } from '../lib/onesignal'
import { useToast } from './Toast'

const DISMISS_KEY = 'westin:pushBanner:dismissed'

/**
 * Soft post-login banner — shown ONLY after login when push is not yet enabled.
 * The "Enable" button is a direct user gesture, so Notification.requestPermission() is not "blocked".
 * Dismiss is remembered per browser (localStorage) for 7 days.
 */
export function PushPermissionBanner() {
  const toast = useToast()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        // Respect dismiss (7 days)
        try {
          const raw = localStorage.getItem(DISMISS_KEY)
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
        // Only show if user is logged in (one of the session keys exists)
        const hasSession =
          !!localStorage.getItem('faculty-portal.session') || !!localStorage.getItem('admin-portal.session')
        if (!hasSession) return
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
          localStorage.removeItem(DISMISS_KEY)
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
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ at: Date.now() }))
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
