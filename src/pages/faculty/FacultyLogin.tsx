import { LoginScreen } from '../shared/LoginScreen'
import { useFacultyAuth } from '../../contexts/FacultyAuthContext'

export function FacultyLogin() {
  const { requestOtp, login, isAuthenticated } = useFacultyAuth()

  return (
    <LoginScreen
      activePortal="faculty"
      portalName="Faculty Portal"
      heading="Faculty Login"
      welcomeMessage="Sign in to access your Westin College teaching dashboard — timetable, attendance, materials and daily reports."
      idLabel="Faculty ID / Email"
      idPlaceholder="e.g. FAC-2025-014"
      defaultPath="/faculty"
      requestOtp={requestOtp}
      login={login}
      isAuthenticated={isAuthenticated}
    />
  )
}
