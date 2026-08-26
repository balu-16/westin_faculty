import { ManageMaterials } from '../shared/ManageMaterials'

export function AdminMaterials() {
  return (
    <ManageMaterials
      headerSubtitle="Oversee study materials shared across all subjects"
      sessionKey="admin-portal.session"
      loadingLabel="Fetching materials"
    />
  )
}
