import { useEffect, useRef, useState } from 'react'

// Minimal, dependency-free scroll-reveal primitive: watches one element and
// flips to `true` the first time it crosses into the viewport, then
// disconnects -- sections animate in once as the visitor scrolls down the
// page and never re-trigger on scroll-back-up, which reads as intentional
// rather than jittery.
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // IntersectionObserver is available in every browser this site targets,
    // but fail safe rather than leave a section permanently invisible if
    // it's ever missing.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}
