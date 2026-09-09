import AdminGate from './AdminGate'
import ComponentsDashboard from './ComponentsDashboard'

export default function AdminPhotosComponentsPage() {
  return (
    <AdminGate>
      <ComponentsDashboard />
    </AdminGate>
  )
}
