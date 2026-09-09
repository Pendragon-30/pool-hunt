import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/blog', label: 'Buying Guides' },
  { to: '/for-dealers', label: 'For Dealers' },
]

// Small wave-in-a-drop mark used as the wordmark's icon -- deliberately
// generic/geometric rather than a literal pool photo, so it reads crisply
// at 32px and works on both the light header and the dark footer.
function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-navy-700 text-white shadow-sm ${className}`}
    >
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 16c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
        <path d="M3 20c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
        <path d="M12 3v9" />
        <path d="M8.5 8.5 12 12l3.5-3.5" />
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
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-slate-200 bg-white/90 shadow-sm backdrop-blur'
          : 'border-transparent bg-white/70 backdrop-blur'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-base font-bold leading-tight tracking-tight text-navy-900 sm:text-lg">
            Design My<br className="hidden sm:block" /> Swimming Pool
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
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
            className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-navy-800 hover:shadow-md active:translate-y-0"
          >
            Get My Free Quote
          </button>
        </nav>

        <button
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-navy-900 md:hidden"
        >
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 md:hidden ${
          menuOpen ? 'max-h-64 border-t border-slate-200' : 'max-h-0'
        }`}
      >
        <div className="flex flex-col gap-1 bg-white px-6 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-navy-800"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={goToForm}
            className="mt-2 rounded-full bg-navy-900 px-5 py-2.5 text-center text-sm font-semibold text-white"
          >
            Get My Free Quote
          </button>
        </div>
      </div>
    </header>
  )
}
