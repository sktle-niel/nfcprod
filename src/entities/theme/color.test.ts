import { describe, expect, it } from 'vitest'
import { contrastRatio, INK, isDarkColor, isHexColor, mixHex, normalizeHex, readableOn, WHITE } from './color'

describe('isHexColor', () => {
  it.each(['#000000', '#ffffff', '#2F80ED', '#aBcDeF'])('accepts %s', (value) => {
    expect(isHexColor(value)).toBe(true)
  })

  it.each([
    '#fff',
    '#ffff',
    '#fffffff',
    '#ffffff00',
    'ffffff',
    '#gggggg',
    'red',
    'transparent',
    'rgb(0 0 0)',
    'var(--x)',
    '#ffffff ',
    ' #ffffff',
    '#ffffff\n',
    '#ffffff;',
    '#ffffff;}body{',
    '',
    '#',
    '#ｆｆｆｆｆｆ',
  ])('refuses %j', (value) => {
    expect(isHexColor(value)).toBe(false)
  })

  it.each([null, undefined, 0xffffff, {}, ['#ffffff']])('refuses %j, which is not text', (value) => {
    expect(isHexColor(value)).toBe(false)
  })
})

describe('normalizeHex', () => {
  it('writes a color in lowercase', () => {
    expect(normalizeHex('#2F80ED')).toBe('#2f80ed')
  })
})

describe('contrastRatio', () => {
  it('gives 21 for black on white and 1 for a color on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#2f80ed', '#2f80ed')).toBe(1)
  })

  it('matches the known WCAG values around 4.5:1', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  })

  it('does not depend on the order or the case of the colors', () => {
    expect(contrastRatio('#FFFFFF', '#19202B')).toBe(contrastRatio('#19202b', '#ffffff'))
  })

  it('counts a color that is not #rrggbb as no contrast', () => {
    expect(contrastRatio('black', '#ffffff')).toBe(1)
    expect(contrastRatio('#ffffff', '#000')).toBe(1)
  })
})

describe('isDarkColor', () => {
  it('is true when white reads better on the color than black does', () => {
    expect(isDarkColor('#000000')).toBe(true)
    expect(isDarkColor('#14110f')).toBe(true)
    expect(isDarkColor('#11161f')).toBe(true)
    expect(isDarkColor('#767676')).toBe(false)
  })

  it('is false for light colors, in either case', () => {
    expect(isDarkColor('#ffffff')).toBe(false)
    expect(isDarkColor('#F8F3EC')).toBe(false)
  })

  it('splits where black and white read equally well', () => {
    for (const hex of ['#6f6f6f', '#707070', '#7a7a7a']) {
      expect(isDarkColor(hex)).toBe(contrastRatio(hex, WHITE) > contrastRatio(hex, '#000000'))
    }
  })

  it('is null for anything that is not #rrggbb', () => {
    expect(isDarkColor('#12')).toBeNull()
    expect(isDarkColor('red')).toBeNull()
    expect(isDarkColor('')).toBeNull()
  })
})

describe('readableOn', () => {
  it('puts white on dark colors and ink on light ones', () => {
    expect(readableOn('#000000')).toBe(WHITE)
    expect(readableOn('#7a1f2b')).toBe(WHITE)
    expect(readableOn('#ffffff')).toBe(INK)
    expect(readableOn('#f2a93b')).toBe(INK)
  })

  it('always picks the one of the two that reads better', () => {
    for (const color of ['#2f80ed', '#c2410c', '#7c4dbd', '#808080', '#11161f', '#f8f3ec', '#00ff00']) {
      const other = readableOn(color) === WHITE ? INK : WHITE
      expect(contrastRatio(color, readableOn(color))).toBeGreaterThanOrEqual(contrastRatio(color, other))
    }
  })
})

describe('mixHex', () => {
  it('moves one color toward another', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#11161F', '#FFFFFF', 0.06)).toBe('#1f242c')
  })

  it('gives null for a color or a weight it cannot use', () => {
    expect(mixHex('black', '#ffffff', 0.5)).toBeNull()
    expect(mixHex('#000000', '#fff', 0.5)).toBeNull()
    expect(mixHex('#000000', '#ffffff', -0.1)).toBeNull()
    expect(mixHex('#000000', '#ffffff', 1.1)).toBeNull()
    expect(mixHex('#000000', '#ffffff', Number.NaN)).toBeNull()
  })
})
