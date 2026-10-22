import { beforeAll, describe, expect, it } from 'vitest'

// Vitest does not load CSS (`css: false`), so the stylesheet is read from disk (tests run from the project folder).
type Fs = { readFileSync(path: string, encoding: 'utf8'): string }

let css = ''
beforeAll(async () => {
  // A variable, so that the type-check of the app, which has no Node types, does not try to resolve the module.
  const node = 'node:fs'
  const { readFileSync } = (await import(/* @vite-ignore */ node)) as Fs
  css = readFileSync('src/features/dashboard/menu/items/ItemsToolbar.module.css', 'utf8')
})

/** The declarations of the rule whose selector is exactly `selector`. */
function ruleOf(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&')
  return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? ''
}

describe('the count of search results while it is empty', () => {
  it('is not taken out of the accessibility tree, so its first words are read out', () => {
    const empty = ruleOf('.count:empty')
    expect(empty).not.toBe('')
    expect(empty).not.toMatch(/display\s*:\s*none/)
    expect(empty).not.toMatch(/visibility\s*:\s*hidden/)
  })

  it('is clipped to nothing and leaves the flow of the toolbar, so it adds no gap and no line', () => {
    const empty = ruleOf('.count:empty')
    expect(empty).toMatch(/position\s*:\s*absolute/)
    expect(empty).toMatch(/clip-path\s*:\s*inset\(50%\)/)
    expect(empty).toMatch(/width\s*:\s*1px/)
  })
})
