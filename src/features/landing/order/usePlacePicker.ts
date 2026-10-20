import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LocationRepository } from '@/data/locations'
import type { ResolvedPlaces } from '@/data/resolveAddress'
import { normalizeName } from '@/entities/location/match'
import type { Place } from '@/entities/location/place'

export type Level = 'province' | 'city' | 'barangay'

/** From the widest place to the narrowest: each level sits inside the one before it. */
export const LEVELS: readonly Level[] = ['province', 'city', 'barangay']

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
 * What is chosen, and how often the map has rewritten each level's text box. The boxes are uncontrolled, so the count
 * says which of them to write a name into. Typing alone never moves it.
 */
type Choice = { picked: Picked; fills: Record<Level, number> }
const START: Choice = { picked: NOTHING, fills: { province: 0, city: 0, barangay: 0 } }

function choosePlace(current: Picked, level: Level, place: Place | null): Picked {
  if (level === 'province') return { province: place, city: null, barangay: null }
  if (level === 'city') return { ...current, city: place, barangay: null }
  return { ...current, barangay: place }
}

/** What the three text boxes hold. Typing never records a choice, so this is the only place that knows it. */
type Typed = Record<Level, string>

/** The text box of a level, or null while the lists are showing instead of the boxes. */
const boxOf = (root: ParentNode | null, level: Level) =>
  root?.querySelector<HTMLInputElement>(`input[data-field="${level}"]`) ?? null

function readTyped(root: ParentNode | null): Typed | null {
  const [province, city, barangay] = LEVELS.map((level) => boxOf(root, level)?.value)
  return province === undefined || city === undefined || barangay === undefined ? null : { province, city, barangay }
}

/** Does this text name the place, spelled any way `normalizeName` treats alike ("cebu", "Sta. Teresita")? */
const namesPlace = (text: string, place: Place) => normalizeName(text) === normalizeName(place.name)

/**
 * Applies what a map lookup found. A level it found is replaced. A level it did not find stays only while the level
 * above is unchanged (same province keeps its city, same city keeps its barangay), otherwise it is cleared.
 * A lookup without a province changes nothing. A city without a province, or a barangay without a city, is
 * ignored: it could not be placed in the lists, and the order must not say something the lists do not show.
 *
 * Whether a found level is unchanged: a chosen place is compared by its code. While the customer types, a level may have no
 * chosen place, and then its box is the only record of it, so its text must name the found place (as `normalizeName` reads
 * names). Once a level has changed, every level below it that the map did not find is cleared, whatever its box says: it was
 * chosen or typed for another place, and a city of the same name in another province does not make it safe.
 */
function applyLookup(current: Choice, places: ResolvedPlaces, typed: Typed | null): Choice {
  if (!places.province) return current
  const found: Picked = {
    province: places.province,
    city: places.city ?? null,
    barangay: places.city ? (places.barangay ?? null) : null,
  }

  const picked = { ...current.picked }
  const fills = { ...current.fills }
  // Whether a level above is another place than the one the levels below it were chosen or typed for. Once true, it stays true.
  let moved = false
  for (const level of LEVELS) {
    const next = found[level]
    // The map found nothing here and nothing above changed: what is here stays, typed text included.
    if (!next && !moved) continue
    if (next) {
      const was = current.picked[level]
      moved ||= was ? was.code !== next.code : !(typed && namesPlace(typed[level], next))
    }
    picked[level] = next
    fills[level] += 1
  }
  return { picked, fills }
}

/**
 * The delivery place: three lists that depend on each other, what the customer chose, and whether to type instead.
 * Typing takes over when the customer asks for it, or when a list cannot be loaded, so an order is never blocked.
 */
export function usePlacePicker(repository: LocationRepository) {
  const [typing, setTyping] = useState(false)
  const [choice, setChoice] = useState<Choice>(START)
  const { picked, fills } = choice
  // The element around the three fields. The typing boxes are looked up inside it, to read them and to write into them.
  const grid = useRef<HTMLDivElement>(null)

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
    setChoice((current) => ({ ...current, picked: choosePlace(current.picked, level, place) }))
  }

  /**
   * Takes the places a map lookup found. Safe to call late: it works on the latest choice, not on the one at the time of the call.
   * The lists reload by themselves from the new codes, and in typing mode the boxes follow.
   */
  const fill = useCallback((places: ResolvedPlaces) => {
    // Read now, outside the update: what the customer typed is in the boxes only, the choice has never heard of it.
    const typed = readTyped(grid.current)
    setChoice((current) => applyLookup(current, places, typed))
  }, [])

  // The typing boxes are uncontrolled, so a name the map set is written into the box itself. The box stays the same node,
  // and so does its focus, which a new key would have lost. Boxes whose count did not move keep what was typed in them.
  const written = useRef(fills)
  useLayoutEffect(() => {
    for (const level of LEVELS) {
      if (written.current[level] === fills[level]) continue
      const box = boxOf(grid.current, level)
      if (box) box.value = picked[level]?.name ?? ''
    }
    written.current = fills
  }, [fills, picked])

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
    grid,
    choose,
    fill,
    toggle,
  }
}

export type PlacePicker = ReturnType<typeof usePlacePicker>
