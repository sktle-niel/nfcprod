import { describe, expect, it } from 'vitest'
import { STOCK_CATEGORIES, STOCK_PHOTOS } from '@/entities/theme/stockPhotos'
import { photoFits } from '@/shared/menu/usePhotoBackdrop'

/*
 * The photo library is a list (stockPhotos.ts), a folder of files (public/stock) and a credits page (CREDITS.md). They are made
 * together by a script, and this keeps them in step when a photo is added or taken out. Like src/test/css.ts, the files are read
 * from disk, from the folder tests run in (the project root), and the module name is a variable so that the app's type-check,
 * which has no Node types, does not try to resolve it.
 */

type Fs = {
  readdirSync(path: string, options: { withFileTypes: true; recursive: true }): { name: string; parentPath: string; isFile(): boolean }[]
  readFileSync(path: string, encoding: 'utf8'): string
  readFileSync(path: string): Uint8Array
}

async function fs(): Promise<Fs> {
  const node = 'node:fs'
  return (await import(/* @vite-ignore */ node)) as Fs
}

const FOLDER = 'public/stock'

/** Every file under public/stock, as the path after the folder with forward slashes, such as 'coffee/latte-dark.jpg'. */
async function filesOnDisk(): Promise<string[]> {
  const { readdirSync } = await fs()
  return readdirSync(FOLDER, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `${entry.parentPath}/${entry.name}`.replaceAll('\\', '/').slice(`${FOLDER}/`.length))
}

/** The pixel size a JPEG declares, read from its first start-of-frame marker, or null when none is found. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // After the start-of-image marker, every segment is 0xFF, a marker byte and a two-byte length that counts itself.
  let at = 2
  while (at + 9 < view.byteLength) {
    if (view.getUint8(at) !== 0xff) return null
    const marker = view.getUint8(at + 1)
    // The start-of-frame markers (C0 to CF) hold the size, except the table (C4), the reserved (C8) and the arithmetic (CC) ones.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: view.getUint16(at + 5), width: view.getUint16(at + 7) }
    }
    at += 2 + view.getUint16(at + 2)
  }
  return null
}

describe('the photo library on disk', () => {
  const expected = STOCK_PHOTOS.flatMap((photo) => [`${photo.file}.jpg`, `${photo.file}.thumb.jpg`])

  it('has the photo and its thumbnail for every entry of the list', async () => {
    const onDisk = new Set(await filesOnDisk())
    expect(expected.filter((file) => !onDisk.has(file))).toEqual([])
  })

  it('has no file the list does not name', async () => {
    const named = new Set(expected)
    expect((await filesOnDisk()).filter((file) => !named.has(file))).toEqual([])
  })

  it('gives every photo an id of its own that starts with its category, in the folder of that category', () => {
    const ids = STOCK_PHOTOS.map((photo) => photo.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(STOCK_PHOTOS.map((photo) => photo.file)).size).toBe(STOCK_PHOTOS.length)
    for (const photo of STOCK_PHOTOS) {
      expect(photo.id.startsWith(`${photo.category}-`), photo.id).toBe(true)
      expect(photo.file.startsWith(`${photo.category}/`), photo.id).toBe(true)
    }
  })

  it('keeps every file name to lowercase letters, digits and hyphens, so it is safe inside url("...") and in a path', () => {
    for (const photo of STOCK_PHOTOS) {
      expect(photo.id, photo.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)+$/)
      expect(photo.file, photo.id).toMatch(/^[a-z0-9]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/)
    }
  })

  it('has at least one photo in every category', () => {
    for (const category of STOCK_CATEGORIES) {
      expect(STOCK_PHOTOS.some((photo) => photo.category === category), category).toBe(true)
    }
  })

  it('is wide enough that a 1920 px screen stays within the upscale rule of the menu, whatever the photo', () => {
    // The menu swaps a photo for a texture past 1.5 times its width (photoFits): 1920 / 1.5 is 1280.
    for (const photo of STOCK_PHOTOS) {
      expect(photo.width, photo.id).toBeGreaterThanOrEqual(1280)
      expect(photoFits(1920, photo.width), photo.id).toBe(true)
    }
  })

  it('credits every photo in CREDITS.md', async () => {
    const { readFileSync } = await fs()
    const credits = readFileSync('CREDITS.md', 'utf8')
    for (const photo of STOCK_PHOTOS) expect(credits, photo.id).toContain(`\`${photo.id}\``)
  })

  it('lists the real size of each photo, which the menu trusts instead of loading the file', async () => {
    const { readFileSync } = await fs()
    for (const photo of STOCK_PHOTOS) {
      expect(jpegSize(readFileSync(`${FOLDER}/${photo.file}.jpg`)), photo.id).toEqual({ width: photo.width, height: photo.height })
    }
  })
})
