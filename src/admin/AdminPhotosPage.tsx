import AdminGate from './AdminGate'
import InGroundPhotosDashboard from './InGroundPhotosDashboard'

// Rendered at /admin/photos/inground -- the first of the five Photos
// sub-tabs (Inground Pools, Above Ground Pools, Extras, Covers,
// Components). Kept as its own page component/filename for continuity with
// the top-level "Photos" admin route.
export default function AdminPhotosPage() {
  return (
    <AdminGate>
      <InGroundPhotosDashboard />
    </AdminGate>
  )
}
