import { useCallback, useEffect, useRef, type RefObject } from 'react'

/** A selector for `[name="value"]`, with the quotes in the value made harmless. */
export function byAttr(name: string, value: string): string {
  return `[${name}="${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"]`
}

/**
 * Puts focus on a control once the page has drawn the change that just happened (a row moved, an item deleted). The page
 * moves nodes around, and the browser drops focus from a node that moved, so the control is found again by its selector.
 * `request` takes selectors in order of preference; the first enabled match gets focus.
 */
export function usePendingFocus(root: RefObject<HTMLElement | null>) {
  const wanted = useRef<string[] | null>(null)

  useEffect(() => {
    const selectors = wanted.current
    if (!selectors) return
    wanted.current = null
    for (const selector of selectors) {
      const found = root.current?.querySelector(selector)
      if (found instanceof HTMLElement && !(found instanceof HTMLButtonElement && found.disabled)) {
        found.focus()
        return
      }
    }
  })

  return useCallback((...selectors: string[]) => {
    wanted.current = selectors
  }, [])
}
