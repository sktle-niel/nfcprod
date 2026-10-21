import type { Ref } from 'react'
import type { Pin } from '@/entities/location/pin'

// What the panel and the map agree on. The map is PinMap.tsx; its stand-in for tests (MapPicker.fakeMap.tsx) takes the same.

/** Where the map should look. A new object moves the map, even to the same place. */
export type MapView = { center: Pin; zoom: number }

/** What the panel can ask of the map. */
export type PinMapHandle = {
  /** Puts the pin at the center of the map, under the same zoom rule as a tap. */
  pinCenter(): void
  /** Moves keyboard focus onto the map, so the arrow keys pan it. */
  focus(): void
}

export type PinMapProps = {
  ref?: Ref<PinMapHandle> | undefined
  /** The saved pin. The marker follows it, so the panel stays the one place that decides what is saved. */
  pin: Pin | null
  /** Where to look. Used for the first view too, so a view asked for before the map was ready is not lost. */
  view: MapView | null
  /** A tap, the end of a drag, or "pin the center", at a zoom close enough to be exact. */
  onPlace: (pin: Pin) => void
  /** A tap, a drag or "pin the center" while the map is zoomed out too far to be exact. */
  onTooFar: () => void
  /** The map was zoomed in far enough for a pin. Lets the panel take back its "zoom in closer" message. */
  onZoomedIn: () => void
  /** The map started and is ready for `pinCenter`. */
  onReady: () => void
  /** The map cannot work for this customer (it would not start, or nothing ever arrived). The order goes on without a pin. */
  onUnavailable: () => void
}
