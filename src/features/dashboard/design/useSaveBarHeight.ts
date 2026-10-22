import { useEffect, type RefObject } from 'react'

/** The custom property the page's scroll padding reads, so a focused field is never left under the sticky bar. */
export const SAVE_BAR_HEIGHT = '--save-bar-h'

/**
 * While the sticky save bar is on the page, `--save-bar-h` on the root is the room it takes from the bottom of the screen:
 * its height plus how far it floats above the edge. It follows the bar when the bar or the window changes size, and is
 * removed with the bar.
 */
export function useSaveBarHeight(bar: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = bar.current
    if (!element) return
    const root = document.documentElement

    const measure = () => {
      const lift = Number.parseFloat(getComputedStyle(element).bottom)
      root.style.setProperty(SAVE_BAR_HEIGHT, `${Math.ceil(element.offsetHeight + (Number.isFinite(lift) ? lift : 0))}px`)
    }
    measure()

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
      root.style.removeProperty(SAVE_BAR_HEIGHT)
    }
  }, [bar])
}
