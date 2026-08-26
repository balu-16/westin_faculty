import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FacultyAuthProvider, useFacultyAuth } from './contexts/FacultyAuthContext'
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext'
import { SectionsProvider } from './contexts/SectionsContext'
import { ToastProvider } from './components/Toast'
import { PageLoader } from './components/Loading'
import { FacultyLayout } from './layouts/FacultyLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { readLastActiveRole } from './lib/onesignal'

/* Route-level code splitting — every page is fetched as its own chunk on
 * navigation instead of being bundled into the entry. All pages use named
 * exports, so each lazy() maps the module to a default export. */
const FacultyLogin = lazy(() => import('./pages/faculty/FacultyLogin').then((m) => ({ default: m.FacultyLogin })))
const FacultyDashboard = lazy(() => import('./pages/faculty/FacultyDashboard').then((m) => ({ default: m.FacultyDashboard })))
const FacultyTimetable = lazy(() => import('./pages/faculty/FacultyTimetable').then((m) => ({ default: m.FacultyTimetable })))
const FacultyAttendance = lazy(() => import('./pages/faculty/FacultyAttendance').then((m) => ({ default: m.FacultyAttendance })))
const FacultySections = lazy(() => import('./pages/faculty/FacultySections').then((m) => ({ default: m.FacultySections })))
const FacultySectionDetail = lazy(() => import('./pages/faculty/FacultySectionDetail').then((m) => ({ default: m.FacultySectionDetail })))
const FacultyEvents = lazy(() => import('./pages/faculty/FacultyEvents').then((m) => ({ default: m.FacultyEvents })))
const FacultyMaterials = lazy(() => import('./pages/faculty/FacultyMaterials').then((m) => ({ default: m.FacultyMaterials })))
const FacultyReports = lazy(() => import('./pages/faculty/FacultyReports').then((m) => ({ default: m.FacultyReports })))
const FacultySettings = lazy(() => import('./pages/faculty/FacultySettings').then((m) => ({ default: m.FacultySettings })))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const AdminTeachers = lazy(() => import('./pages/admin/AdminTeachers').then((m) => ({ default: m.AdminTeachers })))
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents').then((m) => ({ default: m.AdminStudents })))
const AdminSections = lazy(() => import('./pages/admin/AdminSections').then((m) => ({ default: m.AdminSections })))
const AdminSectionDetail = lazy(() => import('./pages/admin/AdminSectionDetail').then((m) => ({ default: m.AdminSectionDetail })))
const AdminTimetable = lazy(() => import('./pages/admin/AdminTimetable').then((m) => ({ default: m.AdminTimetable })))
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents').then((m) => ({ default: m.AdminEvents })))
const AdminMaterials = lazy(() => import('./pages/admin/AdminMaterials').then((m) => ({ default: m.AdminMaterials })))
const AdminReports = lazy(() => import('./pages/admin/AdminReports').then((m) => ({ default: m.AdminReports })))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })))
const AdminNotificationsSend = lazy(() => import('./pages/admin/AdminNotificationsSend').then((m) => ({ default: m.AdminNotificationsSend })))
const AdminNotificationsTemplates = lazy(() => import('./pages/admin/AdminNotificationsTemplates').then((m) => ({ default: m.AdminNotificationsTemplates })))
const AdminNotificationsHistory = lazy(() => import('./pages/admin/AdminNotificationsHistory').then((m) => ({ default: m.AdminNotificationsHistory })))
const AdminNotificationsSettings = lazy(() => import('./pages/admin/AdminNotificationsSettings').then((m) => ({ default: m.AdminNotificationsSettings })))

/** Walker fallback for admin routes — the chunk load shows the section's own
 *  dedicated label, so it never fights the page's data-loading state. */
function AdminPageFallback({ label }: { label: string }) {
  return <PageLoader label={label} className="min-h-[60vh]" />
}

/** Same walker fallback for faculty routes. */
function FacultyPageFallback({ label }: { label: string }) {
  return <PageLoader label={label} className="min-h-[60vh]" />
}

/** Blocks authenticated faculty from seeing /faculty/login. Uses `replace`
 *  so the login entry is removed from history — back never lands on it. */
function FacultyGuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useFacultyAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/faculty'
  if (isAuthenticated) return <Navigate to={from} replace />
  return <>{children}</>
}

function AdminGuestOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  if (isAuthenticated) return <Navigate to={from} replace />
  return <>{children}</>
}

/** Requires faculty auth for /faculty/*. */
function RequireFacultyAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useFacultyAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/faculty/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

/** Requires admin auth for /admin/*. */
function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}

/** "/" is auth-aware: never exposes a login screen to an authenticated user.
 *  If either portal is authenticated we go to its dashboard (last-active role wins),
 *  otherwise to the faculty login (the default entry point). */
