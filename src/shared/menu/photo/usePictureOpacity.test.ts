import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasClearPixel, usePictureOpacity } from './usePictureOpacity'

const OPAQUE = new Uint8ClampedArray([0, 0, 0, 255, 10, 20, 30, 255])
const CLEAR = new Uint8ClampedArray([0, 0, 0, 255, 10, 20, 30, 0])

describe('hasClearPixel', () => {
  it('sees a see-through pixel and nothing in an all-opaque run', () => {
    expect(hasClearPixel(OPAQUE)).toBe(false)
    expect(hasClearPixel(CLEAR)).toBe(true)
    expect(hasClearPixel(new Uint8ClampedArray())).toBe(false)
  })
})

const loaded: { crossOrigin: string | null; address: string }[] = []

/** jsdom never loads pictures: this probe "loads" at once, so the hook's read runs. */
class ProbeImage {
  onload: (() => void) | null = null
  crossOrigin: string | null = null
  set src(address: string) {
    loaded.push({ crossOrigin: this.crossOrigin, address })
    queueMicrotask(() => this.onload?.())
  }
}

function withProbe(pixels: Uint8ClampedArray | null) {
  vi.stubGlobal('Image', ProbeImage)
  const context =
    pixels === null ? null : ({ drawImage: () => undefined, getImageData: () => ({ data: pixels }) } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
}

afterEach(() => {
  loaded.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('usePictureOpacity', () => {
  it('calls an all-opaque picture opaque', async () => {
    withProbe(OPAQUE)
    const { result } = renderHook(() => usePictureOpacity('data:image/png;base64,AAAA'))
    await act(async () => {})
    expect(result.current).toBe('opaque')
    // A data address is same-origin: no cross-origin request for it.
    expect(loaded[0]?.crossOrigin).toBeNull()
  })

  it('calls a picture with see-through parts clear', async () => {
    withProbe(CLEAR)
    const { result } = renderHook(() => usePictureOpacity('data:image/png;base64,AAAA'))
    await act(async () => {})
    expect(result.current).toBe('clear')
  })

  it('stays pending without a canvas to read on', async () => {
    withProbe(null)
    const { result } = renderHook(() => usePictureOpacity('data:image/png;base64,AAAA'))
    await act(async () => {})
    expect(result.current).toBe('pending')
  })

  it('asks for a readable cross-origin picture, and does no work at all for null', async () => {
    withProbe(OPAQUE)
    const stored = renderHook(() => usePictureOpacity('https://images.example.com/a.png'))
    await act(async () => {})
    expect(loaded[0]?.crossOrigin).toBe('anonymous')
    expect(stored.result.current).toBe('opaque')
    const skipped = renderHook(() => usePictureOpacity(null))
    await act(async () => {})
    expect(skipped.result.current).toBe('pending')
    expect(loaded).toHaveLength(1)
  })
})
