import { Link } from 'react-router-dom'

// Shared dark-navy footer for every page. Kept intentionally simple --
// sitemap links plus a one-line trust statement -- since there's no real
// business address/phone to put here yet; nothing here is fabricated
// contact info or claimed certifications.
export default function SiteFooter() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-navy-100">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-800 text-white">
                <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 16c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
                  <path d="M3 20c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" />
                </svg>
              </span>
              <span className="text-base font-bold text-white">Design My Swimming Pool</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              A simpler way to shop for a pool: tell us what you want once, and a reputable local
              builder brings the quote to you — free, and with no obligation to buy.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-400">Homeowners</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/" className="transition-colors hover:text-white">
                  Get a free quote
                </Link>
              </li>
              <li>
                <Link to="/blog" className="transition-colors hover:text-white">
                  Buying guides
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-navy-400">Builders</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/for-dealers" className="transition-colors hover:text-white">
                  Partner with us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-navy-800 pt-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Design My Swimming Pool. All rights reserved.</p>
          <p>Every quote is free — dealers pay us, not you.</p>
        </div>
      </div>
    </footer>
  )
}
