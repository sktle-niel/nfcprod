import { describe, expect, it } from 'vitest'

// Vitest does not load CSS (`css: false`), so the stylesheets are read from disk. A live region that is empty must stay in the
// accessibility tree: screen readers speak a change inside a region that exists, but often miss one that appears
// together with its text. `display: none` takes it out, so the empty rule has to clip it instead.
const sheets = ['Share.module.css', '../LinkActions.module.css']

type Fs = { readFileSync(path: URL, encoding: 'utf8'): string }

async function read(name: string): Promise<string> {
  // A variable, so that the type-check of the app, which has no Node types, does not try to resolve the module.
  const node = 'node:fs'
  const { readFileSync } = (await import(/* @vite-ignore */ node)) as Fs
  return readFileSync(new URL(name, import.meta.url), 'utf8')
}

/** The declarations of every rule whose selector list has a `:empty` selector. */
function emptyRules(css: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((rule) => /:empty/.test(rule[1] ?? '')).map((rule) => rule[2] ?? '')
}

describe('the empty status lines of the Share page', () => {
  it.each(sheets)('%s clips an empty status line and never hides it with display:none', async (name) => {
    const rules = emptyRules(await read(name))
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule).not.toMatch(/display\s*:\s*none/)
      expect(rule).not.toMatch(/visibility\s*:\s*hidden/)
      expect(rule).toMatch(/clip-path\s*:\s*inset\(50%\)/)
      expect(rule).toMatch(/position\s*:\s*absolute/)
    }
  })
})
