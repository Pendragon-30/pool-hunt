import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/blog', label: 'Buying Guides' },
  { to: '/for-dealers', label: 'For Dealers' },
]

// Small flat wave mark -- plain navy square, no gradient -- used as the
// wordmark's icon. Kept deliberately simple/geometric rather than a
// gradient "badge" so it reads as a real mark rather than stock AI-landing-
// page decoration.
function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white ${className}`}>
      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
        <path d="M3 20c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
      </svg>
    </span>
  )
}

// Every page (home, blog, for-dealers) shares this header so navigation and
// branding stay identical across the site. The primary CTA always resolves
// to the lead form: on the home page it smooth-scrolls to it, from anywhere
// else it navigates home first and then scrolls once the section exists.
export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const goToForm = () => {
    setMenuOpen(false)
    if (location.pathname === '/') {
      document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    navigate('/')
    window.setTimeout(() => {
      document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        scrolled ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-white'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <BrandMark />
          <span className="truncate text-sm font-bold tracking-tight text-navy-900 sm:text-base">
            Design My Swimming Pool
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`transition-colors hover:text-navy-800 ${
                location.pathname.startsWith(link.to) ? 'text-navy-800' : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={goToForm}
            className="rounded-md bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Get My Free Quote
          </button>
        </nav>

        <button
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-navy-900 md:hidden"
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div
        className={`overflow-hidden border-t transition-all duration-300 md:hidden ${
          menuOpen ? 'max-h-64 border-slate-200' : 'max-h-0 border-transparent'
        }`}
      >
        <div className="flex flex-col gap-1 bg-white px-4 py-4 sm:px-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-navy-800"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={goToForm}
            className="mt-2 rounded-md bg-navy-900 px-5 py-2.5 text-center text-sm font-semibold text-white"
          >
            Get My Free Quote
          </button>
        </div>
      </div>
    </header>
  )
}
