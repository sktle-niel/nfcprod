import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAP_START } from '@/config/map'
import { MIN_PIN_ZOOM, type Pin } from '@/entities/location/pin'
import { fake, MAP_SIZE } from '@/test/maplibre'
import { declaredValue, installStylesheet } from './MapPicker.stylekit'
import { PinMap, type PinMapHandle, type PinMapProps } from './PinMap'
import styles from './PinMap.module.css'

// jsdom has no WebGL, so the map library is a fake (src/test/maplibre.ts): it keeps a center and a zoom and raises the
// events the real one would. The tests below drive the real PinMap through them and read what the panel is told.
vi.mock('maplibre-gl', () => import('@/test/maplibre'))

const CENTER = MAP_SIZE / 2

// The test setup says "reduce motion" for every query. Some tests need the other answer.
const setupMatchMedia = window.matchMedia
afterEach(() => {
  vi.useRealTimers()
  vi.stubGlobal('matchMedia', setupMatchMedia)
  fake.reset()
})

/** What the screen says about "prefers-reduced-motion: reduce". */
function reduceMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('prefers-reduced-motion'), media: query }))
}

const LAHUG = { lat: 10.328, lng: 123.906 }
const CLOSE = { center: LAHUG, zoom: 16 }
// One pixel at zoom 16 is this many degrees of longitude. The app counts zoom on 256-px tiles, as OpenStreetMap does; the
// library counts 512-px ones, so a map handed the app's number as its own would make a pixel half of this.
const DEGREES_PER_PIXEL = 360 / (256 * 2 ** 16)
// The zoom a pin needs, as the library counts it.
const MIN_PIN_MAP_ZOOM = MIN_PIN_ZOOM - 1

function setup(props: Partial<PinMapProps> = {}) {
  const handle = createRef<PinMapHandle>()
  const calls = {
    onPlace: vi.fn<(pin: Pin) => void>(),
    onTooFar: vi.fn(),
    onZoomedIn: vi.fn(),
    onReady: vi.fn(),
    onUnavailable: vi.fn(),
  }
  const all: PinMapProps = { ref: handle, pin: null, view: null, ...calls, ...props }
  const view = render(<PinMap {...all} />)
  return { ...view, handle, calls, update: (next: Partial<PinMapProps>) => view.rerender(<PinMap {...all} {...next} />) }
}

type Calls = ReturnType<typeof setup>['calls']

const region = () => screen.getByRole('region', { name: /tap to place your pin/i })
const map = () => fake.map()
const pinIcon = () => document.querySelector<HTMLElement>('.maplibregl-marker')
const pinMarker = () => fake.markers.at(-1)
/** The spot the panel was given by the nth `onPlace`. */
const placed = (calls: Calls, index = 0) => calls.onPlace.mock.calls[index]?.[0]

/** Taps the map at a pixel of its box: a DOM click on the canvas, which the library turns into a map click. */
const tap = (x = CENTER, y = CENTER) => fireEvent.click(region(), { clientX: x, clientY: y })

/** Holds the pin, moves the pointer by (dx, dy) pixels and lets go. The library moves its marker by the map's mouse events. */
function drag(dx: number, dy: number) {
  const icon = pinIcon()!
  fireEvent.mouseDown(icon, { clientX: CENTER, clientY: CENTER, button: 0 })
  fireEvent.mouseMove(icon, { clientX: CENTER + dx, clientY: CENTER + dy })
  fireEvent.mouseUp(icon, { clientX: CENTER + dx, clientY: CENTER + dy })
}

