import { render } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrollToSection } from './anchorScroll'
import { useReveal } from './useReveal'

type Answer = (entries: { isIntersecting: boolean }[]) => void

/** An IntersectionObserver the test drives by hand. */
class FakeObserver {
  static live: FakeObserver[] = []
  options: IntersectionObserverInit | undefined
  answer: Answer
  disconnected = false
  constructor(answer: Answer, options?: IntersectionObserverInit) {
    this.answer = answer
    this.options = options
    FakeObserver.live.push(this)
  }
  observe() {}
  disconnect() {
    this.disconnected = true
  }
}

const motionAllowed = (allowed: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: allowed ? false : query.includes('reduce') }))

/** jsdom lays nothing out: the box's top is what the test says, here well below an 800 px screen. */
const measuredAt = (top: number) => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top } as DOMRect)

function Section({ interactive = true }: { interactive?: boolean }) {
  const reveal = useReveal(interactive)
  return <section ref={reveal} data-testid="section" id="target" />
}

const state = (container: HTMLElement) => container.querySelector('section')?.getAttribute('data-reveal') ?? null

beforeEach(() => {
  FakeObserver.live = []
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  vi.stubGlobal('innerHeight', 800)
  motionAllowed(true)
  measuredAt(2000)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useReveal', () => {
  it('holds a section below the fold, then lets it arrive once as it nears the screen', () => {
    const { container } = render(<Section />)
    expect(state(container)).toBe('waiting')
    const observer = FakeObserver.live[0] as FakeObserver
    expect(observer.options?.rootMargin).toBe('0px 0px 64px 0px')
    observer.answer([{ isIntersecting: false }])
    expect(state(container)).toBe('waiting')
    observer.answer([{ isIntersecting: true }])
    expect(state(container)).toBe('arriving')
    expect(observer.disconnected).toBe(true)
  })

  it('does not hold a section already on screen, or above it', () => {
    for (const top of [0, 799, -300]) {
      vi.restoreAllMocks()
      measuredAt(top)
      const { container, unmount } = render(<Section />)
      expect(state(container)).toBeNull()
      unmount()
    }
    expect(FakeObserver.live).toEqual([])
  })

  it('does nothing with interactive false', () => {
    const { container } = render(<Section interactive={false} />)
    expect(state(container)).toBeNull()
    expect(FakeObserver.live).toEqual([])
  })

  it('does nothing under prefers-reduced-motion', () => {
    motionAllowed(false)
    const { container } = render(<Section />)
    expect(state(container)).toBeNull()
    expect(FakeObserver.live).toEqual([])
  })

  it('leaves the content visible with no observer', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const { container } = render(<Section />)
    expect(state(container)).toBeNull()
  })

  it('leaves the content visible when the observer cannot start', () => {
    class Broken {
      constructor() {
        throw new Error('no')
      }
    }
    vi.stubGlobal('IntersectionObserver', Broken)
    const { container } = render(<Section />)
    expect(state(container)).toBeNull()
  })

  it('leaves the content visible when observing fails', () => {
    class Broken extends FakeObserver {
      override observe() {
        throw new Error('no')
      }
    }
    vi.stubGlobal('IntersectionObserver', Broken)
    const { container } = render(<Section />)
    expect(state(container)).toBeNull()
  })

  it('shows the section when the observer stays silent', () => {
    vi.useFakeTimers()
    const { container } = render(<Section />)
    expect(state(container)).toBe('waiting')
    vi.advanceTimersByTime(1000)
    expect(state(container)).toBe('arriving')
    expect((FakeObserver.live[0] as FakeObserver).disconnected).toBe(true)
  })

  it('keeps waiting for the scroll once the observer has answered', () => {
    vi.useFakeTimers()
    const { container } = render(<Section />)
    ;(FakeObserver.live[0] as FakeObserver).answer([{ isIntersecting: false }])
    vi.advanceTimersByTime(60_000)
    expect(state(container)).toBe('waiting')
  })

  it('lifts the hold when the page turns into a preview', () => {
    const { container, rerender } = render(<Section />)
    expect(state(container)).toBe('waiting')
    rerender(<Section interactive={false} />)
    expect(state(container)).toBeNull()
    expect((FakeObserver.live[0] as FakeObserver).disconnected).toBe(true)
  })

  it('stops watching on unmount', () => {
    const { unmount } = render(<Section />)
    unmount()
    expect((FakeObserver.live[0] as FakeObserver).disconnected).toBe(true)
  })

  it('does not restart on a re-render', () => {
    const { container, rerender } = render(<Section />)
    ;(FakeObserver.live[0] as FakeObserver).answer([{ isIntersecting: true }])
    rerender(<Section />)
    expect(state(container)).toBe('arriving')
    expect(FakeObserver.live).toHaveLength(1)
  })

  it('survives Strict Mode, which attaches a ref twice', () => {
    const { container } = render(
      <StrictMode>
        <Section />
      </StrictMode>,
    )
    expect(state(container)).toBe('waiting')
    expect(FakeObserver.live.filter((observer) => !observer.disconnected)).toHaveLength(1)
  })

  it('works on many elements with one ref', () => {
    function Many() {
      const reveal = useReveal(true)
      return ['a', 'b', 'c'].map((id) => <section key={id} ref={reveal} />)
    }
    const { container } = render(<Many />)
    expect(container.querySelectorAll('[data-reveal="waiting"]')).toHaveLength(3)
    ;(FakeObserver.live[1] as FakeObserver).answer([{ isIntersecting: true }])
    expect(container.querySelectorAll('[data-reveal="waiting"]')).toHaveLength(2)
  })

  it('settles a waiting section for a link that jumps to it, so the scroll lands true', () => {
    const { container } = render(<Section />)
    const target = container.querySelector('section') as HTMLElement
    let heldDuringScroll: string | null = 'unset'
    target.scrollIntoView = () => {
      heldDuringScroll = target.getAttribute('data-reveal')
    }
    scrollToSection({ preventDefault() {} } as never, 'target')
    expect(heldDuringScroll).toBeNull()
    ;(FakeObserver.live[0] as FakeObserver).answer([{ isIntersecting: true }])
    expect(state(container)).toBeNull()
  })
})
