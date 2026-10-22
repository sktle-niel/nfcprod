import { describe, expect, it } from 'vitest'
import { allCss, mediaBlock, readCss, ruleBody, rulesOf } from './css'

const SAMPLE = `
.a { color: red; }
.b, .c { margin: 0 }
@media (max-width: 599px) {
  .a { color: blue; }
  .d > button { flex: 1 1 0 }
}
.e { top: 0 }
`

describe('ruleBody', () => {
  it('gives the body of the rule with exactly this selector', () => {
    expect(ruleBody(SAMPLE, '.a')).toContain('color: red')
    expect(ruleBody(SAMPLE, '.e')).toContain('top: 0')
    expect(ruleBody(SAMPLE, '.d > button')).toContain('flex: 1 1 0')
  })

  it('does not take a part of a selector list, or a longer name, for the selector', () => {
    expect(ruleBody(SAMPLE, '.b')).toBe('')
    expect(ruleBody(SAMPLE, '.ab')).toBe('')
  })
})

describe('mediaBlock', () => {
  it('gives what is inside the block, and nothing for a query that is not there', () => {
    const phone = mediaBlock(SAMPLE, '(max-width: 599px)')
    expect(ruleBody(phone, '.a')).toContain('color: blue')
    expect(phone).not.toContain('.e')
    expect(mediaBlock(SAMPLE, '(min-width: 1024px)')).toBe('')
  })
})

describe('reading stylesheets', () => {
  it('reads one from the project root, without comments or carriage returns', async () => {
    const css = await readCss('src/shared/ui/Button.module.css')
    expect(css).toContain('.button')
    expect(css).not.toContain('/*')
    expect(css).not.toContain('\r')
  })

  it('finds them all', async () => {
    expect((await allCss()).length).toBeGreaterThan(50)
  })
})

describe('rulesOf', () => {
  const css = `
.a, .b { color: red; margin: 0 }
@media (max-width: 599px) {
  .c > button { flex: 1 1 0; color: var(--menu-text) }
}
.d::after { content: ''; background: url(x) }
`
  it('reads each rule with its declarations, also inside an at-rule', () => {
    expect(rulesOf(css)).toEqual([
      { selector: '.a, .b', within: [], declarations: { color: 'red', margin: '0' } },
      { selector: '.c > button', within: ['@media (max-width: 599px)'], declarations: { flex: '1 1 0', color: 'var(--menu-text)' } },
      { selector: '.d::after', within: [], declarations: { content: "''", background: 'url(x)' } },
    ])
  })
})
