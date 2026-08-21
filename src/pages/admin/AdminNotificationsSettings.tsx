import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BellRing, Info } from 'lucide-react'
import { Header } from '../../components/Header'
import { Card } from '../../components/Card'
import { Toggle } from '../../components/Toggle'
import { Button } from '../../components/Button'
import { Skeleton } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { apiFetch, useApi } from '../../lib/api'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

interface SettingsPayload {
  receiveFromOtherAdmins: boolean
  // server may return snake_case as well
  receive_from_other_admins?: boolean
}

export function AdminNotificationsSettings() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const toast = useToast()
  const { data, error, loading, reload } = useApi<SettingsPayload>('admin-portal.session', '/api/notifications/settings')
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    const v = (data.receiveFromOtherAdmins ?? (data as any).receive_from_other_admins) as boolean | undefined
    setEnabled(Boolean(v))
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiFetch('/api/notifications/settings', {
        method: 'PUT',
        sessionKey: 'admin-portal.session',
        body: { receiveFromOtherAdmins: enabled },
      })
      toast.success('Notification preference saved.')
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : 'Could not save preference.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="My Notification Settings"
        subtitle="Control whether you receive broadcasts sent by other admins. Faculty targeting is not affected by this toggle."
        onMenuClick={openMenu}
        onToggleSidebar={toggleSidebar}
        collapsed={collapsed}
      />

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <BellRing size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Admin Broadcast Preference</h2>
            <p className="text-xs text-ink-soft">Stored in admin_notification_settings.receive_from_other_admins (default false).</p>
          </div>
        </div>

        {error && !data ? (
          <ErrorState message={error} onRetry={reload} compact />
        ) : loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : (
          <>
            <div className="divide-y divide-line rounded-xl border border-line bg-white">
              <Toggle
                label="Receive notifications sent by other admins"
                description="When another admin sends to “Other Admins”, include me. You never receive your own broadcasts."
                checked={enabled}
                onChange={setEnabled}
              />
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-ink-soft">
              <Info size={16} className="shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                This toggle does not affect faculty notifications. Supported browsers: Chrome/Edge/Firefox on desktop. iOS/Safari push is
                deferred for this rollout.
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={handleSave} loading={saving}>
                Save Preference
              </Button>
              {saved && (
                <span role="status" className="animate-fade-in text-sm font-medium text-success">
                  Saved ✓
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-ink">How it works</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-ink-soft">
          <li>All sends are resolved server-side; the frontend never decides the final recipient list.</li>
          <li>Admin broadcasts exclude the sender even if they opted in — you will not push-notify yourself.</li>
          <li>External IDs are `admin_&lt;users.id&gt;` and `faculty_&lt;users.id&gt;` via the shared `getOneSignalExternalId()` helper.</li>
          <li>Shared-browser isolation: logging in as a different user on the same device triggers `OneSignal.logout()` before `OneSignal.login(newExternalId)`.</li>
        </ul>
      </Card>
    </div>
  )
}
