import { describe, expect, it } from 'vitest'
import { readCss, ruleBody } from '@/test/css'

describe('the Orders page header on a phone', () => {
  it('lets the status tabs be narrower than their content, so the row scrolls inside its box and the page does not', async () => {
    const tabs = ruleBody(await readCss('src/features/admin/OrdersPage.module.css'), '.tabs')
    expect(tabs).toMatch(/min-width:\s*0/)
    expect(tabs).toMatch(/max-width:\s*100%/)
  })

  it('does the same for the actions of every page header', async () => {
    const actions = ruleBody(await readCss('src/shared/ui/PageHeader.module.css'), '.actions')
    expect(actions).toMatch(/min-width:\s*0/)
    expect(actions).toMatch(/max-width:\s*100%/)
  })
})
