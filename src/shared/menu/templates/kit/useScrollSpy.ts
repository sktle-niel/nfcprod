import { useEffect, useState } from 'react'

/**
 * The index of the section that is being read: the last one whose top has passed the upper part of the screen. For the
 * templates whose category links light up as the page scrolls. Without IntersectionObserver (a test) it stays on the first.
 */
export function useScrollSpy(ids: readonly string[], enabled = true): number {
  const [active, setActive] = useState(0)
  const key = ids.join('|')

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return undefined
    const sections = key === '' ? [] : key.split('|').map((id) => document.getElementById(id))
    const above = new Set<number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = sections.indexOf(entry.target as HTMLElement)
          if (index === -1) continue
          // A section is "passed" once its top is above the line 35% down the screen.
          if (entry.boundingClientRect.top <= window.innerHeight * 0.35) above.add(index)
          else above.delete(index)
        }
        setActive(above.size === 0 ? 0 : Math.max(...above))
      },
      { rootMargin: '0px 0px -65% 0px', threshold: [0, 1] },
    )
    for (const section of sections) if (section) observer.observe(section)
    return () => observer.disconnect()
  }, [key, enabled])

  return Math.min(active, Math.max(0, ids.length - 1))
}
