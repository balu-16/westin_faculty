import {
  CalendarClock,
  CalendarDays,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react'
import { PortalShell } from './PortalShell'
import { useAdminAuth } from '../contexts/AdminAuthContext'

export const adminNavItems = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Teachers', to: '/admin/teachers', icon: Users },
  { label: 'Students', to: '/admin/students', icon: GraduationCap },
  { label: 'Sections', to: '/admin/sections', icon: Layers },
  { label: 'Timetable', to: '/admin/timetable', icon: CalendarDays },
  { label: 'Events', to: '/admin/events', icon: CalendarClock },
  { label: 'Study Materials', to: '/admin/materials', icon: FolderOpen },
  { label: 'Daily Reports', to: '/admin/reports', icon: FileText },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]

export function AdminLayout() {
  const { isAuthenticated, user, logout } = useAdminAuth()

  return (
    <PortalShell
      isAuthenticated={isAuthenticated}
      loginPath="/admin/login"
      portalTitle="Admin Portal"
      navItems={adminNavItems}
      profileName={user?.name ?? ''}
      profileDetail={user?.role ?? ''}
      onLogout={logout}
    />
  )
}
