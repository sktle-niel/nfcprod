import { useEffect, useImperativeHandle, useRef } from 'react'
import type { LeafletMapProps } from './LeafletMap'

/**
 * A stand-in for `LeafletMap` in tests (jsdom cannot draw a map). It shows what it was given, and its buttons
 * do what a tap, a drag and a failure would do. Spots: "Lahug" (with more than five decimals, to see rounding),
 * "Makati", and the middle of the sea off the coast of Africa.
 */
export function FakeLeafletMap({ ref, pin, view, onPlace, onTooFar, onZoomedIn, onReady, onUnavailable }: LeafletMapProps) {
  const region = useRef<HTMLDivElement>(null)
  const zoomedOut = useRef(false)

  useImperativeHandle(ref, () => ({
    // The middle of the map is Lahug-ish, unless the fake map was zoomed out.
    pinCenter: () => (zoomedOut.current ? onTooFar() : onPlace({ lat: 10.31, lng: 123.89 })),
    focus: () => region.current?.focus(),
  }))

  // Ready as soon as it shows, like the real map after it starts.
  useEffect(() => {
    onReady()
  }, [onReady])

  return (
    <div ref={region} role="region" aria-label="Fake map" tabIndex={0}>
      <p>{pin ? `pin ${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}` : 'no pin'}</p>
      <p>{view ? `view ${view.center.lat},${view.center.lng} zoom ${view.zoom}` : 'no view'}</p>
      <button type="button" onClick={() => onPlace({ lat: 10.328123, lng: 123.906417 })}>
        tap Lahug
      </button>
      <button type="button" onClick={() => onPlace({ lat: 14.5547, lng: 121.0244 })}>
        tap Makati
      </button>
      <button type="button" onClick={() => onPlace({ lat: 0, lng: 0 })}>
        tap the sea
      </button>
      <button type="button" onClick={onTooFar}>
        tap while zoomed out
      </button>
      <button
        type="button"
        onClick={() => {
          zoomedOut.current = false
          onZoomedIn()
        }}
      >
        zoom in the fake map
      </button>
      <button
        type="button"
        onClick={() => {
          zoomedOut.current = true
        }}
      >
        zoom out the fake map
      </button>
      <button type="button" onClick={onUnavailable}>
        break the map
      </button>
    </div>
  )
}
