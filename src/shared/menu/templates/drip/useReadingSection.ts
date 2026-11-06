import { useEffect, useState } from 'react'

/**
 * The index of the section that is being read: the first one that has not yet ended above the line 35% down the screen, or the last
 * when the page is scrolled to its end. Asking where a section ends, not where it starts, also holds in the two columns of the
 * grid, where a later category starts higher up than an earlier one. It looks at every section on each scroll, once per frame, so
 * it is right after a jump too. Without any layout (a test) it stays on the first.
 */
export function useReadingSection(ids: readonly string[], enabled: boolean): number {
  const [active, setActive] = useState(0)
  const key = ids.join('|')

  useEffect(() => {
    if (!enabled || key === '' || typeof requestAnimationFrame !== 'function') return undefined
    const sections = key.split('|')
    let frame = 0
    const measure = () => {
      frame = 0
      const boxes = sections.map((id) => document.getElementById(id)?.getBoundingClientRect())
      if (boxes.every((box) => box === undefined || box.height === 0)) return
      const line = window.innerHeight * 0.35
      const atEnd = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      const found = boxes.findIndex((box) => box !== undefined && box.bottom > line)
      setActive(atEnd || found === -1 ? sections.length - 1 : found)
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [key, enabled])

  return Math.min(active, Math.max(0, ids.length - 1))
}
