import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FacultyAuthProvider } from './contexts/FacultyAuthContext'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import { SectionsProvider } from './contexts/SectionsContext'
import { ToastProvider } from './components/Toast'
import { PageLoader, Spinner } from './components/Loading'
import { FacultyLayout } from './layouts/FacultyLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { ErrorBoundary } from './components/ErrorBoundary'

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

/** Lightweight full-page spinner for the standalone login screens (no shell). */
function LoginFallback() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-screen items-center justify-center bg-page">
      <Spinner size={28} />
    </div>
  )
}

/** Inline fallback for pages rendered inside the portal shells — only the
 *  outlet area is replaced, so the sidebar/header never repaints. */
function PageFallback() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-[60vh] items-center justify-center">
      <Spinner size={24} />
    </div>
  )
}

/** Walker fallback for admin routes — the chunk load shows the section's own
 *  dedicated label, so it never fights the page's data-loading state. */
function AdminPageFallback({ label }: { label: string }) {
  return <PageLoader label={label} className="min-h-[60vh]" />
}

export default function App() {
  return (
    <FacultyAuthProvider>
      <AdminAuthProvider>
        <SectionsProvider>
          <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
            <Routes>
              {/* No landing page — login is the first screen for both portals */}
              <Route path="/" element={<Navigate to="/faculty/login" replace />} />

              {/* Faculty portal */}
              <Route
                path="/faculty/login"
                element={
                  <Suspense fallback={<LoginFallback />}>
                    <FacultyLogin />
                  </Suspense>
                }
              />
              <Route path="/faculty" element={<FacultyLayout />}>
                <Route index element={<Suspense fallback={<PageFallback />}><FacultyDashboard /></Suspense>} />
                <Route path="timetable" element={<Suspense fallback={<PageFallback />}><FacultyTimetable /></Suspense>} />
                <Route path="attendance" element={<Suspense fallback={<PageFallback />}><FacultyAttendance /></Suspense>} />
                <Route path="sections" element={<Suspense fallback={<PageFallback />}><FacultySections /></Suspense>} />
                <Route path="sections/:sectionId" element={<Suspense fallback={<PageFallback />}><FacultySectionDetail /></Suspense>} />
                <Route path="events" element={<Suspense fallback={<PageFallback />}><FacultyEvents /></Suspense>} />
                <Route path="materials" element={<Suspense fallback={<PageFallback />}><FacultyMaterials /></Suspense>} />
                <Route path="reports" element={<Suspense fallback={<PageFallback />}><FacultyReports /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageFallback />}><FacultySettings /></Suspense>} />
              </Route>

              {/* Admin portal */}
              <Route
                path="/admin/login"
                element={
                  <Suspense fallback={<AdminPageFallback label="Loading sign-in" />}>
                    <AdminLogin />
                  </Suspense>
                }
              />
              <Route path="/admin" element={<AdminLayout />}>
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

              <Route path="*" element={<Navigate to="/faculty/login" replace />} />
            </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
        </SectionsProvider>
      </AdminAuthProvider>
    </FacultyAuthProvider>
  )
}
