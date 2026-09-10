import { useEffect, useState } from 'react'

// Tracks whether a CSS media query currently matches, staying in sync as the
// viewport changes (window resize, or a phone/tablet rotating) rather than
// only reading it once at mount -- used by LeadForm to decide whether the
// pool-detail fields are laid out in one column or two, and to size the
// step flow accordingly.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
