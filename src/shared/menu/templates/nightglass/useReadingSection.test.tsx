import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReadingSection } from './useReadingSection'

const IDS = ['one', 'two', 'three']

function Harness({ ids = IDS, enabled = true }: { ids?: readonly string[]; enabled?: boolean }) {
  const active = useReadingSection(ids, enabled)
  return (
    <div>
      {ids.map((id) => (
        <section key={id} id={id} />
      ))}
      <output>{active}</output>
    </div>
  )
}

/** Puts the sections where a page would: `tops` are their distances from the top of the screen. */
function layOut(tops: number[], { scrollY = 0, scrollHeight = 3000, height = 800 } = {}) {
  tops.forEach((top, index) => {
    const element = document.getElementById(IDS[index] ?? '')
    if (element) vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top, height: 400, bottom: top + 400, left: 0, right: 390, width: 390, x: 0, y: top, toJSON: () => ({}) })
  })
  vi.stubGlobal('innerHeight', height)
  vi.stubGlobal('scrollY', scrollY)
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(scrollHeight)
}

let frames: FrameRequestCallback[] = []
const flushFrames = () => frames.splice(0).forEach((callback) => callback(0))
const scrolled = () =>
  act(() => {
    window.dispatchEvent(new Event('scroll'))
    flushFrames()
  })
const reading = () => Number(screen.getByRole('status').textContent)

describe('useReadingSection', () => {
  beforeEach(() => {
    // Frames wait in a queue, as in a browser: a callback never runs inside the requestAnimationFrame call that asked for it.
    frames = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts on the first section', () => {
    render(<Harness />)
    expect(reading()).toBe(0)
  })

  it('is the last section whose top has passed the line 35% down the screen', () => {
    render(<Harness />)
    layOut([-900, 200, 700])
    scrolled()
    expect(reading()).toBe(1)
    layOut([-1500, -600, 120])
    scrolled()
    expect(reading()).toBe(2)
  })

  it('stays on the first of two columns standing side by side, not on the later section at the top of the second', () => {
    render(<Harness />)
    layOut([200, 1500, 200])
    scrolled()
    expect(reading()).toBe(0)
    layOut([-1000, 100, -900])
    scrolled()
    expect(reading()).toBe(1)
  })

  it('is right after a jump back up too, where watching only the sections that cross a line would keep an old answer', () => {
    render(<Harness />)
    layOut([-1500, -600, 120])
    scrolled()
    expect(reading()).toBe(2)
    layOut([400, 1000, 1600])
    scrolled()
    expect(reading()).toBe(0)
  })

  it('is the last section at the very end of the page, when a short last section never reaches the line', () => {
    render(<Harness />)
    layOut([-1500, -600, 500], { scrollY: 2200, scrollHeight: 3000, height: 800 })
    scrolled()
    expect(reading()).toBe(2)
  })

  it('stays on the first section on a page that cannot scroll', () => {
    render(<Harness />)
    layOut([100, 600, 1100], { scrollY: 0, scrollHeight: 800, height: 800 })
    scrolled()
    expect(reading()).toBe(0)
  })

  it('stays on the first section where nothing has a layout (a test, a hidden page)', () => {
    render(<Harness />)
    scrolled()
    expect(reading()).toBe(0)
  })

  it('does nothing when it is not enabled, and stops listening when it goes away', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const off = render(<Harness enabled={false} />)
    expect(add).not.toHaveBeenCalledWith('scroll', expect.anything(), expect.anything())
    off.unmount()
    const remove = vi.spyOn(window, 'removeEventListener')
    const on = render(<Harness />)
    on.unmount()
    expect(remove).toHaveBeenCalledWith('scroll', expect.anything())
  })

  it('never answers past the last section when the list gets shorter', () => {
    const { rerender } = render(<Harness />)
    layOut([-1500, -600, 120])
    scrolled()
    expect(reading()).toBe(2)
    rerender(<Harness ids={['one']} />)
    expect(reading()).toBe(0)
  })
})