describe('PinMap start', () => {
  it('draws the map in a named region with the credit always shown, and reports ready', () => {
    const { calls } = setup()
    expect(region()).toHaveAttribute('tabindex', '0')
    expect(calls.onReady).toHaveBeenCalledTimes(1)

    const credit = screen.getByRole('link', { name: 'OpenStreetMap' })
    expect(credit).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
    expect(credit).toHaveAttribute('target', '_blank')
    expect(credit).toHaveAttribute('rel', 'noopener noreferrer')
    expect(credit.closest('p')).toHaveTextContent('OpenFreeMap © OpenMapTiles Data from OpenStreetMap')
  })

  it('opens every link in its corner in a new tab, so a stray tap does not leave the order form', () => {
    setup()
    const links = within(screen.getByRole('link', { name: 'OpenStreetMap' }).closest('p')!).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['OpenFreeMap', '© OpenMapTiles', 'OpenStreetMap'])
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('names its zoom buttons in our own words', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()
  })

  it('starts on the whole country, or where it was asked to look before it was ready', () => {
    const whole = setup()
    // [lng, lat], and one level less than the app's number: the library counts zoom on 512-px tiles.
    expect(map().options.center).toEqual([MAP_START.lng, MAP_START.lat])
    expect(map().options.zoom).toBe(MAP_START.zoom - 1)
    expect(map().moves).toEqual([])
    whole.unmount()

    setup({ view: CLOSE })
    expect(map().options.center).toEqual([LAHUG.lng, LAHUG.lat])
    expect(map().options.zoom).toBe(15)
  })

  it('moves when it is given a new view, even the same one', () => {
    const { update } = setup()
    update({ view: { center: LAHUG, zoom: 16 } })
    expect(map().getCenter().toArray()).toEqual([LAHUG.lng, LAHUG.lat])
    expect(map().getZoom()).toBe(15)

    // The customer drags away, and a new view object with the same words brings the map back.
    act(() => void map().setCenter([121.02, 14.55]))
    update({ view: { center: LAHUG, zoom: 16 } })
    expect(map().getCenter().toArray()).toEqual([LAHUG.lng, LAHUG.lat])
  })

  it('gives keyboard focus to the map on request', () => {
    const { handle } = setup()
    act(() => handle.current?.focus())
    expect(region()).toHaveFocus()
  })

  it('focuses the map when it is pressed without scrolling anything, so the map does not move under the finger', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    setup()

    fireEvent.mouseDown(region(), { button: 0 })
    expect(region()).toHaveFocus()
    expect(focus.mock.calls).toEqual([[{ preventScroll: true }]])
    focus.mockRestore()
  })

  it('tells the panel when the map is zoomed in far enough for a pin', () => {
    const { calls, update } = setup()
    update({ view: { center: LAHUG, zoom: 10 } })
    expect(calls.onZoomedIn).not.toHaveBeenCalled()

    update({ view: { center: LAHUG, zoom: 16 } })
    expect(calls.onZoomedIn).toHaveBeenCalledTimes(1)
  })

  it('leaves the mouse wheel to the page until the map has focus, so the order sheet still scrolls', () => {
    setup()
    expect(map().options.scrollZoom).toBe(false)
    expect(map().scrollZoom.isEnabled()).toBe(false)

    act(() => region().focus())
    expect(map().scrollZoom.isEnabled()).toBe(true)
    act(() => region().blur())
    expect(map().scrollZoom.isEnabled()).toBe(false)
  })
})

describe('PinMap pin rules', () => {
  it('refuses a tap while zoomed out, and tells the panel', () => {
    const { calls } = setup()
    tap()
    expect(calls.onTooFar).toHaveBeenCalledTimes(1)
    expect(calls.onPlace).not.toHaveBeenCalled()
  })

  it('places the pin where the map is tapped once it is zoomed in', () => {
    const { calls } = setup({ view: CLOSE })
    tap()
    expect(calls.onPlace).toHaveBeenCalledTimes(1)
    expect(placed(calls)?.lat).toBeCloseTo(LAHUG.lat, 4)
    expect(placed(calls)?.lng).toBeCloseTo(LAHUG.lng, 4)

    // Fifty pixels east: the spot a browser would show there at zoom 16 on OpenStreetMap's scale, which the app uses.
    tap(CENTER + 50, CENTER)
    expect(placed(calls, 1)?.lng).toBeCloseTo(LAHUG.lng + 50 * DEGREES_PER_PIXEL, 4)
    expect(placed(calls, 1)?.lat).toBeCloseTo(LAHUG.lat, 4)
    expect(calls.onTooFar).not.toHaveBeenCalled()
  })

  it('pins the center of the map for the keyboard, under the same zoom rule', () => {
    const far = setup()
    act(() => far.handle.current?.pinCenter())
    expect(far.calls.onTooFar).toHaveBeenCalledTimes(1)
    expect(far.calls.onPlace).not.toHaveBeenCalled()
    far.unmount()

    const near = setup({ view: CLOSE })
    act(() => near.handle.current?.pinCenter())
    expect(placed(near.calls)?.lat).toBeCloseTo(LAHUG.lat, 4)
    expect(placed(near.calls)?.lng).toBeCloseTo(LAHUG.lng, 4)
    expect(near.calls.onTooFar).not.toHaveBeenCalled()
  })

  it('does not take a press on the pin itself for a tap on the map', () => {
    const { calls } = setup({ view: CLOSE, pin: LAHUG })
    // The library lets a click on the pin bubble up to the map as a map click. The old one did not.
    fireEvent.click(pinIcon()!, { clientX: CENTER + 10, clientY: CENTER - 20 })
    fireEvent.click(pinIcon()!.querySelector('svg')!, { clientX: CENTER, clientY: CENTER - 30 })
    expect(calls.onPlace).not.toHaveBeenCalled()
    expect(calls.onTooFar).not.toHaveBeenCalled()

    // The same press beside the pin is a tap on the map.
    tap(CENTER + 10, CENTER - 20)
    expect(calls.onPlace).toHaveBeenCalledTimes(1)
  })
})

