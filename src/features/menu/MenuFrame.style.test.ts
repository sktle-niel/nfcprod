import { describe, expect, it } from 'vitest'
import { readCss, ruleBody } from '@/test/css'

const FRAME = 'src/features/menu/MenuFrame.module.css'
const PAGE = 'src/features/menu/MenuPage.module.css'
const PREVIEW = 'src/features/dashboard/preview/PreviewPage.module.css'

describe('the page around a menu', () => {
  it('fills the screen in the menu\'s own page color, from the menu variables and not the app tokens', async () => {
    const css = await readCss(FRAME)
    const page = ruleBody(css, '.page')
    expect(page).toMatch(/background:\s*var\(--menu-bg\)/)
    expect(page).toMatch(/color:\s*var\(--menu-text\)/)
    expect(page).toMatch(/min-height:\s*var\(--frame-min-height,\s*100dvh\)/)
    expect(css).not.toMatch(/--color-/)
  })

  it('keeps the menu in a centered column of at most 720px that is the whole width on a phone', async () => {
    const column = ruleBody(await readCss(FRAME), '.column')
    expect(column).toMatch(/max-width:\s*720px/)
    expect(column).toMatch(/width:\s*100%/)
    expect(column).toMatch(/margin-inline:\s*auto/)
  })

  it('holds no color of its own', async () => {
    for (const path of [FRAME, PAGE, PREVIEW]) {
      expect(await readCss(path), path).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i)
    }
  })

  it('waits in the browser\'s own colors, so there is no flash of the app\'s look before the menu', async () => {
    const loading = ruleBody(await readCss(PAGE), '.loading')
    expect(loading).toMatch(/background:\s*Canvas/)
    expect(loading).toMatch(/color:\s*CanvasText/)
    expect(loading).not.toMatch(/var\(--color-/)
  })

  it('lets the owner preview fill the screen under its bar, with the bar in the app\'s tokens', async () => {
    const css = await readCss(PREVIEW)
    expect(ruleBody(css, '.preview')).toMatch(/--frame-min-height:\s*0px/)
    expect(ruleBody(css, '.preview')).toMatch(/min-height:\s*100dvh/)
    expect(ruleBody(css, '.bar')).toMatch(/background:\s*var\(--color-surface\)/)
    expect(css).not.toMatch(/--menu-/)
  })
})
