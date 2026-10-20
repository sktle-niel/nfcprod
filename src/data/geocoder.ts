import { geocoderUrl, OSM_GEOCODER } from '@/config/map'
import type { AddressHint } from '@/entities/location/match'
import { isInPhilippines, pinKey, roundPin, type Pin } from '@/entities/location/pin'
import { cleanText } from '@/shared/lib/text'
import { abortError, createGate } from './geocoderGate'
import { readHint, readHits } from './geocoderParse'

/** Why a lookup gave nothing: the service is busy or refused us, it could not be reached, or the spot is not in the Philippines. */
export type GeocoderFailure = 'busy' | 'unavailable' | 'outside'

export class GeocoderError extends Error {
  readonly code: GeocoderFailure

  constructor(code: GeocoderFailure) {
    super(code)
    this.code = code
  }
}

/** A place the customer searched for. `label` is outside text: show it as plain text only. */
export type SearchHit = { label: string; pin: Pin }

/**
 * The seam between the map panel and whichever service turns a spot into an address, and a name into a spot.
 * Once the service has answered "busy", both calls reject with 'busy' at once for a while instead of asking again,
 * except for what they remember.
 */
export interface ReverseGeocoder {
  /** What is known about a spot. Resolves with no useful fields when the spot has no address. Rejects with GeocoderError. */
  reverse(pin: Pin, signal?: AbortSignal): Promise<AddressHint>
  /** A few places inside the Philippines that match a name. Called when the customer submits a search, never while typing. */
  search(query: string, signal?: AbortSignal): Promise<SearchHit[]>
}

// The public service allows one request per second. Starting 1.1 s apart leaves room for timer jitter.
const GAP_MS = 1100
// After a "busy" answer nothing goes out for this long. Their policy says that asking again after a block can get the
// app blocked for good. The screen keeps the pin and says the lookup is busy, and the customer can fill the lists by hand.
const COOLDOWN_MS = 30_000
const TIMEOUT_MS = 10_000
// A real answer is a few hundred characters. Anything near this size is not one.
const MAX_CHARS = 100_000
const CACHE_SIZE = 100
const MIN_QUERY = 3
const MAX_QUERY = 100

/** The newest `limit` answers. When it is full, the oldest one goes. */
function boundedCache<V>(limit: number) {
  const entries = new Map<string, V>()
  return {
    get: (key: string): V | undefined => entries.get(key),
    set(key: string, value: V) {
      entries.delete(key)
      entries.set(key, value)
      const oldest = entries.keys().next().value
      if (entries.size > limit && oldest !== undefined) entries.delete(oldest)
    },
  }
}

// What a caller gets is a copy, so that changing it cannot change the next answer for the same spot.
function copyHint(hint: AddressHint): AddressHint {
  return { ...hint, areas: [...hint.areas], ...(hint.settlement ? { settlement: { ...hint.settlement } } : {}) }
}

function copyHits(hits: readonly SearchHit[]): SearchHit[] {
  return hits.map((hit) => ({ label: hit.label, pin: { ...hit.pin } }))
}

// 429 and 403 are how Nominatim says "too many requests" and "blocked". A 5xx means it is struggling.
function isBusy(status: number): boolean {
  return status === 429 || status === 403 || status >= 500
}

/**
 * GET one JSON document. No cookies. The Referer is our origin only: their policy asks for a Referer that names the app,
 * so `no-referrer` is not an option. No custom headers either, they would make the browser send a preflight request first.
 * `onBusy` is told when the service answers that it is busy, also when the caller gave up while the answer was coming.
 */