function RootRedirect() {
  const { isAuthenticated: isFaculty } = useFacultyAuth()
  const { isAuthenticated: isAdmin } = useAdminAuth()
  if (isFaculty && isAdmin) {
    const last = readLastActiveRole()
    if (last === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/faculty" replace />
  }
  if (isFaculty) return <Navigate to="/faculty" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return <Navigate to="/faculty/login" replace />
}

/** Catch-all is also auth-aware so unknown URLs never flash a login form. */
function CatchAllRedirect() {
  const { isAuthenticated: isFaculty } = useFacultyAuth()
  const { isAuthenticated: isAdmin } = useAdminAuth()
  // If any portal is authenticated, send to its home; otherwise to faculty login.
  // Using last-active role when both are authenticated mirrors RootRedirect.
  if (isFaculty || isAdmin) {
    const last = readLastActiveRole()
    if (last === 'admin' && isAdmin) return <Navigate to="/admin" replace />
    if (isFaculty) return <Navigate to="/faculty" replace />
    if (isAdmin) return <Navigate to="/admin" replace />
  }
  return <Navigate to="/faculty/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Faculty portal */}
      <Route
        path="/faculty/login"
        element={
          <FacultyGuestOnly>
            <Suspense fallback={<FacultyPageFallback label="Loading sign-in" />}>
              <FacultyLogin />
            </Suspense>
          </FacultyGuestOnly>
        }
      />
      <Route
        path="/faculty"
        element={
          <RequireFacultyAuth>
            <FacultyLayout />
          </RequireFacultyAuth>
        }
      >
        <Route index element={<Suspense fallback={<FacultyPageFallback label="Loading your dashboard" />}><FacultyDashboard /></Suspense>} />
        <Route path="timetable" element={<Suspense fallback={<FacultyPageFallback label="Fetching timetable" />}><FacultyTimetable /></Suspense>} />
        <Route path="attendance" element={<Suspense fallback={<FacultyPageFallback label="Fetching attendance" />}><FacultyAttendance /></Suspense>} />
        <Route path="sections" element={<Suspense fallback={<FacultyPageFallback label="Fetching sections" />}><FacultySections /></Suspense>} />
        <Route path="sections/:sectionId" element={<Suspense fallback={<FacultyPageFallback label="Loading section" />}><FacultySectionDetail /></Suspense>} />
        <Route path="events" element={<Suspense fallback={<FacultyPageFallback label="Fetching events" />}><FacultyEvents /></Suspense>} />
        <Route path="materials" element={<Suspense fallback={<FacultyPageFallback label="Fetching materials" />}><FacultyMaterials /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<FacultyPageFallback label="Fetching reports" />}><FacultyReports /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<FacultyPageFallback label="Loading settings" />}><FacultySettings /></Suspense>} />
      </Route>

      {/* Admin portal */}
      <Route
        path="/admin/login"
        element={
          <AdminGuestOnly>
            <Suspense fallback={<AdminPageFallback label="Loading sign-in" />}>
              <AdminLogin />
            </Suspense>
          </AdminGuestOnly>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdminAuth>
            <AdminLayout />
          </RequireAdminAuth>
        }
      >
        <Route index element={<Suspense fallback={<AdminPageFallback label="Loading your dashboard" />}><AdminDashboard /></Suspense>} />
        <Route path="teachers" element={<Suspense fallback={<AdminPageFallback label="Fetching teachers" />}><AdminTeachers /></Suspense>} />
        <Route path="students" element={<Suspense fallback={<AdminPageFallback label="Fetching students" />}><AdminStudents /></Suspense>} />
        <Route path="sections" element={<Suspense fallback={<AdminPageFallback label="Fetching sections" />}><AdminSections /></Suspense>} />
        <Route path="sections/:sectionId" element={<Suspense fallback={<AdminPageFallback label="Loading section" />}><AdminSectionDetail /></Suspense>} />
        <Route path="timetable" element={<Suspense fallback={<AdminPageFallback label="Fetching timetable" />}><AdminTimetable /></Suspense>} />
        <Route path="events" element={<Suspense fallback={<AdminPageFallback label="Fetching events" />}><AdminEvents /></Suspense>} />
        <Route path="materials" element={<Suspense fallback={<AdminPageFallback label="Fetching materials" />}><AdminMaterials /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<AdminPageFallback label="Fetching reports" />}><AdminReports /></Suspense>} />
        <Route path="notifications/send" element={<Suspense fallback={<AdminPageFallback label="Loading notifications" />}><AdminNotificationsSend /></Suspense>} />
        <Route path="notifications/templates" element={<Suspense fallback={<AdminPageFallback label="Fetching templates" />}><AdminNotificationsTemplates /></Suspense>} />
        <Route path="notifications/history" element={<Suspense fallback={<AdminPageFallback label="Fetching history" />}><AdminNotificationsHistory /></Suspense>} />
        <Route path="notifications/settings" element={<Suspense fallback={<AdminPageFallback label="Loading settings" />}><AdminNotificationsSettings /></Suspense>} />
        {/* Back-compat: /admin/notifications → send */}
        <Route path="notifications" element={<Suspense fallback={<AdminPageFallback label="Loading notifications" />}><AdminNotificationsSend /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<AdminPageFallback label="Loading settings" />}><AdminSettings /></Suspense>} />
      </Route>

      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  )
}

export default function App() {
  return (
    <FacultyAuthProvider>
      <AdminAuthProvider>
        <SectionsProvider>
          <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
        </SectionsProvider>
      </AdminAuthProvider>
    </FacultyAuthProvider>
  )
}
