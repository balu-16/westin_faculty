import {
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import { PortalShell } from './PortalShell'
import { useFacultyAuth } from '../contexts/FacultyAuthContext'

export const facultyNavItems = [
  { label: 'Dashboard', to: '/faculty', icon: LayoutDashboard },
  { label: 'Timetable', to: '/faculty/timetable', icon: CalendarDays },
  { label: 'Attendance', to: '/faculty/attendance', icon: ClipboardCheck },
  { label: 'Sections', to: '/faculty/sections', icon: Layers },
  { label: 'Events', to: '/faculty/events', icon: CalendarClock },
  { label: 'Study Materials', to: '/faculty/materials', icon: FolderOpen },
  { label: 'Daily Reports', to: '/faculty/reports', icon: FileText },
  { label: 'Settings', to: '/faculty/settings', icon: Settings },
]

export function FacultyLayout() {
  const { isAuthenticated, user, logout } = useFacultyAuth()

  return (
    <PortalShell
      isAuthenticated={isAuthenticated}
      loginPath="/faculty/login"
      portalTitle="Faculty Portal"
      navItems={facultyNavItems}
      profileName={user?.name ?? ''}
      profileDetail={user ? `${user.department} • ${user.designation}` : ''}
      avatarUrl={user?.avatarUrl ?? null}
      onLogout={logout}
    />
  )
}
