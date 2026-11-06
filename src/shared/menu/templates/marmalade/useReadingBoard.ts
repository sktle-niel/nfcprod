import { useEffect, useState } from 'react'

/**
 * The index of the board being read: the last one whose top has passed the line 35% down the screen, or the last one at the end of
 * the page (a short last board may never reach the line). It measures every board on each scroll, once per frame, so it is right
 * after a jump too; watching only what crosses a line would keep a stale answer after a jump back up. Without layout (a test) it
 * stays on the first.
 */
export function useReadingBoard(ids: readonly string[], enabled: boolean): number {
  const [active, setActive] = useState(0)
  const key = ids.join('|')

  useEffect(() => {
    if (!enabled || key === '' || typeof requestAnimationFrame !== 'function') return undefined
    const boards = key.split('|')
    let frame = 0
    const measure = () => {
      frame = 0
      const boxes = boards.map((id) => document.getElementById(id)?.getBoundingClientRect())
      if (boxes.every((box) => box === undefined || (box.top === 0 && box.height === 0))) return
      const line = window.innerHeight * 0.35
      const atEnd = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      setActive(atEnd ? boards.length - 1 : boxes.reduce((found, box, index) => (box !== undefined && box.top <= line ? index : found), 0))
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
