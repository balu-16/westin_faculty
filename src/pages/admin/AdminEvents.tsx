import { ManageEvents } from '../shared/ManageEvents'

export function AdminEvents() {
  return (
    <ManageEvents
      scope="admin"
      ownerName="Admin"
      sessionKey="admin-portal.session"
      headerSubtitle="Manage the college event calendar shared across portals"
      listTitle="All Events"
    />
  )
}
