import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Briefcase, LogOut, User } from 'lucide-react'
import { Header } from '../../components/Header'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Toggle } from '../../components/Toggle'
import { Skeleton } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { apiFetch, useApi } from '../../lib/api'
import { useFacultyAuth } from '../../contexts/FacultyAuthContext'
import { useSections } from '../../contexts/SectionsContext'
import type { PortalLayoutContext } from '../../layouts/PortalShell'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <p className="mt-1 rounded-xl border border-line bg-primary-lighter/60 px-4 py-2.5 text-sm font-semibold text-ink">
        {value}
      </p>
    </div>
  )
}

interface SettingsPayload {
  push: boolean
  email: boolean
  announcements: boolean
  reminders: boolean
  theme: string
}

export function FacultySettings() {
  const { openMenu } = useOutletContext<PortalLayoutContext>()
  const { user, logout } = useFacultyAuth()
  const { sections } = useSections()
  const navigate = useNavigate()
  const { data: settings, error, loading, reload } = useApi<SettingsPayload>(
    'faculty-portal.session',
    '/api/settings',
  )

  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [announcementsOn, setAnnouncementsOn] = useState(true)
  const [reportReminders, setReportReminders] = useState(true)
  const [lightTheme, setLightTheme] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!settings) return
    setPushEnabled(settings.push)
    setEmailEnabled(settings.email)
    setAnnouncementsOn(settings.announcements)
    setReportReminders(settings.reminders)
    setLightTheme((settings.theme ?? 'light') === 'light')
  }, [settings])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/api/settings', {
        method: 'PATCH',
        sessionKey: 'faculty-portal.session',
        body: {
          push: pushEnabled,
          email: emailEnabled,
          announcements: announcementsOn,
          reminders: reportReminders,
          theme: lightTheme ? 'light' : 'dark',
        },
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/faculty/login')
  }

  return (
    <div className="space-y-6">
      <Header title="Settings" subtitle="Manage your account and preferences." onMenuClick={openMenu} />

      {/* Profile */}
      <Card>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <Briefcase size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Profile</h2>
            <p className="text-xs text-ink-soft">Your faculty identity on the portal.</p>
          </div>
        </div>
        {error && !settings ? (
          <ErrorState message={error} onRetry={reload} compact />
        ) : loading && !settings ? (
          <div role="status" aria-label="Loading settings" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        ) : (
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Name" value={user?.name ?? '—'} />
            <Field label="Faculty ID" value={user?.facultyId ?? '—'} />
            <Field label="Email" value={user?.email ?? '—'} />
            <Field label="Department" value={user?.department ?? '—'} />
            <Field label="Designation" value={user?.designation ?? '—'} />
            <Field
              label="Sections Assigned"
              value={sections.length > 0 ? sections.map((s) => s.name).join(' • ') : '—'}
            />
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
            {saved && (
              <span role="status" className="animate-fade-in text-sm font-medium text-success">
                Changes saved ✓
              </span>
            )}
          </div>
        </form>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Notifications */}
        <Card>
          <h2 className="mb-4 text-base font-semibold text-ink">Notifications</h2>
          <div className="divide-y divide-line">
            <Toggle
              label="Push notifications"
              description="Receive alerts on your device."
              checked={pushEnabled}
              onChange={setPushEnabled}
            />
            <Toggle
              label="Email notifications"
              description="Get updates delivered to your inbox."
              checked={emailEnabled}
              onChange={setEmailEnabled}
            />
            <Toggle
              label="Announcements"
              description="Exam schedules, events and college news."
              checked={announcementsOn}
              onChange={setAnnouncementsOn}
            />
            <Toggle
              label="Daily report reminders"
              description="Remind me before the 6:00 PM deadline."
              checked={reportReminders}
              onChange={setReportReminders}
            />
          </div>
        </Card>

        {/* Appearance + Security */}
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Appearance</h2>
            <div className="divide-y divide-line">
              <Toggle
                label="Light theme"
                description="The portal uses a light sky-blue theme by default."
                checked={lightTheme}
                onChange={setLightTheme}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-ink">Security</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="ghost" onClick={handleLogout} className="text-danger hover:bg-danger/10 hover:text-danger">
                <LogOut size={16} aria-hidden="true" />
                Logout
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <p className="flex items-center justify-center gap-2 pb-2 text-xs text-ink-soft/70">
        <User size={12} aria-hidden="true" />
        Signed in as {user?.name ?? '—'} • {user?.facultyId ?? '—'}
      </p>
    </div>
  )
}
