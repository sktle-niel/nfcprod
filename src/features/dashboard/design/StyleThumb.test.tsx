import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleMenu } from '@/test/ownerFixtures'
import { readCss, ruleBody } from '@/test/css'
import { StyleThumb } from './StyleThumb'
import { thumbBusiness } from './thumbs'

const business = thumbBusiness({ name: 'Kape Kanto', tagline: 'On the corner', logo: null, types: ['coffee'] })

type Watcher = { callback: (entries: { isIntersecting: boolean; contentRect?: { width: number } }[]) => void }

function fakeObserver(list: Watcher[]) {
  return class {
    constructor(callback: Watcher['callback']) {
      list.push({ callback })
    }
    observe() {}
    disconnect() {}
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StyleThumb', () => {
  it('draws the menu only once it comes near the screen', () => {
    const seen: Watcher[] = []
    vi.stubGlobal('IntersectionObserver', fakeObserver(seen))
    const { container } = render(<StyleThumb id="sunny" mode="light" business={business} menu={sampleMenu()} />)
    const box = container.querySelector('[data-style-thumb="sunny"]')!
    expect(box.querySelector('[data-menu-card]')).toBeNull()
    act(() => seen[0]?.callback([{ isIntersecting: true }]))
    expect(box.querySelector('[data-menu-card]')).toHaveAttribute('data-menu-card', 'badge')
  })

  it('draws at once where the browser cannot tell what is on screen, and shrinks the menu to the box', () => {
    const sizes: Watcher[] = []
    vi.stubGlobal('ResizeObserver', fakeObserver(sizes))
    const { container } = render(<StyleThumb id="noir" mode="dark" business={business} menu={sampleMenu()} />)
    const page = container.querySelector<HTMLElement>('[data-style-thumb="noir"] > div')!
    expect(page.querySelector('[data-menu-card]')).toHaveAttribute('data-menu-card', 'leader')
    act(() => sizes[0]?.callback([{ isIntersecting: false, contentRect: { width: 180 } }]))
    expect(page.style.getPropertyValue('--thumb-scale')).toBe('0.5')
  })

  it('is a picture only: hidden, inert, with nothing to focus', () => {
    const { container } = render(<StyleThumb id="classic" mode="light" business={business} menu={sampleMenu()} />)
    const box = container.querySelector('[data-style-thumb="classic"]')!
    expect(box).toHaveAttribute('aria-hidden', 'true')
    expect(box).toHaveAttribute('inert')
    expect(box.querySelector('a, button, [tabindex]')).toBeNull()
  })
})

describe('the style gallery stylesheet', () => {
  const FILE = 'src/features/dashboard/design/StyleGallery.module.css'

  it('keeps the radio above the picture, and the picture out of the way of taps', async () => {
    const css = await readCss(FILE)
    expect(ruleBody(css, '.input')).toMatch(/z-index:\s*1/)
    expect(ruleBody(css, '.thumb')).toMatch(/pointer-events:\s*none/)
    expect(ruleBody(css, '.thumb')).toMatch(/overflow:\s*hidden/)
    expect(ruleBody(css, '.thumb')).toMatch(/aspect-ratio/)
  })

  it('shows two styles side by side on a phone and three once the gallery is wide', async () => {
    const css = await readCss(FILE)
    expect(ruleBody(css, '.grid')).toMatch(/repeat\(2, minmax\(0, 1fr\)\)/)
    expect(css).toMatch(/@container \(min-width: 500px\)\s*\{\s*\.grid\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/)
  })

  it('marks the chosen style with more than color', async () => {
    const css = await readCss(FILE)
    expect(ruleBody(css, '.input:checked + .face::before')).toMatch(/border-width/)
  })
})
