import AdminGate from './AdminGate'
import CoversDashboard from './CoversDashboard'

export default function AdminPhotosCoversPage() {
  return (
    <AdminGate>
      <CoversDashboard />
    </AdminGate>
  )
}