async function getJson(url: string, signal: AbortSignal | undefined, onBusy: () => void): Promise<unknown> {
  if (signal?.aborted) throw abortError(signal)

  const controller = new AbortController()
  const stop = () => controller.abort()
  signal?.addEventListener('abort', stop, { once: true })
  const timer = setTimeout(stop, TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'strict-origin',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      const busy = isBusy(response.status)
      if (busy) onBusy()
      throw new GeocoderError(busy ? 'busy' : 'unavailable')
    }
    const body = await response.text()
    if (body.length > MAX_CHARS) throw new GeocoderError('unavailable')
    return JSON.parse(body)
  } catch (error) {
    // The caller gave up: that is not a failure of the service, so say so as it is.
    if (signal?.aborted) throw abortError(signal)
    throw error instanceof GeocoderError ? error : new GeocoderError('unavailable')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', stop)
  }
}

// The query goes into a URL. Lone surrogate halves would make encodeURIComponent throw, so they go.
function toQuery(query: string): string {
  const clean = cleanText(query).replace(/\p{Cs}/gu, '')
  return (clean.length > MAX_QUERY ? Array.from(clean).slice(0, MAX_QUERY).join('') : clean).trim()
}

/**
 * Reverse geocoding and place search on a Nominatim server. Calls are queued 1.1 s apart, a call that is aborted
 * before its turn never goes out, answers are cached (not failures), and every answer is checked before use.
 * After a "busy" answer no request goes out for 30 s: a call that needs one fails at once, a cached answer is still given.
 */
export function nominatimGeocoder(base: string = OSM_GEOCODER): ReverseGeocoder {
  const root = base.replace(/\/+$/, '')
  const gate = createGate(GAP_MS)
  const spots = boundedCache<AddressHint>(CACHE_SIZE)
  const searches = boundedCache<SearchHit[]>(CACHE_SIZE)

  // When the service last said "busy", on the clock the gate uses. Only the end of the cooldown clears it: an answer
  // that was already on its way when the busy one came does not.
  let busyAt = Number.NEGATIVE_INFINITY
  const noteBusy = () => {
    busyAt = Date.now()
  }
  function refuseWhileCoolingDown() {
    const since = Date.now() - busyAt
    if (since >= 0 && since < COOLDOWN_MS) throw new GeocoderError('busy')
    // Over, or the clock jumped back (which, as for the gate, ends the wait instead of stretching it). Either way it is
    // forgotten, so that a clock moving around cannot bring an old cooldown back.
    busyAt = Number.NEGATIVE_INFINITY
  }

  async function ask(url: string, signal: AbortSignal | undefined): Promise<unknown> {
    refuseWhileCoolingDown()
    await gate.turn(signal)
    // The busy answer may have come while this call waited its turn.
    refuseWhileCoolingDown()
    return getJson(url, signal, noteBusy)
  }

  return {
    async reverse(pin, signal) {
      if (signal?.aborted) throw abortError(signal)
      // Only real numbers inside the country go into the URL. Nothing to look up anywhere else.
      if (!isInPhilippines(pin)) throw new GeocoderError('outside')

      const key = pinKey(pin)
      const known = spots.get(key)
      if (known) return copyHint(known)

      const { lat, lng } = roundPin(pin)
      const body = await ask(
        `${root}/reverse?format=jsonv2&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}&zoom=18&addressdetails=1&accept-language=en`,
        signal,
      )
      const hint = readHint(body)
      if (typeof hint === 'string') throw new GeocoderError(hint)

      spots.set(key, hint)
      return copyHint(hint)
    },

    async search(query, signal) {
      if (signal?.aborted) throw abortError(signal)
      const text = toQuery(query)
      if (Array.from(text).length < MIN_QUERY) return []

      const key = text.toLowerCase()
      const known = searches.get(key)
      if (known) return copyHits(known)

      const body = await ask(
        `${root}/search?format=jsonv2&q=${encodeURIComponent(text)}&countrycodes=ph&limit=5&addressdetails=0&accept-language=en`,
        signal,
      )
      const hits = readHits(body)
      if (typeof hits === 'string') throw new GeocoderError(hits)

      searches.set(key, hits)
      return copyHits(hits)
    },
  }
}

/** The geocoder the app uses, from `geocoderUrl` in `@/config/map`. Creating it sends nothing. */
export const geocoder: ReverseGeocoder = nominatimGeocoder(geocoderUrl)
