import { LoginScreen } from '../shared/LoginScreen'
import { useAdminAuth } from '../../contexts/AdminAuthContext'

export function AdminLogin() {
  const { requestOtp, login, isAuthenticated } = useAdminAuth()

  return (
    <LoginScreen
      activePortal="admin"
      portalName="Admin Portal"
      heading="Admin Login"
      welcomeMessage="Sign in to access the Westin College administration dashboard — faculty, students, events and reports."
      idLabel="Admin ID / Email"
      idPlaceholder="e.g. ADM-2025-002"
      defaultPath="/admin"
      requestOtp={requestOtp}
      login={login}
      isAuthenticated={isAuthenticated}
    />
  )
}
