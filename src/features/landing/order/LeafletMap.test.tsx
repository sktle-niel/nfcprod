import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MIN_PIN_ZOOM } from '@/entities/location/pin'
import { LeafletMap, type LeafletMapHandle, type LeafletMapProps } from './LeafletMap'
import styles from './LeafletMap.module.css'
import { installStylesheet } from './MapPicker.stylekit'

// jsdom has no layout, so every box is 0 by 0 and Leaflet would ask for no tiles. Give boxes a size.
const SIZE = 320
const CENTER = SIZE / 2

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => SIZE })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => SIZE })
  // Leaflet puts the page scroll back after it focuses the map. jsdom cannot scroll and says so.
  vi.stubGlobal('scrollTo', vi.fn())
})
afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
  Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
  vi.unstubAllGlobals()
})
// The test setup says "reduce motion" for every query. Some tests need the other answer.
const setupMatchMedia = window.matchMedia
afterEach(() => {
  vi.useRealTimers()
  vi.stubGlobal('matchMedia', setupMatchMedia)
})

/** What the screen says about "prefers-reduced-motion: reduce". */
function reduceMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('prefers-reduced-motion'), media: query }))
}

const LAHUG = { lat: 10.328, lng: 123.906 }
const CLOSE = { center: LAHUG, zoom: 16 }
// One pixel at zoom 16 is this many degrees of longitude (360 / (256 * 2 ** 16)).
const DEGREES_PER_PIXEL = 360 / (256 * 2 ** 16)

function setup(props: Partial<LeafletMapProps> = {}) {
  const handle = createRef<LeafletMapHandle>()
  const calls = { onPlace: vi.fn(), onTooFar: vi.fn(), onZoomedIn: vi.fn(), onReady: vi.fn(), onUnavailable: vi.fn() }
  const all: LeafletMapProps = { ref: handle, pin: null, view: null, ...calls, ...props }
  const view = render(<LeafletMap {...all} />)
  return { ...view, handle, calls, update: (next: Partial<LeafletMapProps>) => view.rerender(<LeafletMap {...all} {...next} />) }
}

const region = () => screen.getByRole('region', { name: /tap to place your pin/i })
const tiles = () => Array.from(document.querySelectorAll<HTMLImageElement>('img.leaflet-tile'))
const pinIcon = () => document.querySelector<HTMLElement>('.leaflet-marker-icon')

/** Taps the map at a pixel of its 320 by 320 box. */
const tap = (x = CENTER, y = CENTER) => fireEvent.click(region(), { clientX: x, clientY: y })

/** Holds the pin, moves the pointer by (dx, dy) pixels and lets go. Leaflet listens on the document, events start at the pin. */
function drag(dx: number, dy: number) {
  const icon = pinIcon()!
  fireEvent.mouseDown(icon, { clientX: CENTER, clientY: CENTER, button: 0, which: 1 })
  fireEvent.mouseMove(icon, { clientX: CENTER + dx, clientY: CENTER + dy })
  fireEvent.mouseUp(icon, { clientX: CENTER + dx, clientY: CENTER + dy })
}

