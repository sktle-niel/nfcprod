import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyState = 'idle' | 'copied' | 'failed'

/** How long the answer stays, so the message does not go stale. */
export const COPY_RESET_MS = 4000
/**
 * The pause between clearing the old answer and writing the new one. A live region speaks a change of its text, so a
 * second press must change it: the text is emptied first, and set again after this pause.
 */
export const COPY_GAP_MS = 150

/**
 * Copies `value` to the clipboard and says how it went. The answer belongs to the value that was copied: when the value
 * changes (the owner changed the link), it goes back to idle. It also goes back to idle after a few seconds, and every
 * press empties it before it answers again, so a screen reader hears every press.
 */
export function useCopyToClipboard(value: string) {
  const [result, setResult] = useState<{ value: string; state: 'copied' | 'failed' } | null>(null)
  const press = useRef(0)
  const gap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (result === null) return
    const timer = setTimeout(() => setResult(null), COPY_RESET_MS)
    return () => clearTimeout(timer)
  }, [result])

  // A press that is still waiting for the clipboard, or for the pause, must not answer after the page is gone.
  useEffect(
    () => () => {
      press.current += 1
      clearTimeout(gap.current)
    },
    [],
  )

  const copyValue = useCallback(async () => {
    const mine = ++press.current
    clearTimeout(gap.current)
    setResult(null)
    let state: 'copied' | 'failed' = 'copied'
    try {
      // The clipboard is missing outside secure pages and can be refused, and both end here.
      await navigator.clipboard.writeText(value)
    } catch {
      state = 'failed'
    }
    if (mine !== press.current) return
    gap.current = setTimeout(() => setResult({ value, state }), COPY_GAP_MS)
  }, [value])

  const state: CopyState = result?.value === value ? result.state : 'idle'
  return { state, copy: copyValue }
}
