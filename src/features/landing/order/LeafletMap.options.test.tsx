import { render } from '@testing-library/react'
import type { Map as LeafletMapInstance } from 'leaflet'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PH_BOUNDS } from '@/entities/location/pin'
import { LeafletMap, type LeafletMapProps } from './LeafletMap'

// jsdom has no 3D transforms, so Leaflet switches its animations off by itself and the options below show up nowhere in
// the page. The only place to see what the map was given is the call that makes it.
const made = vi.hoisted(() => ({ maps: [] as LeafletMapInstance[] }))
vi.mock('leaflet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('leaflet')>()
  return {
    ...actual,
    map: (...args: Parameters<typeof actual.map>) => {
      const map = actual.map(...args)
      made.maps.push(map)
      return map
    },
  }
})

const calls = { onPlace: vi.fn(), onTooFar: vi.fn(), onZoomedIn: vi.fn(), onReady: vi.fn(), onUnavailable: vi.fn() }
const props: LeafletMapProps = { pin: null, view: null, ...calls }
const LAHUG = { lat: 10.328, lng: 123.906 }

function open() {
  made.maps.length = 0
  const view = render(<LeafletMap {...props} />)
  const [map] = made.maps
  if (!map) throw new Error('the map was never made')
  return { map, options: map.options, ...view }
}

/** What the screen answers for the reduced-motion query. The test setup answers "reduce" to everything. */
function motionPreference(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('prefers-reduced-motion'), media: query }))
}
afterEach(() => vi.unstubAllGlobals())

describe('LeafletMap options', () => {
  it('turns every animation off for a customer who asked for reduced motion', () => {
    motionPreference(true)
    const { options } = open()
    expect(options.zoomAnimation).toBe(false)
    expect(options.fadeAnimation).toBe(false)
    expect(options.markerZoomAnimation).toBe(false)
    expect(options.inertia).toBe(false)
  })

  it('moves to a new view without animating for a customer who asked for reduced motion', () => {
    motionPreference(true)
    const { map, rerender } = open()
    const setView = vi.spyOn(map, 'setView')
    rerender(<LeafletMap {...props} view={{ center: LAHUG, zoom: 16 }} />)
    // Leaflet adds `pan` and `zoom` to the object it is given, so only `animate` is compared.
    expect(setView).toHaveBeenCalledWith([LAHUG.lat, LAHUG.lng], 16, expect.objectContaining({ animate: false }))
  })

  it('keeps the animations for everyone else', () => {
    motionPreference(false)
    const { map, options, rerender } = open()
    expect(options.zoomAnimation).toBe(true)
    expect(options.fadeAnimation).toBe(true)
    expect(options.markerZoomAnimation).toBe(true)
    expect(options.inertia).toBe(true)

    const setView = vi.spyOn(map, 'setView')
    rerender(<LeafletMap {...props} view={{ center: LAHUG, zoom: 16 }} />)
    expect(setView).toHaveBeenCalledWith([LAHUG.lat, LAHUG.lng], 16, expect.objectContaining({ animate: true }))
  })

  it('keeps the map on the country, and inside the zoom levels OpenStreetMap has tiles for', () => {
    const { options } = open()
    expect(options.minZoom).toBe(5)
    expect(options.maxZoom).toBe(19)
    expect(options.maxBoundsViscosity).toBe(0.8)
    // The country's box plus one degree on each side, so the coast is never cut off.
    const bounds = options.maxBounds as { getSouth(): number; getNorth(): number; getWest(): number; getEast(): number }
    expect(bounds.getSouth()).toBeCloseTo(PH_BOUNDS.south - 1)
    expect(bounds.getNorth()).toBeCloseTo(PH_BOUNDS.north + 1)
    expect(bounds.getWest()).toBeCloseTo(PH_BOUNDS.west - 1)
    expect(bounds.getEast()).toBeCloseTo(PH_BOUNDS.east + 1)
  })

  it('leaves the mouse wheel to the page until the map has the focus', () => {
    expect(open().options.scrollWheelZoom).toBe(false)
  })
})