describe('LeafletMap start', () => {
  it('draws a named map region with the attribution always shown, and reports ready', () => {
    const { calls } = setup()
    expect(region()).toHaveAttribute('tabindex', '0')
    expect(calls.onReady).toHaveBeenCalledTimes(1)

    const credit = screen.getByRole('link', { name: 'OpenStreetMap' })
    expect(credit).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
    expect(credit).toHaveAttribute('target', '_blank')
    expect(credit).toHaveAttribute('rel', 'noopener noreferrer')
    expect(credit.closest('.leaflet-control-attribution')).toHaveTextContent(/contributors/)
  })

  it('opens every link in its corner in a new tab, so a stray tap does not leave the order form', () => {
    setup()
    const links = within(document.querySelector<HTMLElement>('.leaflet-control-attribution')!).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Leaflet', 'OpenStreetMap'])
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

  it('asks for https tiles and sends only the origin as referrer', () => {
    setup({ view: CLOSE })
    expect(tiles().length).toBeGreaterThan(0)
    for (const tile of tiles()) {
      expect(tile.getAttribute('src')).toMatch(/^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/)
      expect(tile.referrerPolicy).toBe('strict-origin')
    }
  })

  it('starts on the whole country, or where it was asked to look before it was ready', () => {
    const whole = setup()
    expect(tiles()[0]?.getAttribute('src')).toContain('/5/')
    whole.unmount()

    setup({ view: CLOSE })
    expect(tiles()[0]?.getAttribute('src')).toContain('/16/')
  })

  it('moves when it is given a new view, even the same one', () => {
    const { update } = setup()
    update({ view: { center: LAHUG, zoom: 16 } })
    expect(tiles()[0]?.getAttribute('src')).toContain('/16/')

    update({ view: { center: LAHUG, zoom: 17 } })
    expect(tiles().some((tile) => tile.getAttribute('src')?.includes('/17/'))).toBe(true)
  })

  it('gives keyboard focus to the map on request', () => {
    const { handle } = setup()
    act(() => handle.current?.focus())
    expect(region()).toHaveFocus()
  })

  it('focuses the map when it is pressed without scrolling anything, so the map does not move under the finger', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus')
    vi.mocked(window.scrollTo).mockClear()
    setup()

    fireEvent.mouseDown(region(), { button: 0, which: 1 })
    expect(region()).toHaveFocus()
    expect(focus.mock.calls).toEqual([[{ preventScroll: true }]])
    expect(window.scrollTo).not.toHaveBeenCalled()
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
    vi.useFakeTimers()
    setup()
    // A wheel the map zooms with is a wheel it keeps from the page: the event comes back canceled.
    const wheel = () => !fireEvent.wheel(region(), { deltaY: -100 })

    expect(wheel()).toBe(false)
    act(() => region().focus())
    expect(wheel()).toBe(true)
    act(() => region().blur())
    expect(wheel()).toBe(false)

    // Leaflet zooms a moment after the wheel stops: let it finish while the map is still there.
    act(() => vi.advanceTimersByTime(200))
  })
})

describe('LeafletMap pin rules', () => {
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
    const [spot] = calls.onPlace.mock.calls[0] as [{ lat: number; lng: number }]
    expect(spot.lat).toBeCloseTo(LAHUG.lat, 4)
    expect(spot.lng).toBeCloseTo(LAHUG.lng, 4)

    tap(CENTER + 50, CENTER)
    const [east] = calls.onPlace.mock.calls[1] as [{ lat: number; lng: number }]
    expect(east.lng).toBeCloseTo(LAHUG.lng + 50 * DEGREES_PER_PIXEL, 4)
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
    const [spot] = near.calls.onPlace.mock.calls[0] as [{ lat: number; lng: number }]
    expect(spot.lat).toBeCloseTo(LAHUG.lat, 4)
    expect(spot.lng).toBeCloseTo(LAHUG.lng, 4)
    expect(near.calls.onTooFar).not.toHaveBeenCalled()
  })
})

describe('LeafletMap marker', () => {
  it('shows the saved pin as a picture that assistive technology skips, and removes it with the pin', () => {
    const { update } = setup({ view: CLOSE })
    expect(pinIcon()).toBeNull()

    update({ pin: LAHUG })
    expect(pinIcon()).toBeInTheDocument()
    expect(pinIcon()).toHaveAttribute('aria-hidden', 'true')
    expect(pinIcon()).not.toHaveAttribute('tabindex')
    expect(pinIcon()).not.toHaveAttribute('role')

    update({ pin: null })
    expect(pinIcon()).toBeNull()
  })

  it('moves the marker when the saved pin moves', () => {
    const { update } = setup({ view: CLOSE, pin: LAHUG })
    const before = pinIcon()?.style.left
    update({ pin: { lat: LAHUG.lat, lng: LAHUG.lng + 20 * DEGREES_PER_PIXEL } })
    expect(Number.parseFloat(pinIcon()?.style.left ?? '')).toBeCloseTo(Number.parseFloat(before ?? '') + 20, 0)
  })

  it('reports where the pin was dropped after a drag', () => {
    const { calls } = setup({ view: CLOSE, pin: LAHUG })
    drag(40, 0)
    expect(calls.onPlace).toHaveBeenCalledTimes(1)
    const [spot] = calls.onPlace.mock.calls[0] as [{ lat: number; lng: number }]
    expect(spot.lng).toBeCloseTo(LAHUG.lng + 40 * DEGREES_PER_PIXEL, 4)
    expect(spot.lat).toBeCloseTo(LAHUG.lat, 4)
  })

  it('puts the pin back when it is dragged while the map is zoomed out', () => {
    const { calls } = setup({ pin: LAHUG })
    const before = { left: pinIcon()?.style.left, top: pinIcon()?.style.top }
    drag(30, 30)
    expect(calls.onTooFar).toHaveBeenCalledTimes(1)
    expect(calls.onPlace).not.toHaveBeenCalled()
    expect({ left: pinIcon()?.style.left, top: pinIcon()?.style.top }).toEqual(before)
  })
})

