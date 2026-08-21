import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { BellRing, LogOut, ShieldCheck, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '../../components/Header'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { Toggle } from '../../components/Toggle'
import { Skeleton } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { Avatar } from '../../components/Avatar'
import { apiFetch, uploadBytes, useApi } from '../../lib/api'
import { useAdminAuth } from '../../contexts/AdminAuthContext'
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
  theme?: string
}

export function AdminSettings() {
  const { openMenu, toggleSidebar, collapsed } = useOutletContext<PortalLayoutContext>()
  const { user, logout, updateAvatar } = useAdminAuth()
  const navigate = useNavigate()
  const { data: settings, error, loading, reload } = useApi<SettingsPayload>(
    'admin-portal.session',
    '/api/settings',
  )
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [avatarSuccess, setAvatarSuccess] = useState('')

  const [pushEnabled, setPushEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [eventAlerts, setEventAlerts] = useState(true)
  const [reportDigest, setReportDigest] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!settings) return
    setPushEnabled(settings.push)
    setEmailEnabled(settings.email)
    setEventAlerts(settings.announcements)
    setReportDigest(settings.reminders)
  }, [settings])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/api/settings', {
        method: 'PATCH',
        sessionKey: 'admin-portal.session',
        body: {
          push: pushEnabled,
          email: emailEnabled,
          announcements: eventAlerts,
          reminders: reportDigest,
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
    navigate('/admin/login')
  }
  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return
    setAvatarError(''); setAvatarSuccess('')
    const allowed=['image/jpeg','image/png','image/webp']; if(!allowed.includes(file.type)){ setAvatarError('Only JPEG, PNG, WebP allowed'); if(fileRef.current) fileRef.current.value=''; return }
    if(file.size>5*1024*1024){ setAvatarError('Max 5 MB'); if(fileRef.current) fileRef.current.value=''; return }
    setAvatarUploading(true)
    try{
      const {url,path}=await apiFetch<{url:string;path:string}>('/api/profile/avatar/upload-url',{method:'POST',sessionKey:'admin-portal.session',body:{filename:file.name,contentType:file.type,size:file.size}})
      await uploadBytes(url,file,file.type)
      const res=await apiFetch<{avatarUrl:string|null;user:any}>('/api/profile/avatar',{method:'PATCH',sessionKey:'admin-portal.session',body:{path}})
      updateAvatar(res.avatarUrl ?? res.user?.avatarUrl ?? null); setAvatarSuccess('Profile picture updated'); setTimeout(()=>setAvatarSuccess(''),2000)
    }catch(err){ setAvatarError(err instanceof Error?err.message:'Upload failed')} finally{setAvatarUploading(false); if(fileRef.current) fileRef.current.value=''}
  }
  const handleAvatarRemove = async ()=>{
    setAvatarError(''); setAvatarSuccess(''); setAvatarUploading(true)
    try{await apiFetch('/api/profile/avatar',{method:'DELETE',sessionKey:'admin-portal.session'}); updateAvatar(null); setAvatarSuccess('Removed'); setTimeout(()=>setAvatarSuccess(''),2000)}
    catch(err){setAvatarError(err instanceof Error?err.message:'Could not remove')} finally{setAvatarUploading(false)}
  }

  return (
    <div className="space-y-6">
      <Header title="Settings" subtitle="Manage your account and preferences." onMenuClick={openMenu} onToggleSidebar={toggleSidebar} collapsed={collapsed} />

      {/* Profile */}
      <Card>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-dark">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-ink">Profile</h2>
            <p className="text-xs text-ink-soft">Your administrator identity on the portal.</p>
          </div>
        </div>
        {error && !settings ? (
          <ErrorState message={error} onRetry={reload} compact />
        ) : loading && !settings ? (
          <div role="status" aria-label="Loading settings" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
        ) : (
        <>
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-white p-4">
          <Avatar name={user?.name ?? ''} src={user?.avatarUrl ?? null} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Profile picture</p>
            <p className="text-xs text-ink-soft">JPEG, PNG or WebP — max 5 MB. Visible in sidebar.</p>
            {avatarError && <p role="alert" className="mt-1 text-xs font-medium text-danger">{avatarError}</p>}
            {avatarSuccess && <p role="status" className="mt-1 text-xs font-medium text-success">{avatarSuccess}</p>}
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleAvatarPick} />
            <Button variant="ghost" onClick={()=>fileRef.current?.click()} disabled={avatarUploading}>{avatarUploading ? 'Uploading…' : user?.avatarUrl ? 'Change' : 'Upload'}</Button>
            {user?.avatarUrl && <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={handleAvatarRemove} disabled={avatarUploading}>Remove</Button>}
          </div>
        </div>
        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Name" value={user?.name ?? '—'} />
            <Field label="Admin ID" value={user?.adminId ?? '—'} />
            <Field label="Email" value={user?.email ?? '—'} />
            <Field label="Role / Access Level" value={user?.role ?? '—'} />
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
        </>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Notifications */}
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">Notifications</h2>
            <Link to="/admin/notifications/settings" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark">
              <BellRing size={14} aria-hidden="true" />
              Notification Settings
            </Link>
          </div>
          <p className="mb-4 rounded-xl border border-line bg-amber-50 px-3 py-2 text-xs leading-relaxed text-ink-soft">
            Push via OneSignal (site https://westin-faculty.vercel.app). To receive admin broadcasts, enable it in{' '}
            <Link to="/admin/notifications/settings" className="font-semibold text-primary-dark hover:text-primary">Notifications → My Settings</Link>.
          </p>
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
              label="New event submissions"
              description="Alert me when faculty add or change events."
              checked={eventAlerts}
              onChange={setEventAlerts}
            />
            <Toggle
              label="Daily report digest"
              description="End-of-day summary of all submitted reports."
              checked={reportDigest}
              onChange={setReportDigest}
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

      <p className="flex items-center justify-center gap-2 pb-2 text-xs text-ink-soft/70">
        <User size={12} aria-hidden="true" />
        Signed in as {user?.name ?? '—'} • {user?.adminId ?? '—'}
      </p>
    </div>
  )
}