describe('PinMap marker', () => {
  it('shows the saved pin as a picture that assistive technology skips, and removes it with the pin', () => {
    const { update } = setup({ view: CLOSE })
    expect(pinIcon()).toBeNull()

    update({ pin: LAHUG })
    expect(pinIcon()).toBeInTheDocument()
    expect(pinIcon()).toHaveAttribute('aria-hidden', 'true')
    expect(pinIcon()).not.toHaveAttribute('tabindex')
    expect(pinIcon()).not.toHaveAttribute('role')
    expect(pinIcon()!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    update({ pin: null })
    expect(pinIcon()).toBeNull()
  })

  it('hangs the pin by the tip of its drop, and lets it be dragged', () => {
    setup({ view: CLOSE, pin: LAHUG })
    expect(pinMarker()?.getLngLat().toArray()).toEqual([LAHUG.lng, LAHUG.lat])
    // The box is 44 by 50 with the tip of the drop 1 px above its bottom edge (PinMap.module.css): hung by that edge,
    // moved down 1 px, the tip is on the spot.
    expect(pinMarker()?.options).toMatchObject({ draggable: true, anchor: 'bottom', offset: [0, 1] })
    expect(pinIcon()).toHaveClass(styles.pin ?? 'pin')
  })

  it('moves the marker when the saved pin moves, and leaves it alone within a meter', () => {
    const { update } = setup({ view: CLOSE, pin: LAHUG })
    const east = { lat: LAHUG.lat, lng: LAHUG.lng + 20 * DEGREES_PER_PIXEL }
    update({ pin: east })
    expect(pinMarker()?.getLngLat().toArray()).toEqual([east.lng, east.lat])

    // The same spot rounded to five decimals, as the panel saves it: the marker is not nudged.
    update({ pin: { lat: east.lat + 0.000009, lng: east.lng } })
    expect(pinMarker()?.getLngLat().toArray()).toEqual([east.lng, east.lat])
  })

  it('reports where the pin was dropped after a drag', () => {
    const { calls } = setup({ view: CLOSE, pin: LAHUG })
    drag(40, 0)
    expect(calls.onPlace).toHaveBeenCalledTimes(1)
    expect(placed(calls)?.lng).toBeCloseTo(LAHUG.lng + 40 * DEGREES_PER_PIXEL, 4)
    expect(placed(calls)?.lat).toBeCloseTo(LAHUG.lat, 4)
    expect(calls.onTooFar).not.toHaveBeenCalled()
  })

  it('puts the pin back when it is dragged while the map is zoomed out', () => {
    const { calls } = setup({ pin: LAHUG })
    drag(30, 30)
    expect(calls.onTooFar).toHaveBeenCalledTimes(1)
    expect(calls.onPlace).not.toHaveBeenCalled()
    expect(pinMarker()?.getLngLat().toArray()).toEqual([LAHUG.lng, LAHUG.lat])
  })

  it('lifts the drop while it is held, and sets it down when it is let go', () => {
    setup({ view: CLOSE, pin: LAHUG })
    const icon = pinIcon()!
    fireEvent.mouseDown(icon, { clientX: CENTER, clientY: CENTER, button: 0 })
    // A press alone is not yet a drag: the library waits for the pointer to move.
    expect(icon).not.toHaveAttribute('data-held')
    fireEvent.mouseMove(icon, { clientX: CENTER + 5, clientY: CENTER })
    expect(icon).toHaveAttribute('data-held')
    fireEvent.mouseUp(icon, { clientX: CENTER + 5, clientY: CENTER })
    expect(icon).not.toHaveAttribute('data-held')
  })
})

describe('PinMap when the map does not come', () => {
  // What the library raises: `style.load` once the style was read, `error` for a request that failed (a tile's names the
  // tile and its source), `data` with a tile for one that brought content (the map says it again as `sourcedata`).
  // Errors are logged while developing; not here.
  const styleLoads = () => act(() => void map().fire('style.load'))
  const fail = () => act(() => void map().fire('error', { error: new Error('Failed to fetch'), sourceId: 'openmaptiles', tile: {} }))
  const arrive = () => act(() => void map().fire('data', { dataType: 'source', tile: {} }))
  /** A map whose style was read: from there on every request is a tile's or a sprite's. */
  function setupStyled() {
    const made = setup()
    styleLoads()
    return made
  }
  let quiet = vi.spyOn(console, 'warn')
  beforeEach(() => {
    quiet = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => quiet.mockRestore())

  it('gives up at once when the style cannot be read, without waiting for the patience', () => {
    vi.useFakeTimers()
    const { calls } = setup()
    // Before the style is read, the style is the only request there is.
    act(() => void map().fire('error', { error: new Error('Failed to fetch') }))
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)

    act(() => vi.advanceTimersByTime(60_000))
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('waits for four failures once the style is read: a sprite that fails is not the map failing', () => {
    const { calls } = setupStyled()
    act(() => void map().fire('error', { error: new Error('Failed to fetch') }))
    expect(calls.onUnavailable).not.toHaveBeenCalled()
    fail()
    expect(calls.onUnavailable).not.toHaveBeenCalled()
  })

  it('gives up after four failed requests when nothing ever loaded', () => {
    const { calls } = setupStyled()
    fail()
    fail()
    fail()
    expect(calls.onUnavailable).not.toHaveBeenCalled()

    fail()
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)

    fail()
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('does not give up while any tile has loaded', () => {
    const { calls } = setupStyled()
    arrive()
    for (let attempt = 0; attempt < 8; attempt += 1) fail()
    expect(calls.onUnavailable).not.toHaveBeenCalled()
  })

  it('does not take the style, or a sprite, for content: only a tile counts', () => {
    const { calls } = setupStyled()
    act(() => void map().fire('data', { dataType: 'style' }))
    act(() => void map().fire('data', { dataType: 'source', sourceDataType: 'metadata' }))
    for (let attempt = 0; attempt < 4; attempt += 1) fail()
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('gives up when nothing has arrived after its patience, counted from the moment the map was made', () => {
    vi.useFakeTimers()
    const { calls } = setup()
    act(() => vi.advanceTimersByTime(14_000))
    expect(calls.onUnavailable).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1_500))
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('does not give up when a tile arrives in time', () => {
    vi.useFakeTimers()
    const { calls } = setup()
    act(() => vi.advanceTimersByTime(8_000))
    arrive()
    act(() => vi.advanceTimersByTime(60_000))
    expect(calls.onUnavailable).not.toHaveBeenCalled()
  })

  it('stops watching when the map is closed', () => {
    vi.useFakeTimers()
    const { calls, unmount } = setup()
    const closed = map()
    unmount()
    act(() => vi.advanceTimersByTime(60_000))
    for (let attempt = 0; attempt < 4; attempt += 1) closed.fire('error', { error: new Error('late') })
    expect(calls.onUnavailable).not.toHaveBeenCalled()
  })
})

describe('PinMap when the library cannot start', () => {
  it('reports unavailable instead of throwing into the page', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    fake.refuseNext = new Error('Failed to initialize WebGL')
    try {
      const { calls, unmount } = setup({ pin: LAHUG })
      expect(calls.onUnavailable).toHaveBeenCalledTimes(1)
      expect(calls.onReady).not.toHaveBeenCalled()
      expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument()
      expect(() => unmount()).not.toThrow()
    } finally {
      quiet.mockRestore()
    }
  })
})

describe('PinMap cleanup', () => {
  it('takes the map down when it is closed, and can start again on a new page', () => {
    const first = setup({ pin: LAHUG, view: CLOSE })
    const opened = map()
    expect(document.querySelector('.maplibregl-canvas')).toBeInTheDocument()
    first.unmount()
    expect(opened.removed).toBe(true)
    expect(document.querySelector('.maplibregl-canvas')).toBeNull()
    expect(pinIcon()).toBeNull()

    const second = setup({ pin: LAHUG, view: CLOSE })
    expect(second.calls.onReady).toHaveBeenCalledTimes(1)
    expect(pinIcon()).toBeInTheDocument()
  })
})

describe('PinMap at the zoom a pin needs', () => {
  it('places a pin at exactly that zoom, and refuses one a step below it', () => {
    const exact = setup({ view: { center: LAHUG, zoom: MIN_PIN_ZOOM } })
    tap()
    expect(exact.calls.onPlace).toHaveBeenCalledTimes(1)
    expect(exact.calls.onTooFar).not.toHaveBeenCalled()
    exact.unmount()

    const below = setup({ view: { center: LAHUG, zoom: MIN_PIN_ZOOM - 1 } })
    tap()
    expect(below.calls.onTooFar).toHaveBeenCalledTimes(1)
    expect(below.calls.onPlace).not.toHaveBeenCalled()
  })

  it('tells the panel about the zoom at exactly that zoom, and not a step below it', () => {
    const { calls, update } = setup()
    update({ view: { center: LAHUG, zoom: MIN_PIN_ZOOM - 1 } })
    expect(calls.onZoomedIn).not.toHaveBeenCalled()

    update({ view: { center: LAHUG, zoom: MIN_PIN_ZOOM } })
    expect(calls.onZoomedIn).toHaveBeenCalledTimes(1)
  })

  it("reads the library's zoom back in the app's numbers, whatever fraction it stands at", () => {
    const { calls } = setup()
    // A pinch leaves the map just under the zoom a pin needs, on the library's scale...
    act(() => void map().jumpTo({ center: [LAHUG.lng, LAHUG.lat], zoom: MIN_PIN_MAP_ZOOM - 0.1 }))
    tap()
    expect(calls.onTooFar).toHaveBeenCalledTimes(1)
    expect(calls.onZoomedIn).not.toHaveBeenCalled()

    // ...and then just over it.
    act(() => void map().jumpTo({ zoom: MIN_PIN_MAP_ZOOM + 0.2 }))
    expect(calls.onZoomedIn).toHaveBeenCalledTimes(1)
    tap()
    expect(calls.onPlace).toHaveBeenCalledTimes(1)
    expect(calls.onTooFar).toHaveBeenCalledTimes(1)
  })
})

describe('PinMap zoom buttons', () => {
  const zoomIn = () => screen.getByRole('button', { name: 'Zoom in' })
  const zoomOut = () => screen.getByRole('button', { name: 'Zoom out' })

  it('zoom in and out one level at a time', () => {
    setup({ view: { center: LAHUG, zoom: 10 } })
    const before = map().getZoom()
    fireEvent.click(zoomIn())
    expect(map().getZoom()).toBe(before + 1)
    fireEvent.click(zoomOut())
    expect(map().getZoom()).toBe(before)
  })

  it('look dimmed at the limits of the zoom, and keep the focus there', () => {
    const { update } = setup({ view: { center: LAHUG, zoom: 10 } })
    expect(zoomIn()).toHaveAttribute('aria-disabled', 'false')
    expect(zoomOut()).toHaveAttribute('aria-disabled', 'false')

    update({ view: { center: LAHUG, zoom: 19 } })
    expect(zoomIn()).toHaveAttribute('aria-disabled', 'true')
    expect(zoomOut()).toHaveAttribute('aria-disabled', 'false')
    act(() => zoomIn().focus())
    fireEvent.click(zoomIn())
    expect(zoomIn()).toHaveFocus()
    expect(map().getZoom()).toBe(18)

    update({ view: { center: LAHUG, zoom: 5 } })
    expect(zoomOut()).toHaveAttribute('aria-disabled', 'true')
    expect(zoomIn()).toHaveAttribute('aria-disabled', 'false')
  })

  it('zoom at once for a customer who asked for reduced motion', () => {
    reduceMotion(true)
    setup({ view: { center: LAHUG, zoom: 10 } })
    fireEvent.click(zoomIn())
    expect(map().moves.at(-1)).toEqual({ method: 'zoomIn', options: { animate: false } })
  })

  it('zoom with a slide for everyone else, which is what the test above leaves out', () => {
    reduceMotion(false)
    setup({ view: { center: LAHUG, zoom: 10 } })
    fireEvent.click(zoomOut())
    expect(map().moves.at(-1)?.method).toBe('zoomOut')
    expect(map().moves.at(-1)?.options).not.toMatchObject({ animate: false })
  })
})

describe('PinMap pin picture', () => {
  it('lets every press through to the pin itself, so that the pin is the one that is held and lifts', async () => {
    const takeOut = await installStylesheet('PinMap.module.css', styles)
    try {
      setup({ view: CLOSE, pin: LAHUG })
      expect(getComputedStyle(pinIcon()!.querySelector('svg')!).pointerEvents).toBe('none')
    } finally {
      takeOut()
    }
  })

  it('lifts the drop while it is held, and shows the crosshair only while the canvas has the focus', async () => {
    expect(await declaredValue('PinMap.module.css', '.pin[data-held] svg', 'transform')).toMatch(/^translateY\(-\d+px\)$/)
    // The library's canvas is the part of the map that takes the focus, so the crosshair keys off it.
    expect(await declaredValue('PinMap.module.css', '.wrap:has(.map canvas:focus-visible) .crosshair', 'opacity')).toBe('1')
  })
})
