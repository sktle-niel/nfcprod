/** A spot on the map in decimal degrees (WGS 84). */
export type Pin = { lat: number; lng: number }

/**
 * A loose box around the Philippines. It only catches pins that are plainly somewhere else. The west edge is 114 so that
 * Pag-asa Island (Kalayaan, Palawan, about 114.28 E) is inside: the place lists offer it, and the pin is required.
 * A point of another country inside the box is still refused later, by the country check on the map service's answer.
 */
export const PH_BOUNDS = { south: 4.5, north: 21.5, west: 114, east: 127 } as const

/** The map must be zoomed in at least this far before a pin is accepted: a street, not a region. */
export const MIN_PIN_ZOOM = 14

// Five decimals is about one meter. A delivery does not need more, and a pin should not say more than it must.
const SCALE = 1e5

export function roundCoordinate(value: number): number {
  return Math.round(value * SCALE) / SCALE
}

export function roundPin(pin: Pin): Pin {
  return { lat: roundCoordinate(pin.lat), lng: roundCoordinate(pin.lng) }
}

/** True for a pin with real numbers that lies inside the loose box around the country. */
export function isInPhilippines(pin: Pin): boolean {
  const { lat, lng } = pin
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= PH_BOUNDS.south &&
    lat <= PH_BOUNDS.north &&
    lng >= PH_BOUNDS.west &&
    lng <= PH_BOUNDS.east
  )
}

/** A stable key for a pin, so the same spot is looked up once. */
export function pinKey(pin: Pin): string {
  const { lat, lng } = roundPin(pin)
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

// Plain decimal numbers only. Number() would also read '0x10', '1e1' and 'Infinity', which our own form never sends.
const DECIMAL = /^-?\d{1,3}(?:\.\d{1,12})?$/

function readCoordinate(value: string): number {
  const text = value.trim()
  return DECIMAL.test(text) ? Number(text) : NaN
}

/**
 * Reads the two hidden form values. Blank on both sides means no pin (null). Anything else becomes numbers,
 * and a value that is not a plain decimal becomes NaN, so that validation can name the problem.
 */
export function readPin(lat: string, lng: string): Pin | null {
  if (lat.trim() === '' && lng.trim() === '') return null
  return { lat: readCoordinate(lat), lng: readCoordinate(lng) }
}

/** The link riders open. Only numbers go into it, so it is safe to put in an href. */
export function googleMapsUrl(pin: Pin): string {
  const { lat, lng } = roundPin(pin)
  return `https://www.google.com/maps?q=${lat},${lng}`
}