describe('LeafletMap when the tiles do not come', () => {
  it('gives up after four failed tiles when none ever loaded', () => {
    const { calls } = setup()
    const [first] = tiles()
    expect(first).toBeDefined()
    for (let attempt = 0; attempt < 3; attempt += 1) fireEvent.error(first!)
    expect(calls.onUnavailable).not.toHaveBeenCalled()

    fireEvent.error(first!)
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)

    fireEvent.error(first!)
    expect(calls.onUnavailable).toHaveBeenCalledTimes(1)
  })

  it('does not give up while any tile has loaded', () => {
    const { calls } = setup()
    const [first, second] = tiles()
    fireEvent.load(second!)
    for (let attempt = 0; attempt < 8; attempt += 1) fireEvent.error(first!)
    expect(calls.onUnavailable).not.toHaveBeenCalled()
  })

  it('gives up when the first tile asked for never answers', () => {
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
    fireEvent.load(tiles()[0]!)
    act(() => vi.advanceTimersByTime(60_000))
    expect(calls.onUnavailable).not.toHaveBeenCalled()
  })

  it('stops watching when the map is closed', () => {
    vi.useFakeTimers()
    const { calls, unmount } = setup()
    unmount()
    act(() => vi.advanceTimersByTime(60_000))
    expect(calls.onUnavailable).not.toHaveBeenCalled()
  })
})

describe('LeafletMap when Leaflet cannot start', () => {
  it('reports unavailable instead of throwing into the page', () => {
    const working = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')!
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get: () => {
        throw new Error('no layout')
      },
    })
    try {
      const { calls, unmount } = setup({ pin: LAHUG })
      expect(calls.onUnavailable).toHaveBeenCalledTimes(1)
      expect(calls.onReady).not.toHaveBeenCalled()
      expect(() => unmount()).not.toThrow()
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', working)
    }
  })
})

describe('LeafletMap cleanup', () => {
  it('removes everything Leaflet drew when it is closed, and can start again on a new page', () => {
    const first = setup({ pin: LAHUG, view: CLOSE })
    expect(document.querySelector('.leaflet-pane')).toBeInTheDocument()
    first.unmount()
    expect(document.querySelector('.leaflet-pane')).toBeNull()
    expect(document.querySelector('.leaflet-marker-icon')).toBeNull()

    const second = setup({ pin: LAHUG, view: CLOSE })
    expect(second.calls.onReady).toHaveBeenCalledTimes(1)
    expect(pinIcon()).toBeInTheDocument()
  })
})

describe('LeafletMap at the zoom a pin needs', () => {
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
})

