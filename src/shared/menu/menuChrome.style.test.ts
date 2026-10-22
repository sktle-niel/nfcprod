import { describe, expect, it } from 'vitest'
import { backdropLayers, BACKDROP_TILES, NEW_BACKDROPS, PICTURE_SHARES } from '@/entities/theme/backdrop'
import { contrastRatio, mixHex } from '@/entities/theme/color'
import { toCssVars } from '@/entities/theme/cssVars'
import { styleTheme } from '@/entities/theme/styles'
import { BACKDROPS, MODES, STYLE_IDS, TITLES, VEILS } from '@/entities/theme/theme'
import { TEXT_CONTRAST_MIN } from '@/entities/theme/validate'
import { readCss, rulesOf, type CssRule } from '@/test/css'

/*
 * What the titles, the headers and the backdrops promise in their stylesheets. Vitest does not load CSS, so the rules are
 * read from disk.
 */

const VIEW = 'src/shared/menu/MenuView.module.css'
const backdropSelector = (backdrop: string) => `.root[data-menu-backdrop='${backdrop}']`

/** The classic five: drawn by the menu's own CSS, with no texture variable. The photo backdrop has a variable of its own. */
const CLASSIC_BACKDROPS = BACKDROPS.filter((name) => !(NEW_BACKDROPS as readonly string[]).includes(name) && name !== 'picture')

async function rules(path: string): Promise<CssRule[]> {
  return rulesOf(await readCss(path))
}

/**
 * The colors of a backdrop's layers, as [variable, share]: `color-mix(in srgb, var(--menu-x) N%, transparent)` is the variable at
 * N%, a bare `var(--menu-x)` is it at 100%.
 */
function layersOf(value: string): { name: string; share: number }[] {
  const mixed = /color-mix\(in srgb, var\((--menu-[a-z-]+)\) ([\d.]+)%, transparent\)/g
  const layers = [...value.matchAll(mixed)].map(([, name, share]) => ({ name: name ?? '', share: Number(share) / 100 }))
  const bare = [...value.replace(mixed, '').matchAll(/var\((--menu-[a-z-]+)\)/g)].map(([, name]) => ({ name: name ?? '', share: 1 }))
  return [...layers, ...bare]
}

const channels = (hex: string) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
const hexOf = (values: number[]) => `#${values.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`
// The `overlay` blend of the compositing spec, per channel: the backdrop decides between multiply and screen.
const overlay = (backdrop: number, source: number) =>
  backdrop <= 0.5 ? 2 * backdrop * source : 1 - 2 * (1 - backdrop) * (1 - source)

/** The page color where every layer of a backdrop drawn with `background-blend-mode: overlay` overlaps. */
function overlaid(page: string, layers: { name: string; share: number }[], vars: Record<string, string>): string {
  let ground = channels(page)
  for (const { name, share } of layers) {
    const source = channels(vars[name] ?? page)
    ground = ground.map((under, i) => under + share * (overlay(under, source[i] ?? 0) - under))
  }
  return hexOf(ground)
}

const TEXTS = ['--menu-text', '--menu-muted'] as const

