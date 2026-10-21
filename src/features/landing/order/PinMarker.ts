import { Marker, type MapLibreMap } from 'maplibre-gl'
import type { Pin } from '@/entities/location/pin'
import styles from './PinMap.module.css'

// Within a meter is the same spot: the pin the customer just dropped is not nudged when its rounded value comes back.
const SAME_SPOT_DEGREES = 1e-5

// The tip of the drop sits this many pixels above the bottom of its box (see the pin in PinMap.module.css).
const TIP_ABOVE_BOTTOM = 1

const SVG = 'http://www.w3.org/2000/svg'

/** A drop with a dot, built node by node from fixed shapes of our own, never from outside values. The colors come from the CSS module. */
function drawPin(): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 28 38')
  svg.setAttribute('width', '28')
  svg.setAttribute('height', '38')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  const drop = document.createElementNS(SVG, 'path')
  drop.setAttribute('d', 'M14 1C6.8 1 1 6.8 1 14c0 9.6 13 23 13 23s13-13.4 13-23C27 6.8 21.2 1 14 1Z')
  const dot = document.createElementNS(SVG, 'circle')
  dot.setAttribute('cx', '14')
  dot.setAttribute('cy', '14')
  dot.setAttribute('r', '5')
  svg.append(drop, dot)
  return svg
}

export const sameSpot = (a: Pin, b: Pin): boolean =>
  Math.abs(a.lat - b.lat) <= SAME_SPOT_DEGREES && Math.abs(a.lng - b.lng) <= SAME_SPOT_DEGREES

/**
 * Puts a draggable pin on the map at `at`. The pin is only a picture for assistive technology: the lists and "pin the
 * center of the map" are the way in. `onDragEnd` is told when it is let go; where it landed is its `getLngLat()`.
 */
export function placePin(map: MapLibreMap, at: Pin, onDragEnd: () => void): Marker {
  const element = document.createElement('div')
  element.className = styles.pin ?? ''
  element.setAttribute('aria-hidden', 'true')
  element.append(drawPin())
  // An element of our own: the library adds no role and no tabindex to it. The box hangs from the spot by its bottom
  // edge, moved down a little so that the tip of the drop, not the edge, is on the spot.
  const marker = new Marker({ element, draggable: true, anchor: 'bottom', offset: [0, TIP_ABOVE_BOTTOM] })
  // While it is held the drop lifts, so the finger does not hide it (a rule in the CSS module).
  marker.on('dragstart', () => element.setAttribute('data-held', ''))
  marker.on('dragend', () => {
    element.removeAttribute('data-held')
    onDragEnd()
  })
  return marker.setLngLat([at.lng, at.lat]).addTo(map)
}
