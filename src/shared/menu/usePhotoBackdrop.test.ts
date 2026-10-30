import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { styleTheme } from '@/entities/theme/styles'
import { DEFAULT_THEME, type Theme } from '@/entities/theme/theme'
import { PHOTO_UPSCALE_MAX, photoFallback, photoFits, usePhotoBackdrop } from './usePhotoBackdrop'

const PHOTO = 'data:image/png;base64,AAAA'
const roastWithPhoto = (patch: Partial<Theme> = {}): Theme => ({ ...styleTheme('roast', 'light'), backdrop: 'picture', backdropPicture: PHOTO, ...patch })

/** jsdom never loads pictures: this probe "loads" at once, 800 px wide. */
class ProbeImage {
  onload: (() => void) | null = null
  naturalWidth = 800
  naturalHeight = 600
  set src(_address: string) {
    queueMicrotask(() => this.onload?.())
  }
}

type Entry = { contentRect: { width: number } }
let resize: ((entries: Entry[]) => void) | null = null
const observed: Element[] = []

/** A ResizeObserver the test drives by hand. */
class FakeResizeObserver {
  constructor(callback: (entries: Entry[]) => void) {
    resize = callback
  }
  observe(element: Element) {
    observed.push(element)
  }
  disconnect() {
    resize = null
  }
}

const screenIs = (width: number) => act(() => resize?.([{ contentRect: { width } }]))

afterEach(() => {
  vi.unstubAllGlobals()
  resize = null
  observed.length = 0
})

describe('photoFits', () => {
  it('lets a photo stretch to half again its width and no further, and says yes while a size is unknown', () => {
    expect(PHOTO_UPSCALE_MAX).toBe(1.5)
    expect(photoFits(1200, 800)).toBe(true)
    expect(photoFits(1201, 800)).toBe(false)
    expect(photoFits(390, 800)).toBe(true)
    expect(photoFits(null, 800)).toBe(true)
    expect(photoFits(1201, null)).toBe(true)
    expect(photoFits(0, 800)).toBe(true)
    expect(photoFits(1201, 0)).toBe(true)
  })
})

describe('photoFallback', () => {
  it('is the texture of the style the look started from, in its mode, and plain for Classic or a style off the list', () => {
    expect(photoFallback(roastWithPhoto())).toBe('grain')
    expect(photoFallback({ ...styleTheme('gourmet', 'dark'), backdrop: 'picture' })).toBe('marble')
    expect(photoFallback({ ...DEFAULT_THEME, backdrop: 'picture' })).toBe('plain')
    expect(photoFallback({ ...roastWithPhoto(), style: 'vapor' as Theme['style'] })).toBe('plain')
  })
})

describe('usePhotoBackdrop', () => {
  it('keeps the photo until the screen is wider than it can fill, paints the style texture then, and brings the photo back', async () => {
    vi.stubGlobal('Image', ProbeImage)
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const theme = roastWithPhoto()
    const { result } = renderHook(() => usePhotoBackdrop(theme))
    expect(result.current.layer).toBe(true)
    expect(result.current.theme).toBe(theme)
    const node = document.createElement('div')
    // With a ResizeObserver the layer only starts watching here; the widths arrive through it (screenIs).
    const cleanup = result.current.layerRef(node)
    await act(async () => {})
    expect(observed).toEqual([node])
    expect(result.current.theme).toBe(theme)
    screenIs(1200)
    expect(result.current.theme.backdrop).toBe('picture')
    screenIs(1201)
    expect(result.current.theme).toEqual({ ...theme, backdrop: 'grain', backdropPicture: null })
    // The layer stays, so the width is still measured and the photo returns on a narrower screen.
    expect(result.current.layer).toBe(true)
    screenIs(390)
    expect(result.current.theme).toBe(theme)
    // The cleanup React runs when the layer goes stops the watching.
    expect(typeof cleanup).toBe('function')
    if (typeof cleanup === 'function') cleanup()
    expect(resize).toBeNull()
  })

  it('measures once, without a ResizeObserver, from the layer itself', async () => {
    vi.stubGlobal('Image', ProbeImage)
    vi.stubGlobal('ResizeObserver', undefined)
    const { result } = renderHook(() => usePhotoBackdrop(roastWithPhoto()))
    const node = document.createElement('div')
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({ width: 2000 } as DOMRect)
    act(() => {
      result.current.layerRef(node)
    })
    await act(async () => {})
    expect(result.current.theme.backdrop).toBe('grain')
  })

  it('has no layer and changes nothing for a menu without a photo backdrop', async () => {
    vi.stubGlobal('Image', ProbeImage)
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const texture = styleTheme('roast', 'light')
    const noPhoto = roastWithPhoto({ backdropPicture: null })
    const first = renderHook(() => usePhotoBackdrop(texture))
    const second = renderHook(() => usePhotoBackdrop(noPhoto))
    await act(async () => {})
    expect(first.result.current.layer).toBe(false)
    expect(first.result.current.theme).toBe(texture)
    expect(second.result.current.layer).toBe(false)
    expect(second.result.current.theme).toBe(noPhoto)
  })
})
