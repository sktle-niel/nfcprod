import { render } from '@testing-library/react'
import type { MapOptions } from 'maplibre-gl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copy } from '@/config/copy'
import { styleUrl } from '@/config/map'
import { PH_BOUNDS } from '@/entities/location/pin'
import { fake } from '@/test/maplibre'
import { PinMap, type PinMapProps } from './PinMap'

// What the map is made with. jsdom has no WebGL, so the library is a fake that keeps the options it was given
// (src/test/maplibre.ts); the real library's types check the names.
vi.mock('maplibre-gl', () => import('@/test/maplibre'))

const calls = { onPlace: vi.fn(), onTooFar: vi.fn(), onZoomedIn: vi.fn(), onReady: vi.fn(), onUnavailable: vi.fn() }
const props: PinMapProps = { pin: null, view: null, ...calls }
const LAHUG = { lat: 10.328, lng: 123.906 }

/** The two corners of the bounds as [lng, lat] pairs. The renderer hands the library an array of two. */
function corners(bounds: MapOptions['maxBounds']): [[number, number], [number, number]] {
  const [first, second] = Array.isArray(bounds) ? bounds : []
  if (!Array.isArray(first) || !Array.isArray(second)) throw new Error('The map has no corner bounds')
  return [[first[0], first[1]], [second[0], second[1]]]
}

function open() {
  const view = render(<PinMap {...props} />)
  const map = fake.map()
  return { map, options: map.options, ...view }
}

/** What the screen answers for the reduced-motion query. The test setup answers "reduce" to everything. */
function motionPreference(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('prefers-reduced-motion'), media: query }))
}
afterEach(() => {
  vi.unstubAllGlobals()
  fake.reset()
})

describe('PinMap options', () => {
  it('turns the animations off for a customer who asked for reduced motion, and jumps to a new view', () => {
    motionPreference(true)
    const { map, options, rerender } = open()
    expect(options.reduceMotion).toBe(true)
    expect(options.fadeDuration).toBe(0)

    rerender(<PinMap {...props} view={{ center: LAHUG, zoom: 16 }} />)
    // [lng, lat], and the library's zoom scale: one level less than the app's 16 (mapZoom.ts).
    expect(map.moves).toEqual([{ method: 'jumpTo', options: { center: [LAHUG.lng, LAHUG.lat], zoom: 15 } }])
  })

  it('keeps the animations for everyone else, and slides to a new view', () => {
    motionPreference(false)
    const { map, options, rerender } = open()
    expect(options.reduceMotion).toBe(false)
    expect(options.fadeDuration).not.toBe(0)

    rerender(<PinMap {...props} view={{ center: LAHUG, zoom: 16 }} />)
    expect(map.moves).toEqual([{ method: 'easeTo', options: { center: [LAHUG.lng, LAHUG.lat], zoom: 15 } }])
  })

  it('keeps the map on the country, flat and north-up, inside the zoom levels the style draws well', () => {
    const { map, options } = open()
    // 5 and 19 in the app's numbers.
    expect(options.minZoom).toBe(4)
    expect(options.maxZoom).toBe(18)
    // The country's box plus six degrees on each side, so the coast is never cut off. [lng, lat] corners.
    expect(options.maxBounds).toEqual([
      [PH_BOUNDS.west - 6, PH_BOUNDS.south - 6],
      [PH_BOUNDS.east + 6, PH_BOUNDS.north + 6],
    ])
    expect(options.renderWorldCopies).toBe(false)

    expect(options.dragRotate).toBe(false)
    expect(options.pitchWithRotate).toBe(false)
    expect(options.touchPitch).toBe(false)
    expect(options.maxPitch).toBe(0)
    expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled()
    expect(map.keyboard.disableRotation).toHaveBeenCalled()
    // The arrow keys still pan, and a pinch still zooms.
    expect(map.keyboard.isEnabled()).toBe(true)
    expect(map.touchZoomRotate.isEnabled()).toBe(true)
  })

  it('leaves room in its bounds for the start view in the biggest map the order sheet gives', () => {
    const { options } = open()
    // The library keeps the view inside the bounds, so bounds smaller than the view would zoom the map in and cut the
    // country off. The biggest map is 520 px wide (the wide sheet is 560 px, less 20 px of padding on each side:
    // Modal.module.css) and 420 px high (the frame: MapPicker.module.css).
    const [[west, south], [east, north]] = corners(options.maxBounds)
    const world = 512 * 2 ** (options.zoom ?? 0)
    const stretched = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
    expect(((east - west) / 360) * world).toBeGreaterThanOrEqual(520)
    expect(((stretched(north) - stretched(south)) / (2 * Math.PI)) * world).toBeGreaterThanOrEqual(420)
  })

  it('leaves the mouse wheel to the page until the map has the focus', () => {
    expect(open().options.scrollZoom).toBe(false)
  })

  it('loads the light style over https, names the map region in our own words, and keeps the credit to itself', () => {
    const { options } = open()
    expect(options.style).toBe(styleUrl)
    expect(styleUrl).toMatch(/^https:\/\//)
    expect(options.locale).toEqual({ 'Map.Title': copy.order.map.region })
    expect(options.attributionControl).toBe(false)
  })

  it('sends only the origin as referrer with every request, and no cookies', () => {
    const { options } = open()
    const transform = options.transformRequest
    if (!transform) throw new Error('The map does not shape its requests')
    const url = 'https://tiles.openfreemap.org/planet/1/0/0.pbf'
    expect(transform(url)).toEqual({ url, referrerPolicy: 'strict-origin' })
  })

  it('points the library at a worker file of our own origin, which a strict content security policy allows', () => {
    open()
    expect(fake.workerUrl).toMatch(/maplibre-gl-worker/)
    expect(fake.workerUrl).not.toMatch(/^blob:/)
  })
})
