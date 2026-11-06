import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Keeps the mark of the tab row under the tab being read. The row paints the mark itself from --tpl-mark-x and --tpl-mark-width. It
 * glides only once the reader has moved (`data-moved`), so it never sweeps in at page load, and it never does in the preview. It
 * measures again when a tab changes size, which a late font does.
 */
export function useTabMark(row: RefObject<HTMLElement | null>, active: number, interactive: boolean) {
  const shown = useRef(active)
  useLayoutEffect(() => {
    const list = row.current
    if (list === null) return undefined
    const place = () => {
      const tab = list.children[active]
      if (!(tab instanceof HTMLElement)) return
      list.style.setProperty('--tpl-mark-x', String(tab.offsetLeft))
      list.style.setProperty('--tpl-mark-width', String(tab.offsetWidth))
    }
    if (interactive && shown.current !== active) list.setAttribute('data-moved', '')
    shown.current = active
    place()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(place)
    for (const tab of list.children) observer.observe(tab)
    return () => observer.disconnect()
  }, [row, active, interactive])
}
