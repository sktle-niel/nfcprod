import { useEffect, useState } from 'react'

function createRuns() {
  let newest = 0
  let controller: AbortController | null = null

  return {
    /** Begins a run. The one before it is aborted, and from now on only this one counts. */
    start() {
      controller?.abort()
      newest += 1
      controller = new AbortController()
      return { id: newest, signal: controller.signal }
    },
    /** The number of the newest run, without starting one. For work that must not interrupt a run, only follow it. */
    current(): number {
      return newest
    },
    /** False once a newer run has started, or the runs were stopped. */
    isNewest(id: number): boolean {
      return id === newest
    },
    /** Aborts the running one and makes every answer still on its way old news. */
    stop() {
      newest += 1
      controller?.abort()
      controller = null
    },
  }
}

/**
 * Numbered runs of async work where only the newest answer may change the screen: a late lookup for an old pin,
 * or a late search, must not overwrite a newer one. Leaving the screen stops the last run.
 */
export function useNewestRun() {
  const [runs] = useState(createRuns)
  useEffect(() => runs.stop, [runs])
  return runs
}
