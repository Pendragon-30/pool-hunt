import AdminGate from './AdminGate'
import DealersDashboard from './DealersDashboard'

export default function AdminDealersPage() {
  return (
    <AdminGate>
      <DealersDashboard />
    </AdminGate>
  )
}
