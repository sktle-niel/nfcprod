import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LocationRepository } from '@/data/locations'
import type { Place } from '@/entities/location/place'

export type Level = 'province' | 'city' | 'barangay'

export type PlacesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; places: readonly Place[] }
  | { status: 'error' }

type Loader = () => Promise<Place[]>

// What one loader brought back on one attempt. No places means it failed.
type Outcome = { load: Loader; attempt: number; places: Place[] | null }

/** Loads a list whenever there is a loader, and says where it stands. A new loader drops the old list at once. */
function usePlaces(load: Loader | null): [PlacesState, () => void] {
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!load) return
    let stale = false
    load().then(
      (places) => {
        if (!stale) setOutcome({ load, attempt, places })
      },
      () => {
        if (!stale) setOutcome({ load, attempt, places: null })
      },
    )
    return () => {
      stale = true
    }
  }, [load, attempt])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])

  if (!load) return [{ status: 'idle' }, retry]
  if (!outcome || outcome.load !== load || outcome.attempt !== attempt) return [{ status: 'loading' }, retry]
  return [outcome.places ? { status: 'ready', places: outcome.places } : { status: 'error' }, retry]
}

// A list that is of no use: it failed, or it came back empty.
const unusable = (state: PlacesState) =>
  state.status === 'error' || (state.status === 'ready' && state.places.length === 0)

type Picked = Record<Level, Place | null>
const NOTHING: Picked = { province: null, city: null, barangay: null }

/**
 * The delivery place: three lists that depend on each other, what the customer chose, and whether to type instead.
 * Typing takes over when the customer asks for it, or when a list cannot be loaded, so an order is never blocked.
 */
export function usePlacePicker(repository: LocationRepository) {
  const [typing, setTyping] = useState(false)
  const [picked, setPicked] = useState<Picked>(NOTHING)

  const provinceCode = picked.province?.code
  const cityCode = picked.city?.code
  const loadProvinces = useCallback(() => repository.provinces(), [repository])
  const loadCities = useMemo(
    () => (provinceCode ? () => repository.cities(provinceCode) : null),
    [repository, provinceCode],
  )
  const loadBarangays = useMemo(
    () => (cityCode ? () => repository.barangays(cityCode) : null),
    [repository, cityCode],
  )

  const [provinces, retryProvinces] = usePlaces(typing ? null : loadProvinces)
  const [cities, retryCities] = usePlaces(typing ? null : loadCities)
  const [barangays, retryBarangays] = usePlaces(typing ? null : loadBarangays)

  const failed = unusable(provinces) || unusable(cities) || unusable(barangays)

  function choose(level: Level, code: string) {
    const list = level === 'province' ? provinces : level === 'city' ? cities : barangays
    const place = list.status === 'ready' ? (list.places.find((item) => item.code === code) ?? null) : null
    setPicked((current) => {
      if (level === 'province') return { province: place, city: null, barangay: null }
      if (level === 'city') return { ...current, city: place, barangay: null }
      return { ...current, barangay: place }
    })
  }

  /** Flips between the lists and typing. After a failure it tries the lists again instead. */
  function toggle() {
    if (!failed) {
      setTyping((value) => !value)
      return
    }
    if (unusable(provinces)) retryProvinces()
    if (unusable(cities)) retryCities()
    if (unusable(barangays)) retryBarangays()
  }

  return {
    picked,
    lists: { province: provinces, city: cities, barangay: barangays } satisfies Record<Level, PlacesState>,
    manual: typing || failed,
    failed,
    choose,
    toggle,
  }
}

export type PlacePicker = ReturnType<typeof usePlacePicker>