describe('LeafletMap zoom buttons', () => {
  // The zoom of the map, as the tiles on it say.
  const zoomLevels = () =>
    [...new Set(tiles().map((tile) => Number(/\/(\d+)\/\d+\/\d+\.png$/.exec(tile.getAttribute('src') ?? '')?.[1])))].sort((a, b) => a - b)
  const zoomIn = () => screen.getByRole('button', { name: 'Zoom in' })
  const zoomOut = () => screen.getByRole('button', { name: 'Zoom out' })

  it('answer to the Space key like buttons do, and keep the order sheet from scrolling', () => {
    setup({ view: { center: LAHUG, zoom: 10 } })
    expect(zoomLevels()).toEqual([10])

    // fireEvent says false when a handler cancelled the event: the browser does not scroll the page.
    expect(fireEvent.keyDown(zoomIn(), { key: ' ' })).toBe(false)
    expect(zoomLevels()).toEqual([11])
    expect(fireEvent.keyDown(zoomOut(), { key: ' ' })).toBe(false)
    expect(zoomLevels()).toEqual([10])
  })

  it('zoom once while the key is held down, and leave every other key alone', () => {
    setup({ view: { center: LAHUG, zoom: 10 } })
    fireEvent.keyDown(zoomIn(), { key: ' ' })
    fireEvent.keyDown(zoomIn(), { key: ' ', repeat: true })
    fireEvent.keyDown(zoomIn(), { key: ' ', repeat: true })
    expect(zoomLevels()).toEqual([11])

    expect(fireEvent.keyDown(zoomIn(), { key: 'a' })).toBe(true)
    expect(zoomLevels()).toEqual([11])
  })

  it('still answer to Enter, which a link does by itself', () => {
    setup({ view: { center: LAHUG, zoom: 10 } })
    fireEvent.click(zoomIn())
    expect(zoomLevels()).toEqual([11])
  })

  it('are the only ones that take the Space key: the map itself leaves it to the page', () => {
    setup({ view: { center: LAHUG, zoom: 10 } })
    expect(fireEvent.keyDown(region(), { key: ' ' })).toBe(true)
    expect(zoomLevels()).toEqual([10])
  })
})

describe('LeafletMap panning with the keyboard', () => {
  const mapPane = () => document.querySelector<HTMLElement>('.leaflet-map-pane')!
  // Leaflet listens for the arrow keys on the document, and only while the map has the focus.
  const panRight = () => {
    act(() => region().focus())
    fireEvent.keyDown(region(), { key: 'ArrowRight', keyCode: 39 })
  }

  it('moves the map at once, without a slide, for a customer who asked for reduced motion', () => {
    reduceMotion(true)
    setup({ view: CLOSE })
    panRight()
    expect(Number.parseFloat(mapPane().style.left)).toBeLessThan(0)
    expect(mapPane()).not.toHaveClass('leaflet-pan-anim')
  })

  it('slides for everyone else, which is what the test above leaves out', () => {
    reduceMotion(false)
    setup({ view: CLOSE })
    panRight()
    expect(mapPane()).toHaveClass('leaflet-pan-anim')
  })

  // At the start the whole country plus its margin is narrower than the map box, so any drag leaves the edge it is held
  // by and, when it is let go, the map comes back. Leaflet listens on the document: the events start at the map.
  const dragAndLetGo = () => {
    fireEvent.mouseDown(region(), { clientX: CENTER, clientY: CENTER, button: 0, which: 1 })
    fireEvent.mouseMove(region(), { clientX: CENTER + 60, clientY: CENTER })
    fireEvent.mouseUp(region(), { clientX: CENTER + 60, clientY: CENTER })
  }

  it('also snaps back inside its edges at once, for a customer who asked for reduced motion', () => {
    reduceMotion(true)
    setup()
    dragAndLetGo()
    expect(mapPane()).not.toHaveClass('leaflet-pan-anim')
  })

  it('slides back for everyone else, which is what the test above leaves out', () => {
    reduceMotion(false)
    setup()
    dragAndLetGo()
    expect(mapPane()).toHaveClass('leaflet-pan-anim')
  })
})

describe('LeafletMap pin picture', () => {
  it('lets every press through to the pin itself, so that the pin is the one that is held and lifts', async () => {
    const takeOut = await installStylesheet('LeafletMap.module.css', styles)
    try {
      setup({ view: CLOSE, pin: LAHUG })
      // Leaflet marks the element that was pressed as the one being dragged. The lift is a rule for the pin, and the
      // drawing inside it must not be the one that is pressed.
      expect(getComputedStyle(pinIcon()!.querySelector('svg')!).pointerEvents).toBe('none')
    } finally {
      takeOut()
    }
  })
})
