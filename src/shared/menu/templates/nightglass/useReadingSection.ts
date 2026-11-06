import { useEffect, useState } from 'react'

/**
 * The index of the section that is being read: the one whose top passed the line 35% down the screen most recently, or the last one
 * when the page is scrolled to its end (a short last section may never reach the line). Nearest the line, not last in the menu: on a
 * wide board two columns stand side by side, and the top of the second is not further on than the first (a tie goes to the earlier). It looks at every section on each scroll,
 * once per frame, so it is right after a jump too (the Home key, a tap with calm motion, a restored position). Watching only the
 * sections that cross a line would keep a stale answer after a jump back up. Without any layout (a test) it stays on the first.
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
      const tops = sections.map((id) => document.getElementById(id)?.getBoundingClientRect())
      // A page with no layout (a test, a hidden tab) has every box at zero: there is nothing to read.
      if (tops.every((box) => box === undefined || (box.top === 0 && box.height === 0))) return
      const line = window.innerHeight * 0.35
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      let found = 0
      let nearest = Number.NEGATIVE_INFINITY
      tops.forEach((box, index) => {
        if (box === undefined || box.top > line || box.top <= nearest) return
        nearest = box.top
        found = index
      })
      setActive(atEnd && window.scrollY > 0 ? sections.length - 1 : found)
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
