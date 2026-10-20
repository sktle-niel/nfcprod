import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import styles from './MapPicker.module.css'
import { declaredValue, installStylesheet } from './MapPicker.stylekit'
import { openMap, resetKit, setup } from './MapPicker.testkit'

// What the stylesheet of the panel does, with the stylesheet itself in the page (see MapPicker.stylekit.ts).
vi.mock('./LeafletMap', async () => ({ LeafletMap: (await import('./MapPicker.fakeMap')).FakeLeafletMap }))
vi.mock('@/data/resolveAddress', () => ({ resolveAddress: vi.fn() }))
beforeEach(resetKit)

let takeOut = () => {}
afterEach(() => takeOut())

describe('MapPicker stylesheet', () => {
  it('keeps the empty search note in the accessibility tree, clipped out of the way', async () => {
    takeOut = await installStylesheet('MapPicker.module.css', styles)
    const { user } = setup()
    await openMap(user)

    // With display:none this query finds nothing: a screen reader would meet the region with its first words in it.
    const note = within(screen.getByRole('search')).getByRole('status')
    const style = getComputedStyle(note)
    expect(style.display).not.toBe('none')
    expect(style.position).toBe('absolute')
    expect(style.width).toBe('1px')
    expect(style.height).toBe('1px')
    expect(style.overflow).toBe('hidden')
  })

  it('leaves the notice about a map that cannot load hidden until it has words, because it takes the keyboard too', async () => {
    takeOut = await installStylesheet('MapPicker.module.css', styles)
    setup()
    const notice = document.querySelector(`.${styles.notice}`)
    expect(notice).toBeEmptyDOMElement()
    expect(getComputedStyle(notice!).display).toBe('none')
  })

  it('reserves three lines of room for the status line, which now sits above the map', async () => {
    const value = await declaredValue('MapPicker.module.css', '.status', 'min-height')
    expect(value).toMatch(/em$/)
    expect(Number.parseFloat(value ?? '')).toBeGreaterThanOrEqual(4.2)
  })

  it('lets the frame of the map shrink on a short screen, so it never covers all the room the sheet has', async () => {
    const value = await declaredValue('MapPicker.module.css', '.frame', 'height')
    const floor = /^clamp\((\d+)px,/.exec(value ?? '')
    expect(Number(floor?.[1])).toBeLessThanOrEqual(150)
    // It follows the height of the screen, less the room the order bar and the fields around the map keep.
    expect(value).toMatch(/calc\(100dvh - \d+px\)/)
  })
})
