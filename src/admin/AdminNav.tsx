import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const TABS = [
  { label: 'Leads', path: '/admin' },
  { label: 'Dealers', path: '/admin/dealers' },
  { label: 'Blog', path: '/admin/blog' },
  { label: 'Pool Photos', path: '/admin/photos' },
  { label: 'Fun Extras', path: '/admin/extras' },
]

export default function AdminNav({ onRefresh }: { onRefresh: () => void }) {
  const location = useLocation()

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="border-b bg-white px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-base font-bold text-sky-700 hover:text-sky-800">
            Design My Swimming Pool
          </Link>
          <nav className="flex items-center gap-4">
            {TABS.map((tab) => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`text-sm font-semibold ${
                  location.pathname === tab.path
                    ? 'text-sky-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            onClick={signOut}
            className="rounded-lg border px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
