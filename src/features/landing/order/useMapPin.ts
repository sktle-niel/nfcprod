import { useCallback, useEffect, useRef, useState } from 'react'
import { GeocoderError, type ReverseGeocoder } from '@/data/geocoder'
import type { LocationRepository } from '@/data/locations'
import { resolveAddress, type ResolvedPlaces } from '@/data/resolveAddress'
import { isInPhilippines, roundPin, type Pin } from '@/entities/location/pin'
import type { MapView } from './LeafletMap'
import { describePlaces, HINT, type Status, type StatusKey } from './MapPickerStatus'
import { useNewestRun } from './useMapPinRun'

type Options = {
  geocoder: ReverseGeocoder
  locations: LocationRepository
  /** Once per lookup that ends while it is still the newest: the places it found, or `{}`. */
  onResolved: (places: ResolvedPlaces) => void
}

// A fix worse than this many meters still places the pin, but the customer is asked to drag it to the door.
const COARSE_METERS = 200
const LOCATE_TIMEOUT_MS = 10_000
// After a location fix the map looks closely enough for a house; after a weak one, wide enough to show the doubt.
const FIX_ZOOM = 17
const COARSE_ZOOM = 16
const SEARCH_ZOOM = 16
// GeolocationPositionError.code
const PERMISSION_DENIED = 1
const TIMEOUT = 3

type Outcome = { places: ResolvedPlaces; status: Status; clear: boolean }

function failureOutcome(error: unknown, coarse: boolean): Outcome {
  const code = error instanceof GeocoderError ? error.code : 'unavailable'
  // Outside the country is a wrong pin, not a broken service: it does not stay saved.
  if (code === 'outside') return { places: {}, status: { key: 'outside' }, clear: true }
  return { places: {}, status: { key: code === 'busy' ? 'busy' : 'offline', coarse }, clear: false }
}

/**
 * The pin and what is known about it. The pin is saved the moment it is placed and stays saved whatever the
 * address lookup does, except when the lookup says the spot is outside the country.
 */
export function useMapPin({ geocoder, locations, onResolved }: Options) {
  const [pin, setPin] = useState<Pin | null>(null)
  const [status, setStatus] = useState<Status>(HINT)
  const [view, setView] = useState<MapView | null>(null)
  const run = useNewestRun()

  const resolved = useRef(onResolved)
  useEffect(() => {
    resolved.current = onResolved
  })

  // Every message gets a new stamp (see `said` in Status), so a message the customer asked for again is read out again.
  const say = useCallback((next: Status) => setStatus((last) => ({ ...next, said: (last.said ?? 0) + 1 })), [])

  const lookUp = useCallback(
    async (spot: Pin, id: number, signal: AbortSignal, coarse: boolean) => {
      let outcome: Outcome
      try {
        const places = await resolveAddress(await geocoder.reverse(spot, signal), locations)
        outcome = { places, status: { ...describePlaces(places), coarse }, clear: false }
      } catch (error) {
        outcome = failureOutcome(error, coarse)
      }
      // A newer pin took over, or the panel was closed: this answer is old news.
      if (!run.isNewest(id)) return
      if (outcome.clear) setPin(null)
      say(outcome.status)
      resolved.current(outcome.places)
    },
    [geocoder, locations, run, say],
  )

  /** Saves a spot and starts the lookup. False when the spot is not in the Philippines, and then no pin is kept. */
  const save = useCallback(
    (spot: Pin, coarse: boolean): boolean => {
      // Before the range check: a lookup still running for the pin that was there is old news from this moment on.
      const { id, signal } = run.start()
      if (!isInPhilippines(spot)) {
        setPin(null)
        say({ key: 'outside' })
        return false
      }
      const saved = roundPin(spot)
      setPin(saved)
      say({ key: 'looking' })
      void lookUp(saved, id, signal, coarse)
      return true
    },
    [lookUp, run, say],
  )

  const place = useCallback((spot: Pin) => void save(spot, false), [save])

  const tooFar = useCallback(() => say({ key: 'zoomIn' }), [say])

  // The customer did what "zoom in closer" asked, so the message has done its job. Any other message stays.
  // Not `say`: the words stay as they are, and a stamp would make a screen reader read "Found ..." again at every zoom.
  const zoomedIn = useCallback(() => setStatus((current) => (current.key === 'zoomIn' ? HINT : current)), [])

  /** Asks the device where it is. Only ever called from a button press. */
  const locate = useCallback(() => {
    // Pressing the button must not cancel the lookup of a pin that is already saved, and a denied or lost request
    // would leave that pin without its address. So the request only follows the newest run: a tap, or a usable fix,
    // starts a new one, and then this request is old news.
    const id = run.current()
    say({ key: 'locating' })
    const fail = (key: StatusKey) => {
      if (run.isNewest(id)) say({ key })
    }

    const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation
    if (!geolocation) return fail('unavailable')
    try {
      geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!run.isNewest(id)) return
          const spot = { lat: coords.latitude, lng: coords.longitude }
          // A fix that is not in the country is refused on its own. It is not a placement, so the pin the customer
          // already saved stays; only a tap, a drag or "pin the center" outside the country takes a pin back.
          if (!isInPhilippines(spot)) return say({ key: 'outside' })
          // `<=` is false for a missing or NaN accuracy, which counts as weak.
          const coarse = !(coords.accuracy <= COARSE_METERS)
          if (save(spot, coarse)) setView({ center: roundPin(spot), zoom: coarse ? COARSE_ZOOM : FIX_ZOOM })
        },
        ({ code }) => fail(code === PERMISSION_DENIED ? 'denied' : code === TIMEOUT ? 'timeout' : 'unavailable'),
        { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS },
      )
    } catch {
      fail('unavailable')
    }
  }, [run, save, say])

  /**
   * Moves the map to a place the customer found by searching and says so, because focus goes to the map and the
   * words above it would not change. It does not place the pin: the customer does that, by hand or with the button.
   */
  const showSpot = useCallback(
    (spot: Pin) => {
      if (!isInPhilippines(spot)) return
      setView({ center: roundPin(spot), zoom: SEARCH_ZOOM })
      say({ key: 'moved' })
    },
    [say],
  )

  return { pin, status, view, place, tooFar, zoomedIn, locate, showSpot }
}

export type MapPinState = ReturnType<typeof useMapPin>
