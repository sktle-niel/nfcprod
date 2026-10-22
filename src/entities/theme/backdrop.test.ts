import { describe, expect, it } from 'vitest'
import { backdropLayers, BACKDROP_TILES, NEW_BACKDROPS } from './backdrop'
import { BACKDROPS, DEFAULT_THEME } from './theme'

const PALETTE = { background: '#f8f3ec', text: '#2b1d14', accent: '#8b5a2b' }
const DEFAULTS = { background: DEFAULT_THEME.background, text: DEFAULT_THEME.secondary, accent: DEFAULT_THEME.primary }
const CLASSIC = BACKDROPS.filter((name) => !(NEW_BACKDROPS as readonly string[]).includes(name))

/** The markup of an SVG image value, decoded; fails the test when the wrapper is not the double-quoted data URL. */
function svgOf(image: string): string {
  expect(image.startsWith('url("data:image/svg+xml,')).toBe(true)
  expect(image.endsWith('")')).toBe(true)
  const encoded = image.slice('url("data:image/svg+xml,'.length, -'")'.length)
  // Percent-encoded payload only: nothing that could close the url() wrapper or the attribute it is read from.
  expect(encoded).toMatch(/^(?:%[0-9A-Fa-f]{2}|[A-Za-z0-9\-_.!~*'()])+$/)
  return decodeURIComponent(encoded)
}

describe('backdropLayers', () => {
  it('lists the drawn kinds as the tail of the BACKDROPS list, each with a tile entry', () => {
    expect(BACKDROPS.slice(5)).toEqual([...NEW_BACKDROPS])
    expect(Object.keys(BACKDROP_TILES).sort()).toEqual([...NEW_BACKDROPS].sort())
  })

  it('gives the classic five no image and empty ceilings', () => {
    for (const backdrop of CLASSIC) {
      expect(backdropLayers(backdrop, PALETTE), backdrop).toEqual({ image: null, inkShare: 0, accentShare: 0 })
    }
  })

  it('is deterministic: the same palette always draws the same string', () => {
    for (const backdrop of NEW_BACKDROPS) {
      const first = backdropLayers(backdrop, PALETTE)
      const second = backdropLayers(backdrop, PALETTE)
      expect(second.image, backdrop).toBe(first.image)
      expect(first.image, backdrop).not.toBeNull()
    }
  })

  it('scatters the terrazzo chips with the fixed LCG: the first chip never moves', () => {
    const markup = svgOf(backdropLayers('terrazzo', PALETTE).image ?? '')
    expect(markup.match(/<polygon/g)).toHaveLength(26)
    // rng(42) drawn by hand: a changed seed, order or formula would move this polygon.
    expect(markup).toContain('<polygon points="130.8,107.2 133.8,113.1 131.3,120.3 120.4,117.8 122.6,110.0"')
  })

  it('embeds only the given palette colors (or none), nothing else that looks like a color', () => {
    for (const backdrop of NEW_BACKDROPS) {
      const image = backdropLayers(backdrop, PALETTE).image ?? ''
      if (image.startsWith('url(')) {
        const markup = svgOf(image)
        const painted = [...markup.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map(([, value]) => value)
        expect(painted.length, backdrop).toBeGreaterThan(0)
        for (const value of painted) expect([PALETTE.text, PALETTE.accent, 'none'], `${backdrop} paints ${value}`).toContain(value)
        for (const [hex] of markup.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
          expect([PALETTE.text, PALETTE.accent], `${backdrop} embeds ${hex}`).toContain(hex)
        }
      } else {
        // The gradient recipes: every color is a palette color with an alpha pair, nothing bare.
        const stops = [...image.matchAll(/#[0-9a-f]+\b/gi)].map(([hex]) => hex)
        expect(stops.length, backdrop).toBeGreaterThan(0)
        for (const stop of stops) {
          expect(stop, `${backdrop} embeds ${stop}`).toMatch(/^#[0-9a-f]{8}$/)
          expect([PALETTE.text, PALETTE.accent], `${backdrop} embeds ${stop}`).toContain(stop.slice(0, 7))
        }
      }
    }
  })

  it.each([
    [{ background: 'red; url(x)', text: 'url(javascript:alert(1))', accent: '#ffffff;background:url(//evil)' }],
    [{ background: 123, text: null, accent: ['#8b5a2b'] }],
    [{ background: '__proto__', text: 'constructor', accent: 'toString' }],
    [{ background: '#fff', text: '#2b1d14\n', accent: '#8b5a2bff' }],
  ])('falls back to the default palette for hostile values %j', (hostile) => {
    for (const backdrop of NEW_BACKDROPS) {
      const layers = backdropLayers(backdrop, hostile as unknown as typeof PALETTE)
      expect(layers, backdrop).toEqual(backdropLayers(backdrop, DEFAULTS))
    }
  })

  it('normalizes color case, so the same palette in capitals draws the same image', () => {
    const upper = { background: '#F8F3EC', text: '#2B1D14', accent: '#8B5A2B' }
    for (const backdrop of NEW_BACKDROPS) {
      expect(backdropLayers(backdrop, upper).image, backdrop).toBe(backdropLayers(backdrop, PALETTE).image)
    }
  })

  it('decodes to markup with no scripts, handlers, links, foreignObject or external references', () => {
    for (const backdrop of NEW_BACKDROPS) {
      const image = backdropLayers(backdrop, PALETTE).image ?? ''
      if (image.startsWith('url(')) {
        const markup = svgOf(image)
        expect(markup, backdrop).not.toMatch(/<script/i)
        expect(markup, backdrop).not.toMatch(/\son[a-z]+=/i)
        expect(markup, backdrop).not.toMatch(/href/i)
        expect(markup, backdrop).not.toMatch(/foreignObject/i)
        // Every url() inside the markup points at a local fragment (a filter or clip), never outward.
        for (const [reference] of markup.matchAll(/url\(.?/g)) expect(reference, backdrop).toBe('url(#')
      } else {
        expect(image, backdrop).not.toMatch(/url\(/)
      }
    }
  })

  it('draws each SVG tile at the size BACKDROP_TILES declares for it', () => {
    for (const backdrop of NEW_BACKDROPS) {
      const image = backdropLayers(backdrop, PALETTE).image ?? ''
      if (!image.startsWith('url(')) continue
      const tile = BACKDROP_TILES[backdrop]
      expect(typeof tile, backdrop).toBe('object')
      if (typeof tile !== 'object') continue
      const markup = svgOf(image)
      expect(markup, backdrop).toContain(`<svg xmlns="http://www.w3.org/2000/svg" width="${tile.width}" height="${tile.height}" viewBox="0 0 ${tile.width} ${tile.height}">`)
    }
  })

  it('declares the ceilings derived from each drawing, overlaps included', () => {
    const shares = Object.fromEntries(
      NEW_BACKDROPS.map((backdrop) => {
        const { inkShare, accentShare } = backdropLayers(backdrop, PALETTE)
        return [backdrop, { inkShare, accentShare }]
      }),
    )
    expect(shares).toEqual({
      grain: { inkShare: 0.2, accentShare: 0 },
      plaster: { inkShare: 0.1, accentShare: 0 },
      marble: { inkShare: 0.23, accentShare: 0 },
      linen: { inkShare: 0.14, accentShare: 0 },
      weave: { inkShare: 0.07, accentShare: 0 },
      terrazzo: { inkShare: 0.1, accentShare: 0.16 },
      waves: { inkShare: 0.21, accentShare: 0 },
      arches: { inkShare: 0.05, accentShare: 0 },
      deco: { inkShare: 0, accentShare: 0.13 },
      gingham: { inkShare: 0.1, accentShare: 0 },
      check: { inkShare: 0.05, accentShare: 0 },
      topo: { inkShare: 0.09, accentShare: 0 },
      bloom: { inkShare: 0, accentShare: 0.16 },
    })
  })
})