describe('the backdrops', () => {
  it('each classic kind has a rule that lays a pattern over the page color and never replaces it', async () => {
    const all = await rules(VIEW)
    for (const backdrop of CLASSIC_BACKDROPS.filter((name) => name !== 'plain')) {
      const rule = all.find((r) => r.selector.startsWith(backdropSelector(backdrop)))
      expect(rule, backdrop).toBeDefined()
      expect(rule?.declarations['background-image']).toMatch(/gradient\(/)
      // Only the image: the shorthand would reset the page color, and a url() would be a file or a request.
      expect(rule?.declarations['background']).toBeUndefined()
      expect(rule?.declarations['background-color']).toBeUndefined()
      expect(rule?.declarations['background-image']).not.toMatch(/url\(/)
    }
  })

  // The muted text is made as faint as 4.5:1 allows, so a texture that moved the page toward the text would break it. The
  // textures are drawn in the page color and blended with `overlay`, which moves the page away from its text: at the strongest
  // point (every layer overlapping) no text loses contrast, in any style or mode.
  it.each(['paper', 'dots', 'stripes'])('"%s" is the page color blended with overlay, and lowers no contrast of the page text', async (backdrop) => {
    const rule = (await rules(VIEW)).find((r) => r.selector.startsWith(backdropSelector(backdrop)))
    expect(rule?.declarations['background-blend-mode']).toBe('overlay')
    const layers = layersOf(rule?.declarations['background-image'] ?? '')
    expect(layers.length).toBeGreaterThan(0)
    expect(layers.every(({ name }) => name === '--menu-bg')).toBe(true)
    const failures: string[] = []
    for (const id of STYLE_IDS) {
      for (const mode of MODES) {
        const vars = toCssVars(styleTheme(id, mode))
        const page = vars['--menu-bg'] ?? ''
        const ground = overlaid(page, layers, vars)
        for (const text of TEXTS) {
          const before = contrastRatio(vars[text] ?? '', page)
          const after = contrastRatio(vars[text] ?? '', ground)
          // A rounding step of the 8-bit colors is not a loss.
          if (after < before - 0.01) failures.push(`${id} ${mode}: ${text} ${before.toFixed(2)} -> ${after.toFixed(2)}`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('keeps the page text at 4.5:1 at the center of the glow, and the header taglines use it there', async () => {
    const rule = (await rules(VIEW)).find((r) => r.selector.startsWith(backdropSelector('glow')))
    const layers = layersOf(rule?.declarations['background-image'] ?? '')
    expect(layers.map(({ name }) => name)).toEqual(['--menu-accent'])
    const failures: string[] = []
    for (const id of STYLE_IDS) {
      for (const mode of MODES) {
        const vars = toCssVars(styleTheme(id, mode))
        const ground = layers.reduce((under, { name, share }) => mixHex(under, vars[name] ?? '', share) ?? under, vars['--menu-bg'] ?? '')
        const ratio = contrastRatio(vars['--menu-text'] ?? '', ground)
        if (ratio < TEXT_CONTRAST_MIN) failures.push(`${id} ${mode}: ${ratio.toFixed(2)}`)
      }
    }
    expect(failures).toEqual([])
    for (const kind of ['Plain', 'Awning', 'Poster', 'Script', 'Frame']) {
      const tagline = (await rules(`src/shared/menu/headers/${kind}Header.module.css`)).find(
        (r) => r.selector === "[data-menu-backdrop='glow'] .tagline",
      )
      expect(tagline?.declarations['color'], kind).toBe('var(--menu-text)')
    }
  })
})

/*
 * The drawn textures: toCssVars hands each one to CSS as --menu-backdrop-image, built by backdropLayers from the palette
 * only. The texture composites by plain alpha, so the worst ground it can put under the page text is the page moved toward
 * the ink (or the accent) by the ceiling the recipe declares — backdrop.ts derives each ceiling from the drawing, overlaps
 * included. The audit holds the page text pair to 4.5:1 on those grounds for every style, mode and kind.
 */
describe('the drawn backdrops', () => {
  it('each kind has exactly one rule: the texture variable with the size from BACKDROP_TILES', async () => {
    const all = await rules(VIEW)
    for (const backdrop of NEW_BACKDROPS) {
      const matching = all.filter((r) => r.selector.includes(`[data-menu-backdrop='${backdrop}']`))
      expect(matching.map((r) => r.selector), backdrop).toEqual([backdropSelector(backdrop)])
      const rule = matching[0]
      expect(rule?.declarations['background-image'], backdrop).toBe('var(--menu-backdrop-image)')
      // Only the image: the shorthand would reset the page color, and the blend mode belongs to the classic five.
      expect(rule?.declarations['background'], backdrop).toBeUndefined()
      expect(rule?.declarations['background-color'], backdrop).toBeUndefined()
      expect(rule?.declarations['background-blend-mode'], backdrop).toBeUndefined()
      const tile = BACKDROP_TILES[backdrop]
      if (tile === 'full') {
        expect(rule?.declarations['background-size'], backdrop).toBe('100% 100%')
        expect(rule?.declarations['background-repeat'], backdrop).toBe('no-repeat')
      } else if (tile === 'auto') {
        expect(rule?.declarations['background-size'], backdrop).toBe('auto')
      } else {
        expect(rule?.declarations['background-size'], backdrop).toBe(`${tile.width}px ${tile.height}px`)
      }
    }
  })

  it('keeps the page text pair at 4.5:1 on every texture worst ground, for every style in both modes', () => {
    const failures: string[] = []
    for (const id of STYLE_IDS) {
      for (const mode of MODES) {
        for (const backdrop of NEW_BACKDROPS) {
          const vars = toCssVars({ ...styleTheme(id, mode), backdrop })
          const page = vars['--menu-bg'] ?? ''
          const ink = vars['--menu-text'] ?? ''
          const accent = vars['--menu-accent'] ?? ''
          const layers = backdropLayers(backdrop, { background: page, text: ink, accent })
          expect(layers.image, backdrop).not.toBeNull()
          expect(vars['--menu-backdrop-image'], `${id} ${mode} ${backdrop}`).toBe(layers.image)
          const grounds = [mixHex(page, ink, layers.inkShare), mixHex(page, accent, layers.accentShare)]
          for (const ground of grounds) {
            for (const text of TEXTS) {
              const ratio = contrastRatio(vars[text] ?? '', ground ?? '')
              if (ratio < TEXT_CONTRAST_MIN) failures.push(`${id} ${mode} ${backdrop}: ${text} on ${ground} is ${ratio.toFixed(2)}`)
            }
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('gives the classic five no texture variable', () => {
    for (const backdrop of CLASSIC_BACKDROPS) {
      const vars = toCssVars({ ...styleTheme('classic', 'light'), backdrop })
      expect(vars['--menu-backdrop-image'], backdrop).toBeUndefined()
    }
  })
})

/*
 * The photo backdrop: the owner's picture under a flat veil of the page color. The veil leaves at most
 * PICTURE_SHARES[veil] of any pixel showing, so the worst grounds under the page text are the page moved toward black
 * and toward white by that share. The audit holds the text pair to 4.5:1 there for every style, mode and veil.
 */
describe('the photo backdrop', () => {
  const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

  it('has one rule: the variable, the photo covering the page once under the flat veil', async () => {
    const all = await rules(VIEW)
    const matching = all.filter((rule) => rule.selector.includes(backdropSelector('picture')))
    expect(matching.map((rule) => rule.selector)).toEqual([backdropSelector('picture')])
    const rule = matching[0]
    expect(rule?.declarations['background-image']).toBe('var(--menu-backdrop-image)')
    expect(rule?.declarations['background-size']).toBe('auto, cover')
    expect(rule?.declarations['background-position']).toBe('center')
    expect(rule?.declarations['background-repeat']).toBe('no-repeat')
    expect(rule?.declarations['background']).toBeUndefined()
    expect(rule?.declarations['background-color']).toBeUndefined()
    expect(rule?.declarations['background-blend-mode']).toBeUndefined()
  })

  it('keeps the page text pair at 4.5:1 on the photo worst grounds, for every style, mode and veil', () => {
    const failures: string[] = []
    for (const id of STYLE_IDS) {
      for (const mode of MODES) {
        for (const veil of VEILS) {
          const vars = toCssVars({ ...styleTheme(id, mode), backdrop: 'picture', backdropPicture: PHOTO, backdropVeil: veil })
          expect(vars['--menu-backdrop-image'], `${id} ${mode} ${veil}`).toContain(`url("${PHOTO}")`)
          const page = vars['--menu-bg'] ?? ''
          const share = PICTURE_SHARES[veil]
          const grounds = [mixHex(page, '#000000', share), mixHex(page, '#ffffff', share)]
          for (const ground of grounds) {
            for (const text of TEXTS) {
              const ratio = contrastRatio(vars[text] ?? '', ground ?? '')
              if (ratio < TEXT_CONTRAST_MIN) failures.push(`${id} ${mode} ${veil}: ${text} on ${ground} is ${ratio.toFixed(2)}`)
            }
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it("sets the variable to 'none' for a refused address or no picture, so a nested root can never inherit a photo", () => {
    const theme = { ...styleTheme('classic', 'light'), backdrop: 'picture' as const }
    expect(toCssVars({ ...theme, backdropPicture: null })['--menu-backdrop-image']).toBe('none')
    expect(toCssVars({ ...theme, backdropPicture: 'https://images.example.com/a(1).png' })['--menu-backdrop-image']).toBe('none')
    expect(toCssVars({ ...theme, backdropPicture: 'javascript:alert(1)' })['--menu-backdrop-image']).toBe('none')
  })
})

describe('the category titles', () => {
  it.each(TITLES.filter((title) => title !== 'plain'))('"%s" draws its decoration with empty pseudo-elements, never with characters', async (title) => {
    const file = `src/shared/menu/titles/${title[0]?.toUpperCase()}${title.slice(1)}Title.module.css`
    const drawn = (await rules(file)).filter((r) => /::(before|after)/.test(r.selector) && r.declarations['content'] !== undefined)
    expect(drawn.length).toBeGreaterThan(0)
    for (const rule of drawn) expect(rule.declarations['content'], `${file} ${rule.selector}`).toBe("''")
  })

  it.each(TITLES.filter((title) => title !== 'plain'))('"%s" lets long names wrap', async (title) => {
    const css = await readCss(`src/shared/menu/titles/${title[0]?.toUpperCase()}${title.slice(1)}Title.module.css`)
    expect(css).toContain('overflow-wrap: anywhere')
  })

  it('draws the stripe band across the section gutter that the section sets', async () => {
    const band = (await rules('src/shared/menu/titles/StripeTitle.module.css')).find((r) => r.selector === '.title')
    expect(band?.declarations['margin']).toContain('calc(-1 * var(--section-gutter, 16px))')
    expect((await rules(VIEW)).find((r) => r.selector === '.section')?.declarations['--section-gutter']).toBe('16px')
  })
})

describe('the headers', () => {
  it.each(['Plain', 'Awning', 'Poster', 'Script', 'Frame'])('%s lets a long business name and tagline wrap', async (kind) => {
    const all = await rules(`src/shared/menu/headers/${kind}Header.module.css`)
    for (const selector of ['.name', '.tagline']) {
      expect(all.find((r) => r.selector === selector)?.declarations['overflow-wrap'], `${kind} ${selector}`).toBe('anywhere')
    }
  })

  it('draws the poster name as large as the brief asks, in capitals made by CSS', async () => {
    const name = (await rules('src/shared/menu/headers/PosterHeader.module.css')).find((r) => r.selector === '.name')
    expect(name?.declarations['font-size']).toMatch(/^clamp\(2\.2rem, .+, 3\.6rem\)$/)
    expect(name?.declarations['text-transform']).toBe('uppercase')
  })

  it('draws the awning with gradients only, no picture file', async () => {
    const awning = (await rules('src/shared/menu/headers/AwningHeader.module.css')).find((r) => r.selector === '.awning')
    expect(awning?.declarations['background-image']).toMatch(/linear-gradient\(.+radial-gradient\(/)
    expect(awning?.declarations['background-image']).not.toMatch(/url\(/)
  })
})

describe('the product columns', () => {
  const at = (width: number, columns: string) => async () => {
    const found = (await rules(VIEW)).find(
      (r) => r.selector === `[data-menu-columns='${columns}'] .products` && r.within.includes(`@container (min-width: ${width}px)`),
    )
    return found?.declarations['grid-template-columns']
  }

  it('starts at one column, and grows with the menu width, not the window', async () => {
    const products = (await rules(VIEW)).find((r) => r.selector === '.products' && r.within.length === 0)
    expect(products?.declarations['grid-template-columns']).toBe('minmax(0, 1fr)')
    expect(await at(340, 'many')()).toBe('repeat(2, minmax(0, 1fr))')
    expect(await at(640, 'many')()).toBe('repeat(3, minmax(0, 1fr))')
  })

  it('gives the poster two columns on a wide menu only', async () => {
    expect(await at(640, 'wide')()).toBe('repeat(2, minmax(0, 1fr))')
    expect(await at(340, 'wide')()).toBeUndefined()
  })
})
