import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePictureSize } from './usePictureSize'

const loaded: string[] = []

/** jsdom never loads pictures: this probe "loads" at once, 800 by 600. */
class ProbeImage {
  onload: (() => void) | null = null
  naturalWidth = 800
  naturalHeight = 600
  set src(address: string) {
    loaded.push(address)
    queueMicrotask(() => this.onload?.())
  }
}

afterEach(() => {
  loaded.length = 0
  vi.unstubAllGlobals()
})

describe('usePictureSize', () => {
  it('reads the size of a picture once it has loaded, and forgets it for another address', async () => {
    vi.stubGlobal('Image', ProbeImage)
    const { result, rerender } = renderHook(({ src }) => usePictureSize(src), { initialProps: { src: 'data:image/png;base64,AAAA' } })
    expect(result.current).toBeNull()
    await act(async () => {})
    expect(result.current).toEqual({ width: 800, height: 600 })
    rerender({ src: 'data:image/png;base64,BBBB' })
    expect(result.current).toBeNull()
    await act(async () => {})
    expect(result.current).toEqual({ width: 800, height: 600 })
    expect(loaded).toEqual(['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB'])
  })

  it('does no work at all for null', async () => {
    vi.stubGlobal('Image', ProbeImage)
    const { result } = renderHook(() => usePictureSize(null))
    await act(async () => {})
    expect(result.current).toBeNull()
    expect(loaded).toHaveLength(0)
  })
})
