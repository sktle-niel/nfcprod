import type { AnimationOptions, EaseToOptions, JumpToOptions, LngLatLike, MapOptions, MarkerOptions, Subscription } from 'maplibre-gl'
import { vi } from 'vitest'

/**
 * A stand-in for the parts of `maplibre-gl` the delivery map uses. jsdom has no WebGL, no layout and no canvas context,
 * so the real library cannot run under Vitest. This one keeps a center and a zoom (on the library's 512-px scale, like
 * the real one), draws nothing, and raises the events the real map would: a DOM click inside the map becomes a map
 * `click` with the spot under the pointer, a press on a draggable marker starts a drag that the map's mouse events move
 * and end, and a test can `fire` any other event itself. Mount a test with
 * `vi.mock('maplibre-gl', () => import('@/test/maplibre'))` and reach the maps it made through `fake`. The names and
 * shapes follow the real `maplibre-gl.d.ts`; the renderer is type-checked against that, so a name this file gets wrong
 * would not compile there.
 */

/** Every fake map is this many pixels wide and high, with its top left at the page's origin: jsdom has no layout. */
export const MAP_SIZE = 320

type Point = { x: number; y: number }
type FakeEvent = { type: string; target: unknown; [key: string]: unknown }
type Listener = (event: FakeEvent) => void
/** What the map's mouse events carry, as the real `MapMouseEvent` does. */
type FakeMouseEvent = FakeEvent & { originalEvent: MouseEvent; point: Point; lngLat: LngLat }

export class LngLat {
  lng: number
  lat: number

  constructor(lng: number, lat: number) {
    this.lng = lng
    this.lat = lat
  }

  toArray(): [number, number] {
    return [this.lng, this.lat]
  }

  static convert(like: LngLatLike): LngLat {
    if (Array.isArray(like)) return new LngLat(like[0], like[1])
    if ('lon' in like) return new LngLat(like.lon, like.lat)
    return new LngLat(like.lng, like.lat)
  }
}

/** What the real `Evented` does: listeners by event name, events as objects with `type` and `target`. */
class Emitter {
  private readonly listeners = new Map<string, Set<Listener>>()

  on(type: string, listener: Listener): Subscription {
    const set = this.listeners.get(type) ?? new Set()
    set.add(listener)
    this.listeners.set(type, set)
    return { unsubscribe: () => void this.off(type, listener) }
  }

  off(type: string, listener: Listener): this {
    this.listeners.get(type)?.delete(listener)
    return this
  }

  once(type: string, listener: Listener): this {
    const wrapped: Listener = (event) => {
      this.off(type, wrapped)
      listener(event)
    }
    this.on(type, wrapped)
    return this
  }

  /** Raises an event. `data` is spread into it, as the real library does with the properties it is given. */
  fire(type: string, data: object = {}): this {
    const event = { ...data, type, target: this }
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event)
    return this
  }
}

// The library's tile size, which is why the same scale is one zoom level less than the app's 256-px numbers.
const TILE_SIZE = 512
const RADIANS = Math.PI / 180

/** Web Mercator: a spot as pixels of the whole world at `zoom`. */
function toWorld({ lng, lat }: LngLat, zoom: number): Point {
  const size = TILE_SIZE * 2 ** zoom
  const stretched = Math.log(Math.tan(Math.PI / 4 + (lat * RADIANS) / 2))
  return { x: ((lng + 180) / 360) * size, y: ((1 - stretched / Math.PI) / 2) * size }
}

function fromWorld({ x, y }: Point, zoom: number): LngLat {
  const size = TILE_SIZE * 2 ** zoom
  const lat = (2 * Math.atan(Math.exp(Math.PI * (1 - (2 * y) / size))) - Math.PI / 2) / RADIANS
  return new LngLat((x / size) * 360 - 180, lat)
}

/** One of the map's gesture handlers: a switch, with the calls on it recorded. */
function handler(enabled: boolean) {
  const state = { enabled }
  return {
    enable: vi.fn(() => {
      state.enabled = true
    }),
    disable: vi.fn(() => {
      state.enabled = false
    }),
    isEnabled: () => state.enabled,
    disableRotation: vi.fn(),
    enableRotation: vi.fn(),
  }
}

/** A move asked of the map, as it was asked. The fake moves at once and keeps the request for the tests to read. */
export type Move = { method: 'jumpTo' | 'easeTo' | 'zoomIn' | 'zoomOut'; options: object }

