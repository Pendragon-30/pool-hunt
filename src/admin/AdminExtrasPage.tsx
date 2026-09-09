import AdminGate from './AdminGate'
import FunExtrasDashboard from './FunExtrasDashboard'

export default function AdminExtrasPage() {
  return (
    <AdminGate>
      <FunExtrasDashboard />
    </AdminGate>
  )
}
