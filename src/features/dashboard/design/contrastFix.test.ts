import { describe, expect, it } from 'vitest'
import { contrastRatio, readableOn } from '@/entities/theme/color'
import { DEFAULT_THEME, type Theme } from '@/entities/theme/theme'
import { ACCENT_CONTRAST_MIN, TEXT_CONTRAST_MIN, themeIssues } from '@/entities/theme/validate'
import { contrastFix } from './contrastFix'

const theme = (patch: Partial<Theme>): Theme => ({ ...DEFAULT_THEME, ...patch })

function applied(issue: 'textContrast' | 'accentContrast', start: Theme): Theme {
  const fix = contrastFix(issue, start)
  return { ...start, [fix.key]: fix.color }
}

describe('contrastFix', () => {
  it('fixes pale text on a white page by changing the text color', () => {
    const start = theme({ secondary: '#dddddd', background: '#ffffff' })
    const fix = contrastFix('textContrast', start)
    expect(fix.key).toBe('secondary')
    expect(fix.color).toBe(readableOn('#ffffff'))
    expect(themeIssues(applied('textContrast', start))).not.toContain('textContrast')
  })

  it('fixes dark text on a dark page with a light color', () => {
    const start = theme({ secondary: '#222a38', background: '#11161f', mode: 'dark' })
    const fixed = applied('textContrast', start)
    expect(fixed.secondary).toBe('#ffffff')
    expect(themeIssues(fixed)).toEqual([])
  })

  it('falls back to plain black when neither the ink nor white reads on a middle grey', () => {
    // The ink reaches only about 4.1:1 on this grey and white about 4:1, so the usual pair is not enough.
    const start = theme({ secondary: '#858585', background: '#808080' })
    const fix = contrastFix('textContrast', start)
    expect(fix.color).toBe('#000000')
    expect(contrastRatio(fix.color, start.background)).toBeGreaterThanOrEqual(TEXT_CONTRAST_MIN)
  })

  it('moves a washed-out accent toward the text side of the page and keeps its hue as long as it can', () => {
    const start = theme({ primary: '#ffe08a', background: '#ffffff' })
    expect(themeIssues(start)).toContain('accentContrast')
    const fix = contrastFix('accentContrast', start)
    expect(fix.key).toBe('primary')
    expect(fix.color).not.toBe('#19202b')
    expect(contrastRatio(fix.color, start.background)).toBeGreaterThanOrEqual(ACCENT_CONTRAST_MIN)
    // Warm stays warm: red is still the strongest channel.
    const red = Number.parseInt(fix.color.slice(1, 3), 16)
    const blue = Number.parseInt(fix.color.slice(5, 7), 16)
    expect(red).toBeGreaterThan(blue)
  })

  it('moves a dim accent on a dark page toward white', () => {
    const start = theme({ primary: '#1a2230', background: '#11161f', mode: 'dark' })
    const fixed = applied('accentContrast', start)
    expect(themeIssues(fixed)).not.toContain('accentContrast')
  })

  it('always clears the issue it was asked about, over a spread of colors', () => {
    const colors = ['#000000', '#ffffff', '#808080', '#7f7f7f', '#ff00ff', '#00ffff', '#ffff00', '#2f80ed', '#8b5a2b', '#f8f3ec']
    for (const background of colors) {
      for (const other of colors) {
        const start = theme({ background, secondary: other, primary: other })
        const issues = themeIssues(start)
        if (issues.includes('textContrast')) expect(themeIssues(applied('textContrast', start))).not.toContain('textContrast')
        if (issues.includes('accentContrast')) expect(themeIssues(applied('accentContrast', start))).not.toContain('accentContrast')
      }
    }
  })
})
