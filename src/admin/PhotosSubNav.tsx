import { Link, useLocation } from 'react-router-dom'

const SUB_TABS = [
  { label: 'Inground Pools', path: '/admin/photos/inground' },
  { label: 'Above Ground Pools', path: '/admin/photos/above-ground' },
  { label: 'Extras', path: '/admin/photos/extras' },
  { label: 'Covers', path: '/admin/photos/covers' },
  { label: 'Components', path: '/admin/photos/components' },
]

// Second-level nav shown under the top "Photos" admin tab, splitting the
// different generated-image categories out into their own screens.
export default function PhotosSubNav() {
  const location = useLocation()

  return (
    <div className="border-b bg-white px-6">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto">
        {SUB_TABS.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${
              location.pathname === tab.path
                ? 'border-sky-700 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
