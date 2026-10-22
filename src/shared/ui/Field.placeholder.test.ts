import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/entities/theme/color'
import { readCss, ruleBody } from '@/test/css'

// Contrast checkers skip ::placeholder, and the select prompt ("Choose a category") is real text that says nothing is chosen.
// Both must read at 4.5:1 on the field background, in both themes.

const tokenOf = (body: string, name: string) => new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(body)?.[1] ?? ''

async function themes() {
  const tokens = await readCss('src/shared/theme/tokens.css')
  return [
    { name: 'light', body: ruleBody(tokens, ':root') },
    { name: 'dark', body: ruleBody(tokens, ":root[data-theme='dark']") },
  ]
}

describe('Field placeholder color', () => {
  it('has its own token in both themes that reaches 4.5:1 on the field background', async () => {
    for (const { name, body } of await themes()) {
      const placeholder = tokenOf(body, '--color-placeholder')
      const field = tokenOf(body, '--color-surface')
      expect(placeholder, `${name}: placeholder token`).not.toBe('')
      expect(field, `${name}: surface token`).not.toBe('')
      expect(contrastRatio(placeholder, field), `${name} theme`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('is used for the placeholder of an input and for the prompt of a select, not the decorative muted color', async () => {
    const css = await readCss('src/shared/ui/Field.module.css')
    expect(ruleBody(css, '.input::placeholder')).toContain('color: var(--color-placeholder)')
    expect(ruleBody(css, '.select:required:invalid')).toContain('color: var(--color-placeholder)')
    expect(css).not.toContain('--color-muted')
  })

  it('draws the field on the surface color, the one the contrast is measured against', async () => {
    const css = await readCss('src/shared/ui/Field.module.css')
    expect(ruleBody(css, '.input')).toContain('background: var(--color-surface)')
  })
})
