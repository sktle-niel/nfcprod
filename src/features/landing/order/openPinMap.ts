import { MapLibreMap, type RequestTransformFunction } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './mapWorker'
import { copy } from '@/config/copy'
import { styleUrl } from '@/config/map'
import { PH_BOUNDS } from '@/entities/location/pin'
import { MAP_PATIENCE_MS } from './mapPatience'
import { MAX_ZOOM, MIN_ZOOM, toMapZoom } from './mapZoom'
import type { MapView } from './PinMap.contract'

// The map may be dragged this many degrees past the loose box around the country. Wide enough that the start view is
// never squeezed: the library keeps the view inside these bounds, so a box narrower than the view would zoom the map in
// and cut the country off. At the start zoom one degree of longitude is about 23 px, the order sheet gives the map up to
// 520 px, and the box is 13 degrees wide: 13 + 2 x 6 = 25 degrees, which is 569 px.
const EDGE_DEGREES = 6

// The map service counts as out of reach when the style cannot be read, after this many failed requests with nothing
// loaded, or when nothing has loaded after the map's patience. One slow tile is not an outage; a blank map is.
const TILE_FAILURES = 4

export const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Moves the map to `view`: a slide for most, a jump, with no animation, for a customer who asked for reduced motion. */
export function lookAt(map: MapLibreMap, view: MapView): void {
  const center: [number, number] = [view.center.lng, view.center.lat]
  const zoom = toMapZoom(view.zoom)
  if (prefersReducedMotion()) map.jumpTo({ center, zoom })
  else map.easeTo({ center, zoom })
}

// The origin is all the map service needs to know about the page; the path never leaves. No cookies either way.
const originOnly: RequestTransformFunction = (url) => ({ url, referrerPolicy: 'strict-origin' })

/**
 * Calls `onGiveUp` once, when the map service looks out of reach. The clock starts now: the style is the first request,
 * and it is asked for the moment the map is made. An error before the style was read is the style failing, and it is
 * reported at once: every tile request hangs on the style, so there is nothing to wait for. A tile that arrives stops
 * the clock for good: a loss is never reported after something was drawn. Returns the function that stops the watch.
 */
export function watchMapLoad(map: MapLibreMap, onGiveUp: () => void): () => void {
  let loaded = false
  let styled = false
  let failed = 0
  let gone = false
  let timer: number | undefined

  const giveUp = () => {
    window.clearTimeout(timer)
    if (loaded || gone) return
    gone = true
    onGiveUp()
  }
  timer = window.setTimeout(giveUp, MAP_PATIENCE_MS)

  // `sourcedata` with a tile: content arrived from the service. The style, sprite and glyph events carry no tile.
  const arrivals = map.on('sourcedata', (event) => {
    if (!event.tile) return
    loaded = true
    window.clearTimeout(timer)
  })
  // `style.load`: the style was read and its sources were added. Their requests, and the sprite's, come after it.
  const reads = map.on('style.load', () => {
    styled = true
  })
  const failures = map.on('error', (event) => {
    // While developing, say what failed. Never in production: a tile URL names the area the customer is looking at.
    if (import.meta.env.DEV) console.warn('A map request failed:', event.error.message)
    failed += 1
    if (!styled || failed >= TILE_FAILURES) giveUp()
  })
  return () => {
    window.clearTimeout(timer)
    arrivals.unsubscribe()
    reads.unsubscribe()
    failures.unsubscribe()
  }
}

/**
 * Makes the map inside `element`, looking at `first`, with everything the delivery pin needs set. Throws when the browser
 * cannot draw it (no WebGL): the caller turns that into "unavailable".
 */
export function openPinMap(element: HTMLElement, first: MapView, onGiveUp: () => void): { map: MapLibreMap; close: () => void } {
  const reduce = prefersReducedMotion()
  const map = new MapLibreMap({
    container: element,
    style: styleUrl,
    // The library wants [lng, lat], and its own zoom scale (mapZoom.ts).
    center: [first.center.lng, first.center.lat],
    zoom: toMapZoom(first.zoom),
    minZoom: toMapZoom(MIN_ZOOM),
    maxZoom: toMapZoom(MAX_ZOOM),
    maxBounds: [
      [PH_BOUNDS.west - EDGE_DEGREES, PH_BOUNDS.south - EDGE_DEGREES],
      [PH_BOUNDS.east + EDGE_DEGREES, PH_BOUNDS.north + EDGE_DEGREES],
    ],
    renderWorldCopies: false,
    // Flat and north-up, always: there is nothing to turn or tilt a delivery map for.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: 0,
    // The wheel zooms only while the map has the focus (below), so scrolling the order sheet past the map keeps working.
    scrollZoom: false,
    // The credit is ours (MapCredits.tsx): the library's control would write what the style's remote files say as HTML.
    attributionControl: false,
    // The canvas is the named region, and the library names it from this string (its `Map.Title`).
    locale: { 'Map.Title': copy.order.map.region },
    transformRequest: originOnly,
    reduceMotion: reduce,
    ...(reduce ? { fadeDuration: 0 } : {}),
  })
  map.touchZoomRotate.disableRotation()
  map.keyboard.disableRotation()

  const canvas = map.getCanvas()
  canvas.addEventListener('focus', () => map.scrollZoom.enable())
  canvas.addEventListener('blur', () => map.scrollZoom.disable())

  const stopWatching = watchMapLoad(map, onGiveUp)
  return {
    map,
    close: () => {
      stopWatching()
      map.remove()
    },
  }
}
