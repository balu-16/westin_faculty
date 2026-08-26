import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar, type NavItem } from '../components/Sidebar'

export interface PortalLayoutContext {
  openMenu: () => void
  closeMenu: () => void
  toggleMenu: () => void
  isMenuOpen: boolean
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
  const [hovered, setHovered] = useState(false)
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

  useEffect(() => {
    setHovered(false)
  }, [collapsed, location.pathname])

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  const toggleSidebar = () => setCollapsed((v) => !v)
  const openMenu = () => setMenuOpen(true)
  const closeMenu = () => setMenuOpen(false)
  const toggleMenu = () => setMenuOpen((v) => !v)
  const context: PortalLayoutContext = { openMenu, closeMenu, toggleMenu, isMenuOpen: menuOpen, toggleSidebar, collapsed }

  const handleLogout = () => {
    onLogout()
    navigate(loginPath, { replace: true })
  }

  const effectiveCollapsed = collapsed && !hovered

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
        collapsed={effectiveCollapsed}
        onLogout={handleLogout}
        onToggleCollapsed={toggleSidebar}
        onHoverEnter={() => {
          if (collapsed) setHovered(true)
        }}
        onHoverLeave={() => setHovered(false)}
      />
      <div className={effectiveCollapsed ? 'lg:pl-[72px] transition-[padding] duration-300' : 'lg:pl-[280px] transition-[padding] duration-300'}>
        <main className="mx-auto w-full max-w-[1200px] animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
