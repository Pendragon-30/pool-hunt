import AdminGate from './AdminGate'
import PoolPhotosDashboard from './PoolPhotosDashboard'

export default function AdminPhotosPage() {
  return (
    <AdminGate>
      <PoolPhotosDashboard />
    </AdminGate>
  )
}
