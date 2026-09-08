import AdminGate from './AdminGate'
import BlogDashboard from './BlogDashboard'

export default function AdminBlogPage() {
  return (
    <AdminGate>
      <BlogDashboard />
    </AdminGate>
  )
}
