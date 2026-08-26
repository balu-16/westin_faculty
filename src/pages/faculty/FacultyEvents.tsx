import { ManageEvents } from '../shared/ManageEvents'
import { useFacultyAuth } from '../../contexts/FacultyAuthContext'

export function FacultyEvents() {
  const { user } = useFacultyAuth()

  return (
    <ManageEvents
      scope="faculty"
      ownerName={user?.name ?? ''}
      ownerId={user?.id}
      sessionKey="faculty-portal.session"
      headerSubtitle="Create and manage events for your classes"
      listTitle="My Events"
      loadingLabel="Fetching events"
    />
  )
}
