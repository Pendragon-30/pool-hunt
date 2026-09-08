import AdminGate from './AdminGate'
import LeadsDashboard from './LeadsDashboard'

export default function AdminPage() {
  return (
    <AdminGate>
      <LeadsDashboard />
    </AdminGate>
  )
}
