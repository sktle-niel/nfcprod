import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'

/**
 * True once the element has come near the screen, and from then on. Where the browser cannot tell (no IntersectionObserver,
 * as in tests), it is true at once, so the content is never missing.
 */
export function useSeen(ref: RefObject<HTMLElement | null>): boolean {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (seen || !element) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setSeen(true)
        observer.disconnect()
      },
      { rootMargin: '240px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, seen])
  return seen
}

/**
 * How much a page drawn `width` pixels wide must shrink to fit the element's width. It follows the element as it resizes;
 * where the browser cannot measure (no ResizeObserver), it keeps `fallback`.
 */
export function useFitScale(ref: RefObject<HTMLElement | null>, width: number, fallback: number): number {
  const [scale, setScale] = useState(fallback)
  // Measured before the first paint, so the menu never shows at the wrong size first; then kept up as the box resizes.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const fit = (box: number) => {
      if (box > 0) setScale(box / width)
    }
    fit(element.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => fit(entries[0]?.contentRect.width ?? 0))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, width])
  return scale
}
