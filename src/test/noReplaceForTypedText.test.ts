import { describe, expect, it } from 'vitest'

type Fs = {
  readdirSync(path: string, options: { withFileTypes: true; recursive: true }): { name: string; parentPath: string; isFile(): boolean }[]
  readFileSync(path: string, encoding: 'utf8'): string
}

// Tests read the sources from disk, from the project root. The module name is a variable so that the app's type-check,
// which has no Node types, does not try to resolve it.
async function sources(): Promise<{ path: string; code: string }[]> {
  const node = 'node:fs'
  const { readdirSync, readFileSync } = (await import(/* @vite-ignore */ node)) as Fs
  return readdirSync('src', { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name))
    .map((entry) => {
      const path = `${entry.parentPath}/${entry.name}`
      return { path, code: readFileSync(path, 'utf8') }
    })
}

describe('placeholders that take what a person typed', () => {
  it('are filled with fill(), never with String.replace, which reads "$&" and "$$" in the value as patterns', async () => {
    // {name}, {query} and {label} are the places that hold an item, a category, a group, an option or a search the owner typed.
    const offenders = (await sources())
      .filter(({ code }) => /\.replace\('\{(?:name|query|label)\}'/.test(code))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  it('are found: the check above would pass on nothing', async () => {
    expect((await sources()).length).toBeGreaterThan(200)
  })
})
