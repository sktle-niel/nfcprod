import { useEffect, useReducer } from 'react'

// A timer holds at most 2^31 - 1 ms (about 24.8 days), so a longer wait is cut into steps.
const MAX_WAIT = 2_147_483_647

/** Renders the component again once the clock passes `at` (ms since the epoch). `null` waits for nothing. */
export function useTimeAt(at: number | null, now: () => number = Date.now): void {
  const [step, again] = useReducer((count: number) => count + 1, 0)
  useEffect(() => {
    if (at === null) return
    const left = at - now()
    // Already passed: nothing to wait for. Asking for another render here would loop for a caller that keeps passing a past moment.
    if (left <= 0) return
    const timer = setTimeout(again, Math.min(left, MAX_WAIT))
    return () => clearTimeout(timer)
  }, [at, now, step])
}
