// What the stylesheets of this folder promise. Vitest does not load CSS (`css: false`), so the files are read from disk.
import { describe, expect, it } from 'vitest'

type Fs = { readFileSync(path: URL, encoding: 'utf8'): string }

async function read(name: string): Promise<string> {
  // A variable, so that the type-check of the app, which has no Node types, does not try to resolve the module.
  const node = 'node:fs'
  const { readFileSync } = (await import(/* @vite-ignore */ node)) as Fs
  return readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
}

/** The body of the first rule with exactly this selector, comments out. */
function rule(css: string, selector: string): string {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:^|[}{])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(plain)?.[1] ?? ''
}

describe('page-wide rules', () => {
  it('keeps a focused field clear of the fixed bars: tab bar below 1024px, the save bar height everywhere', async () => {
    const css = await read('../../index.css')
    const phone = rule(css, 'html')
    expect(phone).toMatch(/scroll-padding-bottom:[^;]*var\(--save-bar-h, 0px\)/)
    expect(phone).toMatch(/scroll-padding-bottom:[^;]*env\(safe-area-inset-bottom\)/)
    // --save-bar-h already holds the room of the tab bar under the save bar, so the two are compared, not added.
    expect(phone).toMatch(/scroll-padding-bottom:\s*max\(/)
    const wide = css.slice(css.indexOf('@media (min-width: 1024px)'))
    expect(rule(wide, 'html')).toMatch(/scroll-padding-bottom:[^;]*var\(--save-bar-h, 0px\)/)
    expect(rule(wide, 'html')).not.toMatch(/safe-area-inset-bottom/)
  })

  it('gives the sheet of a modal room for a sticky footer that sets its own height', async () => {
    expect(rule(await read('./Modal.module.css'), '.sheet')).toMatch(/scroll-padding-bottom:\s*var\(--sheet-footer-h, 96px\)/)
  })
})

describe('the phone tab bar', () => {
  it('lets five or more tabs share the row and shrink, only below the sidebar width', async () => {
    const css = await read('./shell/ShellNav.module.css')
    const phone = css.slice(css.indexOf('@media (max-width: 1023.98px)'), css.indexOf('\n.link {'))
    expect(rule(phone, '.list[data-dense] > .item')).toMatch(/flex:\s*1 1 0/)
    expect(rule(phone, '.list[data-dense] > .item')).toMatch(/min-width:\s*0/)
    expect(rule(phone, '.list[data-dense] .link')).toMatch(/min-width:\s*0/)
  })

  it('leaves the base rules of the four-tab bar as they were', async () => {
    const css = await read('./shell/ShellNav.module.css')
    expect(rule(css, '.link')).toMatch(/min-width:\s*72px/)
    expect(rule(css, '.link')).toMatch(/padding:\s*4px 12px/)
  })
})

describe('tap targets', () => {
  it.each([
    ['./SegmentedControl.module.css', '.option', 'min-height'],
    ['./ThemeToggle.module.css', '.button', 'width'],
    ['./ThemeToggle.module.css', '.button', 'height'],
    ['./Modal.module.css', '.close', 'width'],
    ['./Modal.module.css', '.close', 'height'],
  ])('%s %s is 44px (%s)', async (file, selector, property) => {
    expect(rule(await read(file), selector)).toMatch(new RegExp(`${property}:\\s*44px`))
  })
})

describe('the buttons of a confirm dialog', () => {
  it('are never reversed on screen, so Tab and reading follow what is seen', async () => {
    expect(await read('./ConfirmDialog.module.css')).not.toMatch(/reverse/)
  })
})
