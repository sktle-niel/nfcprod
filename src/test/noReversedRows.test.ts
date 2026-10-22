import { describe, expect, it } from 'vitest'

type Fs = {
  readdirSync(path: string, options: { withFileTypes: true; recursive: true }): { name: string; parentPath: string; isFile(): boolean }[]
  readFileSync(path: string, encoding: 'utf8'): string
}

// Vitest does not load CSS (`css: false`), so the stylesheets are read from disk, from the folder tests run in (the project
// root). A variable keeps the app's type-check, which has no Node types, from resolving the module.
async function stylesheets(): Promise<{ path: string; css: string }[]> {
  const node = 'node:fs'
  const { readdirSync, readFileSync } = (await import(/* @vite-ignore */ node)) as Fs
  return readdirSync('src', { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => {
      const path = `${entry.parentPath}/${entry.name}`
      return { path, css: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }
    })
}

describe('stylesheets', () => {
  it('never show a row or a column of controls in the opposite order of the page', async () => {
    const reversed = (await stylesheets()).filter(({ css }) => /(?:row|column)-reverse/.test(css)).map(({ path }) => path)
    // Tab and a screen reader follow the page, so what the eye sees first must come first in the page.
    expect(reversed).toEqual([])
  })

  it('are found: the check above would pass on nothing', async () => {
    expect((await stylesheets()).length).toBeGreaterThan(50)
  })
})
