import { describe, expect, it } from 'vitest'
import { readCss, ruleBody } from '@/test/css'

const FILE = 'src/shared/menu/MenuPreviewFrame.module.css'

describe('the phone preview frame', () => {
  it('scrolls without drawing a scrollbar, like a phone', async () => {
    const css = await readCss(FILE)
    const frame = ruleBody(css, '.frame')
    expect(frame).toMatch(/overflow-y:\s*auto/)
    expect(frame).toMatch(/scrollbar-width:\s*none/)
    expect(ruleBody(css, '.frame::-webkit-scrollbar')).toMatch(/display:\s*none/)
  })
})
