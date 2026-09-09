import AdminGate from './AdminGate'
import ExtrasDashboard from './ExtrasDashboard'

// Rendered at /admin/photos/extras, one of the five Photos sub-tabs.
export default function AdminExtrasPage() {
  return (
    <AdminGate>
      <ExtrasDashboard />
    </AdminGate>
  )
}
