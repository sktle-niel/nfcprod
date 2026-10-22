import { useEffect, useRef, type RefObject } from 'react'
import type { FocusRequest, TabName } from './useDesignDraft'

// A field that is refused, or the picture group of the logo (a group cannot say aria-invalid, so it says data-invalid).
const INVALID = '[aria-invalid="true"],[data-invalid="true"]'

/**
 * When the draft is refused, shows the tab with the problem and puts the focus on its first invalid field. The focus waits
 * for the tab to be on screen, because a hidden field cannot take it.
 */
export function useFocusFirstError(
  request: FocusRequest | null,
  tab: TabName,
  setTab: (tab: TabName) => void,
  root: RefObject<HTMLElement | null>,
) {
  const waiting = useRef(false)

  useEffect(() => {
    if (request === null) return
    waiting.current = true
    setTab(request.tab)
  }, [request, setTab])

  useEffect(() => {
    if (!waiting.current || request === null || request.tab !== tab) return
    waiting.current = false
    const invalid = Array.from(root.current?.querySelectorAll<HTMLElement>(INVALID) ?? [])
    invalid.find((field) => field.closest('[hidden]') === null)?.focus()
  }, [request, tab, root])
}
