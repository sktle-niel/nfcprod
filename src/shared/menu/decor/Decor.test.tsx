import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DECORS, DEFAULT_THEME, type DecorKind } from '@/entities/theme/theme'
import { LookProvider, lookOf } from '../look'
import { Decor } from './Decor'

/*
 * Each set of line art is a few outline drawings in the corners of the menu: hidden from assistive technology, never
 * focusable or clickable, without words, and drawn in the menu's own color.
 */

const SETS = DECORS.filter((decor): decor is Exclude<DecorKind, 'none'> => decor !== 'none')

function drawn(decor: DecorKind) {
  return render(
    <LookProvider value={lookOf({ ...DEFAULT_THEME, decor })}>
      <Decor />
    </LookProvider>,
  ).container
}

describe('the decoration', () => {
  it('draws nothing when the look has none', () => {
    expect(drawn('none').innerHTML).toBe('')
  })

  it('has six sets', () => {
    expect(SETS).toEqual(['coffee', 'leaves', 'dining', 'bakery', 'bar', 'sparkles'])
  })

  it.each(SETS)('%s is a hidden layer of four to six placed drawings', (decor) => {
    const container = drawn(decor)
    const layer = container.firstElementChild
    expect(layer?.getAttribute('aria-hidden')).toBe('true')
    const pieces = container.querySelectorAll('svg')
    expect(pieces.length).toBeGreaterThanOrEqual(4)
    expect(pieces.length).toBeLessThanOrEqual(6)
    for (const svg of pieces) {
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(svg.getAttribute('focusable')).toBe('false')
      expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/)
      expect(svg.hasAttribute('class')).toBe(true)
    }
  })

  it.each(SETS)('%s is line art in currentColor with strokes of 1.5 to 2', (decor) => {
    for (const svg of drawn(decor).querySelectorAll('svg')) {
      expect(svg.getAttribute('stroke')).toBe('currentColor')
      expect(svg.getAttribute('fill')).toBe('none')
      const width = Number(svg.getAttribute('stroke-width'))
      expect(width).toBeGreaterThanOrEqual(1.5)
      expect(width).toBeLessThanOrEqual(2)
      for (const shape of svg.querySelectorAll('[fill]')) expect(shape.getAttribute('fill')).toBe('currentColor')
      for (const shape of svg.querySelectorAll('[fill-opacity]')) expect(Number(shape.getAttribute('fill-opacity'))).toBeLessThanOrEqual(0.35)
    }
  })

  it.each(SETS)('%s has no words, nothing to focus or click, and nothing fetched', (decor) => {
    const container = drawn(decor)
    expect(container.textContent).toBe('')
    expect(container.querySelector('a, button, input, [tabindex], text, image, use, foreignObject, style, script')).toBeNull()
    expect(container.innerHTML).not.toMatch(/href|url\(/i)
  })
})
