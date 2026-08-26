import { ManageMaterials } from '../shared/ManageMaterials'

export function FacultyMaterials() {
  return (
    <ManageMaterials
      headerSubtitle="Upload and manage study materials shared with your students"
      sessionKey="faculty-portal.session"
      loadingLabel="Fetching materials"
    />
  )
}
