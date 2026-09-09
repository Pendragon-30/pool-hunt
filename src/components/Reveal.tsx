import type { ReactNode } from 'react'
import { useInView } from '../hooks/useInView'

// Thin wrapper around useInView for the common case: fade-and-rise a whole
// section in as it scrolls into view. `delay` (ms) lets a row of siblings
// stagger instead of all animating in at once.
export default function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li'
}) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <Tag
      ref={ref as any}
      className={`reveal ${inView ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
