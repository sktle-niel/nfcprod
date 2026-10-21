import { useEffect, type ComponentType } from 'react'
import type { PinMapProps } from './PinMap'
import { MAP_PATIENCE_MS } from './mapPatience'

/** The shape `React.lazy` wants back. */
type LoadedMap = { default: ComponentType<PinMapProps> }

/** Stands in for the map when its code could not be fetched (offline, blocked, a failed deploy) or was too slow. */
function ChunkFailed({ onUnavailable }: PinMapProps) {
  useEffect(() => {
    onUnavailable()
  }, [onUnavailable])
  return null
}

/**
 * Fetches the map, which is a chunk of its own: nothing of MapLibre is requested until a panel renders it, which is when
 * the customer opens the map. It never rejects, because a rejection inside `React.lazy` takes the whole route down
 * instead of letting the order go on without a pin. A fetch that failed stays failed until the page is reloaded.
 *
 * The `await` is inside the `try` on purpose. In a production build Vite wraps the import in a preload step that also
 * waits for the chunk's stylesheet. When that stylesheet is blocked the step throws before the import's own promise
 * exists, so a `.then(ok, fail)` written on the import never sees it.
 */
export async function loadPinMap(): Promise<LoadedMap> {
  let timer: number | undefined
  try {
    // A request that never ends must not hold the order for ever either: the same patience the tiles get.
    const tooSlow = new Promise<never>((_resolve, reject) => {
      timer = window.setTimeout(() => reject(new Error('The map code did not arrive in time')), MAP_PATIENCE_MS)
    })
    const loaded = await Promise.race([import('./PinMap'), tooSlow])
    return { default: loaded.PinMap }
  } catch {
    return { default: ChunkFailed }
  } finally {
    window.clearTimeout(timer)
  }
}
