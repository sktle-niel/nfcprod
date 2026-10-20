import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { copy } from '@/config/copy'
import { MAP_START, TILE_ATTRIBUTION, tileUrl } from '@/config/map'
import { MIN_PIN_ZOOM, PH_BOUNDS, type Pin } from '@/entities/location/pin'
import styles from './LeafletMap.module.css'
import { MAP_PATIENCE_MS } from './mapPatience'

/** Where the map should look. A new object moves the map, even to the same place. */
export type MapView = { center: Pin; zoom: number }

/** What the panel can ask of the map. */
export type LeafletMapHandle = {
  /** Puts the pin at the center of the map, under the same zoom rule as a tap. */
  pinCenter(): void
  /** Moves keyboard focus onto the map, so the arrow keys pan it. */
  focus(): void
}

export type LeafletMapProps = {
  ref?: Ref<LeafletMapHandle> | undefined
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
  /** The map cannot work for this customer (it would not start, or no tile ever arrived). The order goes on without a pin. */
  onUnavailable: () => void
}

const START: MapView = { center: { lat: MAP_START.lat, lng: MAP_START.lng }, zoom: MAP_START.zoom }
const MIN_ZOOM = 5
const MAX_ZOOM = 19 // the deepest zoom the OpenStreetMap tiles have

// The map may be dragged this many degrees past the loose box around the country, so the coast is never cut off.
const EDGE_DEGREES = 1
const STICKY_EDGE = 0.8

// The tile server counts as out of reach after this many failed tiles with none loaded, or when the first
// tile asked for has not arrived after the map's patience. One slow tile is not an outage; a blank map is.
const TILE_FAILURES = 4

// Leaflet's credit, as it shows in the corner of the map. Its own link opens in the same tab, and a stray tap on that
// tiny link would take the customer away from the order form, so the link is set here instead. Fixed text of our own.
const LEAFLET_CREDIT = '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>'

// A drop with a dot. Fixed text of our own, never built from outside values. The colors come from the CSS module.
const PIN_SVG =
  '<svg viewBox="0 0 28 38" width="28" height="38" aria-hidden="true" focusable="false">' +
  '<path d="M14 1C6.8 1 1 6.8 1 14c0 9.6 13 23 13 23s13-13.4 13-23C27 6.8 21.2 1 14 1Z"/><circle cx="14" cy="14" r="5"/></svg>'

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Leaflet's default marker picture breaks under the bundler, so the pin is a div that the CSS module draws. */
function pinIcon(): L.DivIcon {
  return L.divIcon({ className: styles.pin, html: PIN_SVG, iconSize: [44, 50], iconAnchor: [22, 49] })
}

/** Calls `onGiveUp` once, when the tile server looks out of reach. Returns the function that stops the watch. */
function watchTiles(layer: L.TileLayer, onGiveUp: () => void): () => void {
  let loaded = 0
  let failed = 0
  let gone = false
  let timer: number | undefined

  const giveUp = () => {
    window.clearTimeout(timer)
    if (loaded > 0 || gone) return
    gone = true
    onGiveUp()
  }

  // The clock starts with the first tile asked for, so a map that never got a size (and never asked) is not blamed.
  layer.on('tileloadstart', () => {
    timer ??= window.setTimeout(giveUp, MAP_PATIENCE_MS)
  })
  layer.on('tileload', () => {
    loaded += 1
    window.clearTimeout(timer)
  })
  layer.on('tileerror', () => {
    failed += 1
    if (loaded === 0 && failed >= TILE_FAILURES) giveUp()
  })
  return () => window.clearTimeout(timer)
}

/** The + and - buttons, named in our words. */
function addZoomControl(map: L.Map): void {
  const { zoomInButton, zoomOutButton } = copy.order.map
  const zoom = L.control.zoom({ zoomInTitle: zoomInButton, zoomOutTitle: zoomOutButton }).addTo(map)
  // Leaflet draws the buttons as links (role="button") that answer to Enter only. A button also answers to Space,
  // which would otherwise scroll the order sheet a page away from the control.
  zoom.getContainer()?.addEventListener('keydown', (event) => {
    if (event.key !== ' ' || !(event.target instanceof HTMLAnchorElement)) return
    event.preventDefault()
    // Held down, a real button fires once; so does this.
    if (!event.repeat) event.target.click()
  })
}

/**
 * Leaflet animates a pan whenever the keyboard moves the map and whenever it snaps back inside its bounds, and it
 * gives those calls no option to turn that off. Every pan goes through `panBy`, so it is wrapped once here.
 */
function stopPanAnimation(map: L.Map): void {
  const panBy = map.panBy.bind(map)
  map.panBy = (offset, options) => panBy(offset, { ...options, animate: false })
}

