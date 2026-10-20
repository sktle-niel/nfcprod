import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, vi } from 'vitest'
import { copy } from '@/config/copy'
import type { ReverseGeocoder, SearchHit } from '@/data/geocoder'
import { resolveAddress, type ResolvedPlaces } from '@/data/resolveAddress'
import type { AddressHint } from '@/entities/location/match'
import { LAHUG_HINT } from '@/test/geocoder'
import { CEBU, CEBU_CITY, fakeLocations, LAHUG } from '@/test/locations'
import { MapPicker } from './MapPicker'

// Shared by the MapPicker test files. Each of them mocks './LeafletMap' (jsdom cannot draw a map) with the fake map from
// MapPicker.fakeMap.tsx, and '@/data/resolveAddress' (the matcher has its own tests), because vi.mock only works in the file that calls it.

export const text = copy.order.map
export const FOUND: ResolvedPlaces = { province: CEBU, city: CEBU_CITY, barangay: LAHUG, street: '12 Salinas Drive' }
export const PARTIAL: ResolvedPlaces = { province: CEBU, city: CEBU_CITY }
export const MAKATI_HINT: AddressHint = { settlement: { name: 'Makati', kind: 'city' }, areas: [] }
export const HITS: SearchHit[] = [{ label: 'Lahug, Cebu City, Central Visayas', pin: { lat: 10.328, lng: 123.906 } }]

export const FOUND_TEXT = text.status.found.replace('{place}', 'Lahug, Cebu City, Cebu')
export const PARTIAL_TEXT = text.status.partial.replace('{place}', 'Cebu City, Cebu')

/** Call before each test: the lookup finds Lahug again, and the device has no location service until a test gives it one. */
export function resetKit() {
  vi.mocked(resolveAddress).mockReset().mockResolvedValue(FOUND)
  Reflect.deleteProperty(navigator, 'geolocation')
}

type Setup = { geocoder?: Partial<ReverseGeocoder>; error?: string }

export function setup({ geocoder = {}, error }: Setup = {}) {
  const reverse = vi.fn<ReverseGeocoder['reverse']>(geocoder.reverse ?? (async () => LAHUG_HINT))
  const search = vi.fn<ReverseGeocoder['search']>(geocoder.search ?? (async () => HITS))
  const onResolved = vi.fn<(places: ResolvedPlaces) => void>()
  const submitted = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
  const view = render(
    <form aria-label="order" onSubmit={submitted}>
      <MapPicker locations={fakeLocations()} geocoder={{ reverse, search }} onResolved={onResolved} error={error} />
    </form>,
  )
  return { user: userEvent.setup(), reverse, search, onResolved, submitted, ...view }
}

export type Harness = ReturnType<typeof setup>

/** What the order form would send. */
export const sent = () => Object.fromEntries(new FormData(screen.getByRole('form', { name: 'order' })) as unknown as Iterable<[string, string]>)

export async function openMap(user: Harness['user']) {
  await user.click(screen.getByRole('button', { name: text.open }))
  await screen.findByRole('region', { name: 'Fake map' })
  // "Pin the center" waits for the map to say it is ready.
  await waitFor(() => expect(screen.getByRole('button', { name: text.pinHere })).toBeEnabled())
}

/** Presses one of the fake map's buttons. */
export const onMap = (user: Harness['user'], name: string) => user.click(screen.getByRole('button', { name }))

// The status line says one thing at a time; these read it by its words.
export const seen = (words: string) => screen.queryByText(words)

export type Fix = { latitude: number; longitude: number; accuracy: number }

/** A stand-in for `navigator.geolocation` that answers when the test says so. With `throws`, asking for the position throws. */
export function stubGeolocation({ throws = false } = {}) {
  let succeed: (fix: Fix) => void = () => {}
  let fail: (code: number) => void = () => {}
  const getCurrentPosition = Object.assign(
    vi.fn((onSuccess: PositionCallback, onFailure: PositionErrorCallback, _options?: PositionOptions) => {
      if (throws) throw new Error('blocked by the browser')
      succeed = (fix) => onSuccess({ coords: fix, timestamp: 0 } as unknown as GeolocationPosition)
      fail = (code) => onFailure({ code, message: '' } as GeolocationPositionError)
    }),
    { succeed: (fix: Fix) => succeed(fix), fail: (code: number) => fail(code) },
  )
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } })
  return getCurrentPosition
}
