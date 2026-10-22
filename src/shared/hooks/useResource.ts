import { useCallback, useEffect, useState } from 'react'

export type Resource<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T }

type Outcome<T> = { load: () => Promise<T>; attempt: number; result: { ok: true; value: T } | { ok: false } }

/** A new value, or a function that makes it from the value in place when the call is applied (T must not be a function). */
export type Replacement<T> = T | ((current: T) => T)

/**
 * Loads one thing and says where it stands. Pass a stable `load` (useCallback); a new one loads again.
 * `retry` tries again after a failure, and `replace` puts in a newer value without loading, for example
 * what a save sent back. Given a function, `replace` builds on the newest value, also when two replies land before a
 * render, and does nothing when that value is gone (a newer load or a retry started, or nothing is loaded).
 * `retrying` is true while a retry after a failure is on its way.
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
  const replace = useCallback(
    (next: Replacement<T>) =>
      setOutcome((previous) => {
        if (typeof next !== 'function') return { load, attempt, result: { ok: true, value: next } }
        // A reply to a call made before a retry or a new load must not land on what that load brought.
        if (!previous || previous.load !== load || previous.attempt !== attempt || !previous.result.ok) return previous
        return { load, attempt, result: { ok: true, value: (next as (current: T) => T)(previous.result.value) } }
      }),
    [load, attempt],
  )

  // Anything not from this exact load and attempt is stale: show loading instead of old data.
  const current = outcome !== null && outcome.load === load && outcome.attempt === attempt
  const resource: Resource<T> = !current
    ? { status: 'loading' }
    : outcome.result.ok
      ? { status: 'ready', value: outcome.result.value }
      : { status: 'error' }
  const retrying = !current && outcome !== null && outcome.load === load && !outcome.result.ok

  return { resource, retry, replace, retrying }
}
