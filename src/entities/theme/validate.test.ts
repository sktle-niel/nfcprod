import { describe, expect, it } from 'vitest'
import { deepFreeze } from '@/shared/lib/freeze'
import { BACKDROPS, CARDS, DECORS, DEFAULT_THEME, FONTS, HEADERS, PHOTOS, STYLE_IDS, TITLES, type Theme } from './theme'
import { themeIssues, validateTheme } from './validate'

// A theme as it was saved before the style choices existed: the old keys only.
const typed = {
  primary: '#C2410C',
  secondary: '#1F2933',
  background: '#FFFAF5',
  font: 'system',
  buttonStyle: 'pill',
  layout: 'list',
  mode: 'dark',
}

const KEYS = Object.keys(DEFAULT_THEME) as (keyof Theme)[]
/** Keys a theme must have. The others (the style and what it sets, the card color) default when they are missing. */
const REQUIRED = ['primary', 'secondary', 'background', 'font', 'buttonStyle', 'layout', 'mode'] as const
const LATER = KEYS.filter((key) => !(REQUIRED as readonly string[]).includes(key))

describe('validateTheme', () => {
  it('accepts a theme and stores the colors in lowercase, with the Classic choices for what an old theme lacks', () => {
    expect(validateTheme(typed)).toEqual({
      ok: true,
      value: {
        ...DEFAULT_THEME,
        ...typed,
        primary: '#c2410c',
        secondary: '#1f2933',
        background: '#fffaf5',
      },
    })
  })

  it('accepts every choice on its list and the card color, stored in lowercase', () => {
    const theme = {
      ...DEFAULT_THEME,
      surface: '#FFFAF1',
      style: 'noir',
      card: 'plate',
      photo: 'arch',
      title: 'ornament',
      header: 'frame',
      decor: 'bar',
      backdrop: 'glow',
      spotlight: true,
    }
    expect(validateTheme(theme)).toEqual({ ok: true, value: { ...theme, surface: '#fffaf1' } })
  })

  it('knows every value of every list', () => {
    for (const style of STYLE_IDS) expect(validateTheme({ ...DEFAULT_THEME, style }).ok).toBe(true)
    for (const card of CARDS) expect(validateTheme({ ...DEFAULT_THEME, card }).ok).toBe(true)
    for (const photo of PHOTOS) expect(validateTheme({ ...DEFAULT_THEME, photo }).ok).toBe(true)
    for (const title of TITLES) expect(validateTheme({ ...DEFAULT_THEME, title }).ok).toBe(true)
    for (const header of HEADERS) expect(validateTheme({ ...DEFAULT_THEME, header }).ok).toBe(true)
    for (const decor of DECORS) expect(validateTheme({ ...DEFAULT_THEME, decor }).ok).toBe(true)
    for (const backdrop of BACKDROPS) expect(validateTheme({ ...DEFAULT_THEME, backdrop }).ok).toBe(true)
    for (const font of FONTS) expect(validateTheme({ ...DEFAULT_THEME, font }).ok).toBe(true)
  })

  it('drops keys a theme does not have', () => {
    const result = validateTheme({ ...DEFAULT_THEME, css: 'body { display: none }', radius: '0' })
    expect(result).toEqual({ ok: true, value: DEFAULT_THEME })
  })

  it.each(REQUIRED)('calls a missing %s required', (key) => {
    const input: Record<string, unknown> = { ...DEFAULT_THEME }
    delete input[key]
    expect(validateTheme(input)).toEqual({ ok: false, errors: { [key]: 'required' } })
    expect(validateTheme({ ...DEFAULT_THEME, [key]: null })).toEqual({ ok: false, errors: { [key]: 'required' } })
  })

  it.each(LATER)('gives a missing or null %s its default, so a theme saved before it still reads', (key) => {
    const input: Record<string, unknown> = { ...DEFAULT_THEME }
    delete input[key]
    expect(validateTheme(input)).toEqual({ ok: true, value: DEFAULT_THEME })
    expect(validateTheme({ ...DEFAULT_THEME, [key]: null })).toEqual({ ok: true, value: DEFAULT_THEME })
  })

  it.each([
    ['primary', '#fff'],
    ['primary', 'red'],
    ['primary', 'url(javascript:alert(1))'],
    ['secondary', '#19202b;}body{display:none'],
    ['secondary', 0x19202b],
    ['background', 'linear-gradient(red, blue)'],
    ['background', '#ffffff\n'],
    ['surface', '#fff'],
    ['surface', 'cream'],
    ['surface', 'url(https://evil.example/x.png)'],
    ['surface', 12],
    ['font', 'Comic Sans MS'],
    ['font', 'urbanist; color: red'],
    ['font', 'constructor'],
    ['font', '__proto__'],
    ['buttonStyle', 'round'],
    ['buttonStyle', 'toString'],
    ['layout', 'masonry'],
    ['layout', ['grid']],
    ['mode', 'auto'],
    ['mode', true],
    ['style', 'neon'],
    ['style', '__proto__'],
    ['card', 'grid'],
    ['card', 'constructor'],
    ['photo', 'square'],
    ['title', 'fancy'],
    ['header', 'banner'],
    ['decor', 'fireworks'],
    ['backdrop', 'video'],
    ['backdrop', 'url(x)'],
    ['spotlight', 'yes'],
    ['spotlight', 1],
  ])('refuses %s set to %j', (key, value) => {
    expect(validateTheme({ ...DEFAULT_THEME, [key]: value })).toEqual({ ok: false, errors: { [key]: 'invalid' } })
  })

  it.each([null, undefined, 'theme', 42, [], true])('calls every required key required for %j, which is not a theme', (input) => {
    expect(validateTheme(input)).toEqual({ ok: false, errors: Object.fromEntries(REQUIRED.map((key) => [key, 'required'])) })
  })

  it('takes no key from the prototype', () => {
    const result = validateTheme(Object.create(DEFAULT_THEME))
    expect(result.ok).toBe(false)
  })

  it('reads "__proto__" from JSON as a plain name and keeps it out of the theme', () => {
    const input: unknown = JSON.parse(`{"__proto__": {"font": "system"}, ${JSON.stringify(DEFAULT_THEME).slice(1)}`)
    const result = validateTheme(input)
    expect(result).toEqual({ ok: true, value: DEFAULT_THEME })
    expect(result.ok && Object.hasOwn(result.value, '__proto__')).toBe(false)
  })

  it('refuses instead of throwing when reading the input throws', () => {
    const hostile = {
      ...DEFAULT_THEME,
      get primary(): string {
        throw new Error('boom')
      },
    }
    expect(validateTheme(hostile).ok).toBe(false)
    const { proxy, revoke } = Proxy.revocable({ ...DEFAULT_THEME }, {})
    revoke()
    expect(validateTheme(proxy).ok).toBe(false)
  })

  it('never changes its input', () => {
    const input = deepFreeze({ ...typed })
    const before = structuredClone(input)
    validateTheme(input)
    expect(input).toEqual(before)
  })
})

