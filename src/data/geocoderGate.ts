/** What a caller that gave up sees: its own reason when that is an error, else the usual abort error. */
export function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new DOMException('The operation was aborted.', 'AbortError')
}

/** A line for turns. Whoever is first in line starts first, and starts are never closer together than the gap. */
export type Gate = {
  /** Resolves when it is this caller's turn to start. Rejects, and leaves the line, if `signal` aborts first. */
  turn(signal?: AbortSignal): Promise<void>
}

/**
 * The service we call allows about one request per second. The gate only spaces out starts: a request that is still on
 * its way, or that was aborted, does not hold anyone up. A caller that leaves the line frees its place for the next one.
 */
export function createGate(gapMs: number): Gate {
  const line: { go: () => void }[] = []
  let lastStart = Number.NEGATIVE_INFINITY
  let timer: ReturnType<typeof setTimeout> | undefined

  function startNext() {
    timer = undefined
    const next = line.shift()
    if (!next) return
    lastStart = Date.now()
    next.go()
    arm()
  }

  // The wait never exceeds the gap: a clock that jumps back must not stall the line for hours.
  function arm() {
    if (timer !== undefined || line.length === 0) return
    const wait = Math.min(gapMs, Math.max(0, lastStart + gapMs - Date.now()))
    if (wait === 0) startNext()
    else timer = setTimeout(startNext, wait)
  }

  return {
    turn(signal) {
      return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(abortError(signal))
          return
        }

        const place = { go: resolve }
        if (signal) {
          const leave = () => {
            const index = line.indexOf(place)
            if (index >= 0) line.splice(index, 1)
            if (line.length === 0 && timer !== undefined) {
              clearTimeout(timer)
              timer = undefined
            }
            reject(abortError(signal))
          }
          signal.addEventListener('abort', leave, { once: true })
          place.go = () => {
            signal.removeEventListener('abort', leave)
            resolve()
          }
        }

        line.push(place)
        arm()
      })
    },
  }
}
