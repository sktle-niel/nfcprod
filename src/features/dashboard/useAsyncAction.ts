import { useCallback, useState } from 'react'

export type Outcome<Value> = { ok: true; value: Value } | { ok: false; error: unknown }

/**
 * One piece of work a page starts (a save, a delete, an upload) and where it stands. `run` never throws: it gives back
 * the outcome, so a page decides what to do with a refusal. While it runs, `busy` is true; a failure stays in `error`
 * until the next run or `clear`. Two runs at once are allowed: `busy` is true until the last one is done.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<unknown>(null)

  const run = useCallback(async <Value>(work: () => Promise<Value>): Promise<Outcome<Value>> => {
    setPending((count) => count + 1)
    setError(null)
    try {
      return { ok: true, value: await work() }
    } catch (failure) {
      setError(failure)
      return { ok: false, error: failure }
    } finally {
      setPending((count) => count - 1)
    }
  }, [])
  const clear = useCallback(() => setError(null), [])

  return { run, busy: pending > 0, error, failed: error !== null, clear }
}
