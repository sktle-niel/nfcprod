import { useCallback, useEffect, useState } from 'react'

export type Resource<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T }

type Outcome<T> = { load: () => Promise<T>; attempt: number; result: { ok: true; value: T } | { ok: false } }

/**
 * Loads one thing and says where it stands. Pass a stable `load` (useCallback); a new one loads again.
 * `retry` tries again after a failure, and `replace` puts in a newer value without loading, for example
 * what a save sent back.
 */
export function useResource<T>(load: () => Promise<T>) {
  const [outcome, setOutcome] = useState<Outcome<T> | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    load().then(
      (value) => {
        if (live) setOutcome({ load, attempt, result: { ok: true, value } })
      },
      () => {
        if (live) setOutcome({ load, attempt, result: { ok: false } })
      },
    )
    return () => {
      live = false
    }
  }, [load, attempt])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  const replace = useCallback((value: T) => setOutcome({ load, attempt, result: { ok: true, value } }), [load, attempt])

  // Anything not from this exact load and attempt is stale: show loading instead of old data.
  const resource: Resource<T> =
    !outcome || outcome.load !== load || outcome.attempt !== attempt
      ? { status: 'loading' }
      : outcome.result.ok
        ? { status: 'ready', value: outcome.result.value }
        : { status: 'error' }

  return { resource, retry, replace }
}