describe('themeIssues', () => {
  it('finds nothing wrong with the default theme', () => {
    expect(themeIssues(DEFAULT_THEME)).toEqual([])
  })

  it('warns when the text does not reach 4.5:1 on the page', () => {
    expect(themeIssues({ ...DEFAULT_THEME, secondary: '#777777' })).toEqual(['textContrast'])
    expect(themeIssues({ ...DEFAULT_THEME, secondary: '#767676' })).toEqual([])
  })

  it('warns when the accent does not reach 3:1 on the page', () => {
    expect(themeIssues({ ...DEFAULT_THEME, primary: '#959595' })).toEqual(['accentContrast'])
    expect(themeIssues({ ...DEFAULT_THEME, primary: '#949494' })).toEqual([])
  })

  it('gives both warnings in a fixed order', () => {
    expect(themeIssues({ ...DEFAULT_THEME, primary: '#f0f0f0', secondary: '#eeeeee' })).toEqual(['textContrast', 'accentContrast'])
  })
})

describe('the photo backdrop fields', () => {
  const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

  it('takes a checked picture address and refuses a crooked one or an unknown strength', () => {
    const good = validateTheme({ ...DEFAULT_THEME, backdropPicture: PHOTO, backdropVeil: 'strong' })
    expect(good.ok && good.value.backdropPicture).toBe(PHOTO)
    expect(good.ok && good.value.backdropVeil).toBe('strong')
    expect(validateTheme({ ...DEFAULT_THEME, backdropPicture: 'javascript:alert(1)' }).ok).toBe(false)
    expect(validateTheme({ ...DEFAULT_THEME, backdropVeil: 'loud' }).ok).toBe(false)
  })

  it('takes the fit and the position of the photo, defaults them for an older theme, and refuses an unknown one', () => {
    const older = Object.fromEntries(Object.entries(DEFAULT_THEME).filter(([key]) => key !== 'backdropFit' && key !== 'backdropPosition'))
    const good = validateTheme({ ...older, backdropFit: 'stretch', backdropPosition: 'top' })
    expect(good.ok && good.value.backdropFit).toBe('stretch')
    expect(good.ok && good.value.backdropPosition).toBe('top')
    const old = validateTheme(older)
    expect(old.ok && old.value.backdropFit).toBe('cover')
    expect(old.ok && old.value.backdropPosition).toBe('center')
    expect(validateTheme({ ...DEFAULT_THEME, backdropFit: 'tile' }).ok).toBe(false)
    expect(validateTheme({ ...DEFAULT_THEME, backdropPosition: 'corner' }).ok).toBe(false)
  })

  it('warns about the owner text color only when the veil lets the photo defeat it', () => {
    const base = { ...DEFAULT_THEME, primary: '#0b5fff', secondary: '#595959', background: '#f2f2f2' }
    expect(themeIssues(base)).toEqual([])
    const photo = { ...base, backdrop: 'picture' as const, backdropPicture: PHOTO }
    expect(themeIssues({ ...photo, backdropVeil: 'faint' as const })).toEqual([])
    expect(themeIssues({ ...photo, backdropVeil: 'strong' as const })).toEqual(['textContrast'])
    // Without the photo, or on another backdrop, the strength alone warns about nothing.
    expect(themeIssues({ ...photo, backdropPicture: null, backdropVeil: 'strong' as const })).toEqual([])
    expect(themeIssues({ ...base, backdropVeil: 'strong' as const })).toEqual([])
  })
})
