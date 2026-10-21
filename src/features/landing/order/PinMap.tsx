import type { Marker } from 'maplibre-gl'
import { useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { MAP_START } from '@/config/map'
import { MIN_PIN_ZOOM, type Pin } from '@/entities/location/pin'
import { MapCredits } from './MapCredits'
import { toAppZoom } from './mapZoom'
import { lookAt, openPinMap } from './openPinMap'
import type { MapView, PinMapProps } from './PinMap.contract'
import styles from './PinMap.module.css'
import { placePin, sameSpot } from './PinMarker'
import { useHeldMap } from './useHeldMap'
import { ZoomButtons } from './ZoomButtons'

export type { MapView, PinMapHandle, PinMapProps } from './PinMap.contract'

const START: MapView = { center: { lat: MAP_START.lat, lng: MAP_START.lng }, zoom: MAP_START.zoom }

/**
 * The only files that know MapLibre are this one and its helpers (openPinMap.ts, PinMarker.ts, ZoomButtons.tsx,
 * useHeldMap.ts). A thin wrapper: the panel owns the pin, this draws it and reports taps and drags. Zoom numbers cross
 * into the library's scale in those files and nowhere else (mapZoom.ts). Load it with `React.lazy`, so the landing page
 * does not carry the map until the customer asks for it.
 */
export function PinMap({ ref, pin, view, onPlace, onTooFar, onZoomedIn, onReady, onUnavailable }: PinMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const marker = useRef<Marker | null>(null)
  const { map, current, hold } = useHeldMap()

  // Map events are registered once, so they read the newest props from here.
  const live = useRef({ pin, view, onPlace, onTooFar, onZoomedIn, onReady, onUnavailable })
  useEffect(() => {
    live.current = { pin, view, onPlace, onTooFar, onZoomedIn, onReady, onUnavailable }
  })

  // A thrown error inside an effect would take the whole route down. A broken map only loses the map.
  const guard = (work: () => void) => {
    try {
      work()
    } catch (error) {
      // While developing, say what broke. Never in production: a library message can carry the pin's coordinates.
      if (import.meta.env.DEV) console.error('The map failed', error)
      live.current.onUnavailable()
    }
  }

  // A pin is only exact when the map is zoomed in: below that, one pixel is hundreds of meters.
  const accept = useCallback((at: Pin): boolean => {
    const held = current()
    const zoom = held ? toAppZoom(held.getZoom()) : 0
    if (zoom < MIN_PIN_ZOOM) {
      live.current.onTooFar()
      return false
    }
    live.current.onPlace({ lat: at.lat, lng: at.lng })
    return true
  }, [current])

  useEffect(() => {
    const element = container.current
    if (!element) return
    let made: ReturnType<typeof openPinMap>
    try {
      made = openPinMap(element, live.current.view ?? START, () => live.current.onUnavailable())
    } catch (error) {
      // No WebGL, most often. Never a thrown error: the order goes on without a pin.
      if (import.meta.env.DEV) console.error('The map failed to start', error)
      live.current.onUnavailable()
      return
    }
    made.map.on('click', (event) => {
      // A press on the pin bubbles up to the map as a click. It is the pin being held or let go, not a new spot.
      const target = event.originalEvent.target
      if (target instanceof Node && marker.current?.getElement().contains(target)) return
      accept(event.lngLat)
    })
    made.map.on('zoomend', () => {
      if (toAppZoom(made.map.getZoom()) >= MIN_PIN_ZOOM) live.current.onZoomedIn()
    })
    hold(made.map)
    live.current.onReady()

    return () => {
      marker.current = null
      hold(null)
      made.close()
    }
  }, [hold, accept])

  useEffect(() => {
    const held = current()
    if (!held) return
    guard(() => {
      if (!pin) {
        marker.current?.remove()
        marker.current = null
        return
      }
      if (marker.current) {
        if (!sameSpot(marker.current.getLngLat(), pin)) marker.current.setLngLat([pin.lng, pin.lat])
        return
      }
      const drop = placePin(held, pin, () => {
        // Refused (zoomed out): the pin goes back to where it was saved.
        const saved = live.current.pin
        if (!accept(drop.getLngLat()) && saved) drop.setLngLat([saved.lng, saved.lat])
      })
      marker.current = drop
    })
  }, [pin, current, accept])

  useEffect(() => {
    const held = current()
    if (held && view) guard(() => lookAt(held, view))
  }, [view, current])

  useImperativeHandle(ref, () => ({
    pinCenter() {
      const held = current()
      if (held) accept(held.getCenter())
    },
    focus() {
      current()?.getCanvas().focus()
    },
  }), [current, accept])

  // The canvas is the part of the map that takes the focus, so that the arrow keys pan it. Pressed, the browser focuses
  // it and may scroll it into view, which slides the order sheet a few pixels under the finger, because the sheet keeps
  // room above its content for the close button. Focusing first, without the scroll, leaves the browser nothing to do.
  // Capture phase, so this runs before the library's own listeners (the pin's stops the default focus, for one).
  const holdFocus = () => {
    const canvas = current()?.getCanvas()
    if (canvas && document.activeElement !== canvas) canvas.focus({ preventScroll: true })
  }

  return (
    <div className={styles.wrap} onMouseDownCapture={holdFocus}>
      <div ref={container} className={styles.map} />
      <span className={styles.crosshair} aria-hidden="true" />
      {map && <ZoomButtons map={map} />}
      <MapCredits />
    </div>
  )
}
