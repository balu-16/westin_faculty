import { useEffect, useState, type ReactNode } from 'react'
import { Bell, Plus, Share, Smartphone, X } from 'lucide-react'
import { Modal } from './Modal'
import { isIOS, isStandalone, iosVersionAtLeast } from '../lib/pwa'

const DISMISS_KEY = 'westin:installBanner:dismissed'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000

function Step({ n, icon, title, children }: { n: number; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary-dark">
        {n}
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <span className="text-primary-dark" aria-hidden="true">
            {icon}
          </span>
          {title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{children}</p>
      </div>
    </li>
  )
}

/**
 * iPhone/iPad install guide — shown instead of the push banner when the portal
 * runs in an iOS browser tab, where web push is impossible (Apple only allows
 * it inside the Home Screen installed web app, iOS 16.4+). The user installs
 * via Share → Add to Home Screen from Safari, Chrome or Edge, then logs in and
 * enables notifications inside the installed app. Dismissal lasts 7 days.
 */
export function InstallPwaBanner() {
  const [visible, setVisible] = useState(false)
  const [stepsOpen, setStepsOpen] = useState(false)

  useEffect(() => {
    // Only iPhone/iPad users browsing in a tab need the install walkthrough.
    if (!isIOS()) return
    if (isStandalone()) return
    if (!iosVersionAtLeast(16, 4)) return
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw) {
        const { at } = JSON.parse(raw) as { at: number }
        if (Date.now() - at < DISMISS_TTL_MS) return
      }
    } catch {}
    // Defer past the push banner's check so the two never stack on one screen
    const t = window.setTimeout(() => setVisible(true), 3000)
    return () => window.clearTimeout(t)
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ at: Date.now() }))
    } catch {}
  }

  if (!visible) return null

  return (
    <>
      <div className="animate-fade-in rounded-xl border border-primary/20 bg-primary-lighter/60 p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <Smartphone size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Get notifications on your iPhone</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
              iPhone notifications only work in the installed app — add Westin to your Home Screen, then log in and
              enable alerts.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStepsOpen(true)}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                <Share size={14} aria-hidden="true" />
                How to install
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 text-xs font-semibold text-ink-soft hover:bg-primary-lighter"
              >
                Not now
              </button>
            </div>
          </div>
          <button type="button" onClick={handleDismiss} aria-label="Dismiss" className="shrink-0 rounded-lg p-1 text-ink-soft hover:bg-white">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <Modal
        open={stepsOpen}
        onClose={() => setStepsOpen(false)}
        title="Install Westin on your iPhone"
        subtitle="Takes less than a minute — from Safari, Chrome or Edge."
      >
        <ol className="space-y-4">
          <Step n={1} icon={<Share size={14} />} title="Tap the Share button">
            The square with an arrow pointing up, in your browser&apos;s toolbar (bottom on Safari, top menu on Chrome).
          </Step>
          <Step n={2} icon={<Plus size={14} />} title="Tap “Add to Home Screen”">
            Scroll down the share sheet if you don&apos;t see it right away.
          </Step>
          <Step n={3} icon={<Smartphone size={14} />} title="Tap “Add”">
            A blue Westin icon appears on your Home Screen.
          </Step>
          <Step n={4} icon={<Smartphone size={14} />} title="Open Westin and log in">
            Open the app from your Home Screen — the installed app is separate from the browser, so you&apos;ll sign in
            once inside it.
          </Step>
          <Step n={5} icon={<Bell size={14} />} title="Enable notifications">
            When the banner appears, tap “Enable notifications” and allow when iPhone asks.
          </Step>
        </ol>
        <p className="mt-5 rounded-xl bg-primary-lighter/70 px-4 py-3 text-xs leading-relaxed text-ink-soft">
          Requires iOS 16.4 or later. If you previously denied the notification prompt, delete the Home Screen app and
          repeat these steps — iPhone won&apos;t ask again otherwise.
        </p>
      </Modal>
    </>
  )
}
