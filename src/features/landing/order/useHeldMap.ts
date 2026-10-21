import type { MapLibreMap } from 'maplibre-gl'
import { useCallback, useRef, useSyncExternalStore } from 'react'

/**
 * The map is made in an effect, and the parts that draw from it (the zoom buttons) need it to render. A value made in an
 * effect reaches the render through a store (useSyncExternalStore), not through a setState there; the component that
 * calls this is its one subscriber. `map` is for rendering. `current` is for effects and handlers, which must read the
 * newest map without waiting for a render. `hold` sets it (or clears it with null) and tells the render.
 */
export function useHeldMap() {
  const store = useRef<{ map: MapLibreMap | null; changed: () => void }>({ map: null, changed: () => {} })
  const subscribe = useCallback((onChange: () => void) => {
    store.current.changed = onChange
    return () => {
      store.current.changed = () => {}
    }
  }, [])
  const map = useSyncExternalStore(subscribe, () => store.current.map)
  const current = useCallback(() => store.current.map, [])
  const hold = useCallback((next: MapLibreMap | null) => {
    store.current.map = next
    store.current.changed()
  }, [])
  return { map, current, hold }
}
