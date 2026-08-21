import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar, type NavItem } from '../components/Sidebar'

export interface PortalLayoutContext {
  openMenu: () => void
  toggleSidebar: () => void
  collapsed: boolean
}

interface PortalShellProps {
  isAuthenticated: boolean
  /** Where unauthenticated visitors get redirected */
  loginPath: string
  portalTitle: string
  navItems: NavItem[]
  profileName: string
  profileDetail: string
  avatarUrl?: string | null
  onLogout: () => void
}

/** Sidebar + content frame shared by the faculty and admin portals. */
export function PortalShell({
  isAuthenticated,
  loginPath,
  portalTitle,
  navItems,
  profileName,
  profileDetail,
  avatarUrl,
  onLogout,
}: PortalShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const key = `${portalTitle.toLowerCase().replace(/\s+/g, '-')}.sidebarCollapsed`
      return localStorage.getItem(key) === 'true'
    } catch {
      return false
    }
  })
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    try {
      const key = `${portalTitle.toLowerCase().replace(/\s+/g, '-')}.sidebarCollapsed`
      localStorage.setItem(key, String(collapsed))
    } catch {}
  }, [collapsed, portalTitle])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  const toggleSidebar = () => setCollapsed((v) => !v)
  const context: PortalLayoutContext = { openMenu: () => setMenuOpen(true), toggleSidebar, collapsed }

  const handleLogout = () => {
    onLogout()
    navigate(loginPath)
  }

  return (
    <div className="min-h-screen bg-page">
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        portalTitle={portalTitle}
        navItems={navItems}
        profileName={profileName}
        profileDetail={profileDetail}
        avatarUrl={avatarUrl}
        collapsed={collapsed}
        onLogout={handleLogout}
      />
      <div className={collapsed ? 'lg:pl-[88px]' : 'lg:pl-[288px]'}>
        <main className="mx-auto w-full max-w-[1200px] animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
