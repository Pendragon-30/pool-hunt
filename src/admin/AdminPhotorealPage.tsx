import AdminGate from './AdminGate'
import AdminNav from './AdminNav'
import PhotorealPreviewDashboard from './PhotorealPreviewDashboard'

// Rendered at /admin/photoreal -- the admin-only review tool for the
// "hybrid" pool preview pipeline (live 3D scene captured as a guide image,
// then repainted photorealistically by Gemini). Kept separate from the
// /admin/photos/* pages: those manage a pre-generated STATIC grid of
// images; this is a one-at-a-time live review tool for a pipeline that
// isn't wired into the public site yet.
export default function AdminPhotorealPage() {
  return (
    <AdminGate>
      <div className="min-h-screen bg-slate-50">
        <AdminNav onRefresh={() => window.location.reload()} />
        <PhotorealPreviewDashboard />
      </div>
    </AdminGate>
  )
}
