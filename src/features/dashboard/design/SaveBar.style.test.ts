import { describe, expect, it } from 'vitest'
import { mediaBlock, readCss, ruleBody } from '@/test/css'

const FILE = 'src/features/dashboard/design/SaveBar.module.css'

describe('the Design save bar on a phone', () => {
  it('keeps the two buttons on one row under the words, so the bar stays low', async () => {
    const phone = mediaBlock(await readCss(FILE), '(max-width: 599px)')
    expect(ruleBody(phone, '.actions')).toMatch(/flex:\s*1 1 100%/)
    expect(ruleBody(phone, '.actions')).toMatch(/flex-wrap:\s*nowrap/)
    expect(ruleBody(phone, '.actions > button')).toMatch(/flex:\s*1 1 0/)
    expect(ruleBody(phone, '.actions > button')).toMatch(/min-width:\s*0/)
  })

  it('leaves no empty line above the buttons while there is nothing to say, without taking the live region out of the page', async () => {
    const empty = ruleBody(await readCss(FILE), ".messages > [role='status']:empty")
    expect(empty).toMatch(/min-height:\s*0/)
    expect(empty).not.toMatch(/display:\s*none/)
  })
})