export class FakeMap extends Emitter {
  readonly options: MapOptions
  readonly container: HTMLElement
  readonly canvasContainer: HTMLDivElement
  readonly canvas: HTMLCanvasElement
  readonly scrollZoom: ReturnType<typeof handler>
  readonly keyboard: ReturnType<typeof handler>
  readonly touchZoomRotate: ReturnType<typeof handler>
  readonly dragRotate: ReturnType<typeof handler>
  readonly dragPan: ReturnType<typeof handler>
  /** Every move asked of the map since it was made, oldest first. */
  readonly moves: Move[] = []
  removed = false
  private center: LngLat
  private zoom: number

  constructor(options: MapOptions) {
    super()
    if (fake.refuseNext) {
      const error = fake.refuseNext
      fake.refuseNext = null
      throw error
    }
    if (!(options.container instanceof HTMLElement)) throw new Error('The fake map takes an element, not an id')
    this.options = options
    this.container = options.container
    this.center = LngLat.convert(options.center ?? [0, 0])
    this.zoom = this.clampZoom(options.zoom ?? 0)
    this.scrollZoom = handler(options.scrollZoom !== false)
    this.keyboard = handler(options.keyboard !== false)
    this.touchZoomRotate = handler(options.touchZoomRotate !== false)
    this.dragRotate = handler(options.dragRotate !== false)
    this.dragPan = handler(options.dragPan !== false)

    // The DOM the real map builds: a canvas container with the canvas, which is the named, focusable part.
    this.container.classList.add('maplibregl-map')
    this.canvasContainer = document.createElement('div')
    this.canvasContainer.className = 'maplibregl-canvas-container maplibregl-interactive'
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'maplibregl-canvas'
    this.canvas.setAttribute('tabindex', '0')
    this.canvas.setAttribute('role', 'region')
    this.canvas.setAttribute('aria-label', options.locale?.['Map.Title'] ?? 'Map')
    this.canvasContainer.append(this.canvas)
    this.container.append(this.canvasContainer)

    // What the real handlers make of these DOM events: a map event of the same name, with the spot under the pointer.
    // Markers live inside the canvas container, so their presses and clicks reach the map too, as they do for real.
    for (const type of ['mousedown', 'mousemove', 'mouseup', 'click'] as const) {
      this.canvasContainer.addEventListener(type, (event) => {
        const point = { x: event.clientX, y: event.clientY }
        this.fire(type, { originalEvent: event, point, lngLat: this.unproject(point) })
      })
    }
    fake.maps.push(this)
  }

  override fire(type: string, data: object = {}): this {
    super.fire(type, data)
    // The real map raises `sourcedata` or `styledata` after every `data` event, with the same properties.
    if (type === 'data' && 'dataType' in data) super.fire(`${String(data.dataType)}data`, data)
    return this
  }

  private clampZoom(zoom: number): number {
    return Math.min(Math.max(zoom, this.options.minZoom ?? 0), this.options.maxZoom ?? 22)
  }

  getZoom(): number {
    return this.zoom
  }

  getCenter(): LngLat {
    return this.center
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  getCanvasContainer(): HTMLElement {
    return this.canvasContainer
  }

  getContainer(): HTMLElement {
    return this.container
  }

  /** Where a spot falls on the box: the middle of the box shows the center of the map. */
  project(spot: LngLatLike): Point {
    const at = toWorld(LngLat.convert(spot), this.zoom)
    const middle = toWorld(this.center, this.zoom)
    return { x: at.x - middle.x + MAP_SIZE / 2, y: at.y - middle.y + MAP_SIZE / 2 }
  }

  unproject(point: Point): LngLat {
    const middle = toWorld(this.center, this.zoom)
    return fromWorld({ x: middle.x + point.x - MAP_SIZE / 2, y: middle.y + point.y - MAP_SIZE / 2 }, this.zoom)
  }

  setCenter(center: LngLatLike): this {
    this.moveTo({ center })
    return this
  }

  jumpTo(options: JumpToOptions): this {
    this.moves.push({ method: 'jumpTo', options })
    this.moveTo(options)
    return this
  }

  easeTo(options: EaseToOptions): this {
    this.moves.push({ method: 'easeTo', options })
    this.moveTo(options)
    return this
  }

  zoomIn(options: AnimationOptions = {}): this {
    this.moves.push({ method: 'zoomIn', options })
    this.moveTo({ zoom: this.zoom + 1 })
    return this
  }

  zoomOut(options: AnimationOptions = {}): this {
    this.moves.push({ method: 'zoomOut', options })
    this.moveTo({ zoom: this.zoom - 1 })
    return this
  }

  remove(): void {
    this.removed = true
    this.canvasContainer.remove()
    this.container.classList.remove('maplibregl-map')
    this.fire('remove')
  }

  /** Moves at once, with the events the real map raises around a move: the zoom ones only when the zoom changes. */
  private moveTo({ center, zoom }: { center?: LngLatLike | undefined; zoom?: number | undefined }): void {
    const next = zoom === undefined ? this.zoom : this.clampZoom(zoom)
    const zooming = next !== this.zoom
    this.fire('movestart')
    if (zooming) this.fire('zoomstart')
    if (center !== undefined) this.center = LngLat.convert(center)
    this.zoom = next
    this.fire('move')
    if (zooming) this.fire('zoom')
    if (zooming) this.fire('zoomend')
    this.fire('moveend')
  }
}

export class FakeMarker extends Emitter {
  readonly options: MarkerOptions
  private readonly element: HTMLElement
  private map: FakeMap | null = null
  private lngLat = new LngLat(0, 0)

