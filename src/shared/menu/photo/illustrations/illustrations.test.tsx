import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Illustration } from '../Illustration'
import { PLACEHOLDERS } from '../placeholders'

/*
 * The nine placeholder drawings are one family: a 64 x 64 line drawing in the menu's own color with a few faint fills, hidden
 * from assistive technology, never focusable, without words or anything fetched from elsewhere, and small.
 */

const FILES: Record<(typeof PLACEHOLDERS)[number], string> = {
  cup: 'Cup',
  iced: 'Iced',
  boba: 'Boba',
  bowl: 'Bowl',
  plate: 'Plate',
  pastry: 'Pastry',
  slice: 'Slice',
  burger: 'Burger',
  cocktail: 'Cocktail',
}

function drawing(kind: (typeof PLACEHOLDERS)[number]): SVGSVGElement {
  const { container } = render(<Illustration kind={kind} />)
  const svg = container.querySelector('svg')
  if (svg === null) throw new Error(`${kind} draws no svg`)
  return svg
}

async function source(name: string): Promise<string> {
  const node = 'node:fs'
  const { readFileSync } = (await import(/* @vite-ignore */ node)) as { readFileSync(path: string, encoding: 'utf8'): string }
  return readFileSync(`src/shared/menu/photo/illustrations/${name}Illustration.tsx`, 'utf8')
}

describe('the placeholder illustrations', () => {
  it.each(PLACEHOLDERS)('%s is a hidden 64 x 64 line drawing in currentColor with round strokes of 2', (kind) => {
    const svg = drawing(kind)
    expect(svg.getAttribute('viewBox')).toBe('0 0 64 64')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(svg.getAttribute('stroke-linecap')).toBe('round')
    expect(svg.getAttribute('fill')).toBe('none')
  })

  it.each(PLACEHOLDERS)('%s has no words, no links and nothing fetched', (kind) => {
    const svg = drawing(kind)
    expect(svg.textContent).toBe('')
    expect(svg.querySelector('text, image, use, a, foreignObject, style, script')).toBeNull()
    expect(svg.outerHTML).not.toMatch(/href|url\(/i)
  })

  it.each(PLACEHOLDERS)('%s fills only faintly, in its own color', (kind) => {
    const svg = drawing(kind)
    const filled = [...svg.querySelectorAll('[fill-opacity]')]
    expect(filled.length).toBeGreaterThan(0)
    for (const shape of filled) {
      const opacity = Number(shape.getAttribute('fill-opacity'))
      expect(opacity).toBeGreaterThanOrEqual(0.12)
      expect(opacity).toBeLessThanOrEqual(0.35)
    }
    for (const shape of svg.querySelectorAll('[fill]')) expect(['none', 'currentColor']).toContain(shape.getAttribute('fill'))
  })

  it('draws nine different pictures', () => {
    const markup = new Set(PLACEHOLDERS.map((kind) => drawing(kind).innerHTML))
    expect(markup.size).toBe(PLACEHOLDERS.length)
  })

  it.each(PLACEHOLDERS)('%s stays under 1.5 KB of source', async (kind) => {
    expect((await source(FILES[kind])).length).toBeLessThan(1536)
  })
})
