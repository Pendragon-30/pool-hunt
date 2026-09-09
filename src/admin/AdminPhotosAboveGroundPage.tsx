import AdminGate from './AdminGate'
import AboveGroundPhotosDashboard from './AboveGroundPhotosDashboard'

export default function AdminPhotosAboveGroundPage() {
  return (
    <AdminGate>
      <AboveGroundPhotosDashboard />
    </AdminGate>
  )
}
