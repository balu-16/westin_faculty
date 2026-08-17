import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar, type NavItem } from '../components/Sidebar'

export interface PortalLayoutContext {
  openMenu: () => void
}

interface PortalShellProps {
  isAuthenticated: boolean
  /** Where unauthenticated visitors get redirected */
  loginPath: string
  portalTitle: string
  navItems: NavItem[]
  profileName: string
  profileDetail: string
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
  onLogout,
}: PortalShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
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

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />
  }

  const context: PortalLayoutContext = { openMenu: () => setMenuOpen(true) }

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
        onLogout={handleLogout}
      />
      <div className="lg:pl-[264px]">
        <main className="mx-auto w-full max-w-[1200px] animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
