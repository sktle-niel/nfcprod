import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { copy } from '@/config/copy'
import type { ReverseGeocoder } from '@/data/geocoder'
import type { LeafletMapHandle } from './LeafletMap'
import { loadLeafletMap } from './loadLeafletMap'
import styles from './MapPicker.module.css'
import { MapPickerSearch } from './MapPickerSearch'
import { statusText, statusTone } from './MapPickerStatus'
import type { MapPinState } from './useMapPin'

type Props = {
  geocoder: ReverseGeocoder
  map: MapPinState
  /** Marks the first control, so the order form can send the customer there when the pin is missing. */
  anchor: { 'data-field': 'pin'; 'aria-describedby': string }
  onUnavailable: () => void
}

// Leaflet is a chunk of its own. Nothing of it is fetched until a panel renders it, which is when the map is opened.
const LazyMap = lazy(loadLeafletMap)

/** The opened map and everything that places a pin: your location, a search, the status line, the map itself. */
export function MapPickerPanel({ geocoder, map, anchor, onUnavailable }: Props) {
  const text = copy.order.map
  const [ready, setReady] = useState(false)
  const handle = useRef<LeafletMapHandle>(null)
  const firstButton = useRef<HTMLButtonElement>(null)

  // The button that opened the map has just gone, and with it the keyboard's place: start the panel at its first control.
  useEffect(() => {
    firstButton.current?.focus()
  }, [])

  return (
    <div className={styles.opened}>
      <button ref={firstButton} type="button" className={styles.button} {...anchor} onClick={map.locate}>
        {text.useMyLocation}
      </button>
      <MapPickerSearch
        geocoder={geocoder}
        onChoose={(spot) => {
          map.showSpot(spot)
          handle.current?.focus()
        }}
      />
      {/* Above the map, not below it: on a phone the sticky order bar covers whatever sits under the map, and a refused tap would look like nothing happened. */}
      <p role="status" className={styles.status} data-tone={statusTone(map.status)}>
        {/* Keyed by the message's stamp, so the same words twice are a new node and are read out again. */}
        <span key={map.status.said}>{statusText(map.status)}</span>
      </p>
      <div className={styles.frame}>
        <Suspense
          fallback={
            <p className={styles.loading} role="status">
              {text.loading}
            </p>
          }
        >
          <LazyMap
            ref={handle}
            pin={map.pin}
            view={map.view}
            onPlace={map.place}
            onTooFar={map.tooFar}
            onZoomedIn={map.zoomedIn}
            onReady={() => setReady(true)}
            onUnavailable={onUnavailable}
          />
        </Suspense>
      </div>
      <button type="button" className={styles.button} disabled={!ready} onClick={() => handle.current?.pinCenter()}>
        {text.pinHere}
      </button>
    </div>
  )
}