  constructor(options: MarkerOptions = {}) {
    super()
    this.options = options
    this.element = options.element ?? document.createElement('div')
    this.element.classList.add('maplibregl-marker')
    fake.markers.push(this)
  }

  getElement(): HTMLElement {
    return this.element
  }

  getLngLat(): LngLat {
    return this.lngLat
  }

  isDraggable(): boolean {
    return this.options.draggable ?? false
  }

  setLngLat(spot: LngLatLike): this {
    this.lngLat = LngLat.convert(spot)
    this.place()
    return this
  }

  addTo(map: FakeMap): this {
    this.remove()
    this.map = map
    map.getCanvasContainer().append(this.element)
    map.on('move', this.place)
    map.on('mousedown', this.press)
    this.place()
    return this
  }

  remove(): this {
    this.map?.off('move', this.place)
    this.map?.off('mousedown', this.press)
    this.map = null
    this.element.remove()
    return this
  }

  /** Writes the box's place on the map the way the real marker does, so a test can watch it move. */
  private readonly place = (): void => {
    if (!this.map) return
    const { x, y } = this.map.project(this.lngLat)
    this.element.style.transform = `translate(${x}px, ${y}px)`
  }

  /** A press on the marker starts a drag, as in the real one: the map's mousemove moves it, its mouseup lets it go. */
  private readonly press = (event: FakeEvent): void => {
    const map = this.map
    const { originalEvent, point: from } = event as FakeMouseEvent
    const target = originalEvent.target
    if (!map || !this.isDraggable() || !(target instanceof Node) || !this.element.contains(target)) return
    const start = map.project(this.lngLat)
    let held = false
    const move = (moved: FakeEvent) => {
      const to = (moved as FakeMouseEvent).point
      if (!held) {
        held = true
        this.fire('dragstart')
      }
      this.lngLat = map.unproject({ x: start.x + to.x - from.x, y: start.y + to.y - from.y })
      this.place()
      this.fire('drag')
    }
    map.on('mousemove', move)
    map.once('mouseup', () => {
      map.off('mousemove', move)
      if (held) this.fire('dragend')
    })
  }
}

/** The maps and markers made so far, and two knobs. Call `reset` after each test. */
export const fake = {
  /** Every map made since the last `reset`, oldest first. */
  maps: [] as FakeMap[],
  /** Every marker made since the last `reset`, oldest first, removed ones included. */
  markers: [] as FakeMarker[],
  /** An error for the next map constructor to throw, as a browser without WebGL would. Used once. */
  refuseNext: null as Error | null,
  /** The worker URL the renderer registered, if any. Kept across resets: it is set once, when the renderer's code loads. */
  workerUrl: null as string | null,
  /** The newest map. */
  map(): FakeMap {
    const map = fake.maps.at(-1)
    if (!map) throw new Error('No map has been made')
    return map
  },
  reset(): void {
    fake.maps.length = 0
    fake.markers.length = 0
    fake.refuseNext = null
  },
}

export function setWorkerUrl(url: string): void {
  fake.workerUrl = url
}

export { FakeMap as Map, FakeMap as MapLibreMap, FakeMarker as Marker }