function openMap(element: HTMLElement, first: MapView, onGiveUp: () => void): { map: L.Map; close: () => void } {
  const reduce = prefersReducedMotion()
  const map = L.map(element, {
    center: [first.center.lat, first.center.lng],
    zoom: first.zoom,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxBounds: [
      [PH_BOUNDS.south - EDGE_DEGREES, PH_BOUNDS.west - EDGE_DEGREES],
      [PH_BOUNDS.north + EDGE_DEGREES, PH_BOUNDS.east + EDGE_DEGREES],
    ],
    maxBoundsViscosity: STICKY_EDGE,
    // The wheel zooms only while the map has focus, so scrolling the order sheet past the map keeps working.
    scrollWheelZoom: false,
    zoomAnimation: !reduce,
    fadeAnimation: !reduce,
    markerZoomAnimation: !reduce,
    inertia: !reduce,
    zoomControl: false,
  })
  if (reduce) stopPanAnimation(map)
  addZoomControl(map)
  map.attributionControl.setPrefix(LEAFLET_CREDIT)
  map.on('focus', () => map.scrollWheelZoom.enable())
  map.on('blur', () => map.scrollWheelZoom.disable())

  // `referrerPolicy`: the tile policy asks for a valid Referer. The origin is enough; the path never leaves.
  const layer = L.tileLayer(tileUrl, { maxZoom: MAX_ZOOM, attribution: TILE_ATTRIBUTION, referrerPolicy: 'strict-origin' })
  // Watched before it is added: the first tiles are asked for the moment the layer joins the map.
  const stopWatching = watchTiles(layer, onGiveUp)
  layer.addTo(map)

  return {
    map,
    close: () => {
      stopWatching()
      map.remove()
    },
  }
}

/**
 * The only file that knows Leaflet. A thin wrapper: the panel owns the pin, this draws it and reports taps and drags.
 * Load it with `React.lazy`, so the landing page does not carry the map until the customer asks for it.
 */
export function LeafletMap({ ref, pin, view, onPlace, onTooFar, onZoomedIn, onReady, onUnavailable }: LeafletMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)

  // Leaflet events are registered once, so they read the newest props from here.
  const live = useRef({ pin, view, onPlace, onTooFar, onZoomedIn, onReady, onUnavailable })
  useEffect(() => {
    live.current = { pin, view, onPlace, onTooFar, onZoomedIn, onReady, onUnavailable }
  })

  // A thrown error inside an effect would take the whole route down. A broken map only loses the map.
  const guard = (work: () => void) => {
    try {
      work()
    } catch (error) {
      // While developing, say what broke. Never in production: a Leaflet message can carry the pin's coordinates.
      if (import.meta.env.DEV) console.error('The map failed', error)
      live.current.onUnavailable()
    }
  }

  // A pin is only exact when the map is zoomed in: below that, one pixel is hundreds of meters.
  const accept = (at: L.LatLng): boolean => {
    if ((map.current?.getZoom() ?? 0) < MIN_PIN_ZOOM) {
      live.current.onTooFar()
      return false
    }
    live.current.onPlace({ lat: at.lat, lng: at.lng })
    return true
  }

  useEffect(() => {
    const element = container.current
    if (!element) return
    let opened: ReturnType<typeof openMap>
    try {
      opened = openMap(element, live.current.view ?? START, () => live.current.onUnavailable())
    } catch (error) {
      if (import.meta.env.DEV) console.error('The map failed to start', error)
      live.current.onUnavailable()
      return
    }
    opened.map.on('click', (event: L.LeafletMouseEvent) => accept(event.latlng.wrap()))
    opened.map.on('zoomend', () => {
      if (opened.map.getZoom() >= MIN_PIN_ZOOM) live.current.onZoomedIn()
    })
    map.current = opened.map
    live.current.onReady()

    return () => {
      marker.current = null
      map.current = null
      opened.close()
    }
  }, [])

  useEffect(() => {
    const current = map.current
    if (!current) return
    guard(() => {
      if (!pin) {
        marker.current?.remove()
        marker.current = null
        return
      }
      const at = L.latLng(pin.lat, pin.lng)
      if (marker.current) {
        // Within a meter is the same spot: do not nudge the pin the customer just dropped.
        if (!marker.current.getLatLng().equals(at, 1e-5)) marker.current.setLatLng(at)
        return
      }
      const drop = L.marker(at, { icon: pinIcon(), draggable: true, keyboard: false })
      drop.on('dragend', () => {
        // Refused (zoomed out): the pin goes back to where it was saved.
        const saved = live.current.pin
        if (!accept(drop.getLatLng().wrap()) && saved) drop.setLatLng([saved.lat, saved.lng])
      })
      drop.addTo(current)
      // The pin is only a picture for assistive technology: the lists and "pin the center" are the way in.
      drop.getElement()?.setAttribute('aria-hidden', 'true')
      marker.current = drop
    })
  }, [pin])

  useEffect(() => {
    const current = map.current
    if (current && view) {
      guard(() => current.setView([view.center.lat, view.center.lng], view.zoom, { animate: !prefersReducedMotion() }))
    }
  }, [view])

  useImperativeHandle(ref, () => ({
    pinCenter() {
      const current = map.current
      if (current) accept(current.getCenter())
    },
    focus() {
      container.current?.focus()
    },
  }), [])

  // Leaflet focuses the map when it is pressed, so that the arrow keys work. That focus() scrolls the order sheet a few
  // pixels under the finger, because the sheet keeps room above its content for the close button. Focusing first, without
  // the scroll, makes Leaflet skip its own focus. Capture phase, so this runs before Leaflet's listener on the map.
  const holdFocus = () => {
    const element = container.current
    if (element && document.activeElement !== element) element.focus({ preventScroll: true })
  }

  return (
    <div className={styles.wrap} onMouseDownCapture={holdFocus}>
      <div ref={container} className={styles.map} role="region" aria-label={copy.order.map.region} />
      <span className={styles.crosshair} aria-hidden="true" />
    </div>
  )
}
