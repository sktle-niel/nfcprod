import { describe, expect, it } from 'vitest'
import { SAMPLE_KINDS, SAMPLE_PICTURES, samplePicture, samplePictureFor, samplePicturePath } from '@/entities/menu/samplePictures'
import { PLACEHOLDERS } from '@/shared/menu/photo/placeholders'

/*
 * The demo's product photos are a list (samplePictures.ts), a folder of files (public/sample) and a credits page (CREDITS.md),
 * kept in step here. Like src/test/stockLibrary.test.ts, the files are read from disk, from the folder tests run in, and the
 * module name is a variable so that the app's type-check, which has no Node types, does not try to resolve it.
 */

type Fs = {
  readdirSync(path: string): string[]
  readFileSync(path: string, encoding: 'utf8'): string
  readFileSync(path: string): Uint8Array
}

async function fs(): Promise<Fs> {
  const node = 'node:fs'
  return (await import(/* @vite-ignore */ node)) as Fs
}

const FOLDER = 'public/sample'

describe('the sample photos', () => {
  it('cover exactly the kinds of the drawn illustrations', () => {
    expect([...SAMPLE_KINDS].sort()).toEqual([...PLACEHOLDERS].sort())
  })

  it('have at least three photos of every kind, so a demo category does not repeat one', () => {
    for (const kind of SAMPLE_KINDS) expect(SAMPLE_PICTURES.filter((picture) => picture.kind === kind).length, kind).toBeGreaterThanOrEqual(3)
  })

  it('name each file once, by its kind and a number', () => {
    const files = SAMPLE_PICTURES.map((picture) => picture.file)
    expect(new Set(files).size).toBe(files.length)
    for (const picture of SAMPLE_PICTURES) expect(picture.file).toMatch(new RegExp(`^${picture.kind}-\\d+$`))
  })

  it('have a folder of exactly those files, each a JPEG under 120 KB', async () => {
    const { readdirSync, readFileSync } = await fs()
    expect(readdirSync(FOLDER).sort()).toEqual(SAMPLE_PICTURES.map((picture) => `${picture.file}.jpg`).sort())
    for (const picture of SAMPLE_PICTURES) {
      const bytes = readFileSync(`${FOLDER}/${picture.file}.jpg`)
      expect([bytes[0], bytes[1], bytes[2]], picture.file).toEqual([0xff, 0xd8, 0xff])
      expect(bytes.byteLength, picture.file).toBeLessThan(120 * 1024)
    }
  })

  it('are credited on CREDITS.md with the photographer and the Pexels page', async () => {
    const { readFileSync } = await fs()
    const credits = readFileSync('CREDITS.md', 'utf8')
    for (const picture of SAMPLE_PICTURES) {
      expect(picture.page, picture.file).toMatch(/^https:\/\/www\.pexels\.com\/photo\/[a-z0-9-]+\/$/)
      expect(credits, picture.file).toContain(`\`${picture.file}\``)
      expect(credits, picture.file).toContain(picture.photographer)
      expect(credits, picture.file).toContain(picture.page)
    }
  })
})

describe('samplePicture', () => {
  it('trusts the exact path of a sample photo and nothing else', () => {
    const [first] = SAMPLE_PICTURES
    expect(samplePicture(`/sample/${first?.file}.jpg`)).toBe(`/sample/${first?.file}.jpg`)
    for (const value of ['/sample/other.jpg', '/sample/../secret.jpg', '/sample/cup-1.jpg?x=1', 'sample/cup-1.jpg', '//evil.example/sample/cup-1.jpg', 'https://example.com/sample/cup-1.jpg', '', null, undefined, 7]) {
      expect(samplePicture(value), String(value)).toBeNull()
    }
  })

  it('names a listed photo by its file and throws on any other', () => {
    expect(samplePicturePath('bowl-3')).toBe('/sample/bowl-3.jpg')
    for (const file of ['bowl-9', '', '../bowl-3', 'bowl-3.jpg']) expect(() => samplePicturePath(file), file).toThrow(RangeError)
  })

  it('picks the nth photo of a kind and goes round, for any whole number', () => {
    const ofKind = SAMPLE_PICTURES.filter((picture) => picture.kind === 'cup')
    expect(samplePictureFor('cup', 0)).toBe(`/sample/${ofKind[0]?.file}.jpg`)
    expect(samplePictureFor('cup', ofKind.length)).toBe(samplePictureFor('cup', 0))
    expect(samplePictureFor('cup', -1)).toBe(`/sample/${ofKind.at(-1)?.file}.jpg`)
    expect(new Set([0, 1, 2].map((n) => samplePictureFor('cup', n))).size).toBe(3)
  })
})
