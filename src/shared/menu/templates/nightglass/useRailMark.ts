import { useLayoutEffect, type RefObject } from 'react'

/**
 * Lays the mark of the rail under the word of the link at `active`: one line that travels from word to word, so the eye follows the
 * reading place along the rail. It is a line 1px wide stretched by a transform, so nothing lays out as it moves. The first placing does
 * not travel; after it the stylesheet may, once `moves` lets it (never in the preview). A word that changes width (the font arriving, a
 * turned phone) moves the mark with it.
 */
export function useRailMark(row: RefObject<HTMLElement | null>, mark: RefObject<HTMLElement | null>, active: number, moves: boolean) {
  useLayoutEffect(() => {
    const item = row.current?.children[active]
    const line = mark.current
    const word = item?.firstElementChild
    if (!(item instanceof HTMLElement) || !(word instanceof HTMLElement) || line === null) return undefined
    const place = () => {
      const inset = Number.parseFloat(getComputedStyle(word).paddingLeft) || 0
      line.style.setProperty('transform', `translateX(${item.offsetLeft + inset}px) scaleX(${Math.max(item.offsetWidth - inset * 2, 0)})`)
    }
    place()
    if (moves && !line.hasAttribute('data-placed')) {
      // Fixes the first place before transitions turn on: set together, the line would slide in from the left edge.
      line.getBoundingClientRect()
      line.setAttribute('data-placed', '')
    }
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(place)
    observer.observe(item)
    return () => observer.disconnect()
  }, [row, mark, active, moves])
}
