import { describe, expect, it } from 'vitest'
import { checkImage, checkImageAddress, IMAGE_HEAD_BYTES, sniffImageType } from './image'
import { IMAGE_MAX_BYTES } from './menu'

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0))
const bytes = (...values: number[]) => Uint8Array.from(values)

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...ascii('JFIF'), 0x00, 0x01)
const PNG = bytes(0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d)
const WEBP = bytes(...ascii('RIFF'), 0x24, 0x08, 0x00, 0x00, ...ascii('WEBP'))
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
const TEXT = new TextEncoder().encode('hello, I am a text file named photo.png')
const GIF = bytes(...ascii('GIF89a'), 0x01, 0x00, 0x01, 0x00, 0x00, 0x00)
const WAVE = bytes(...ascii('RIFF'), 0x24, 0x08, 0x00, 0x00, ...ascii('WAVE'))

const base64 = (data: Uint8Array) => btoa(String.fromCharCode(...data))
const dataUrl = (type: string, data: Uint8Array) => `data:${type};base64,${base64(data)}`

describe('sniffImageType', () => {
  it('knows a JPEG, a PNG and a WebP by their first bytes', () => {
    expect(IMAGE_HEAD_BYTES).toBe(12)
    expect(sniffImageType(JPEG)).toBe('image/jpeg')
    expect(sniffImageType(PNG)).toBe('image/png')
    expect(sniffImageType(WEBP)).toBe('image/webp')
  })

  it('reads a WebP whatever its four size bytes say', () => {
    expect(sniffImageType(bytes(...ascii('RIFF'), 0xff, 0xff, 0xff, 0xff, ...ascii('WEBP')))).toBe('image/webp')
  })

  it.each([
    ['an SVG', SVG],
    ['a text file', TEXT],
    ['a GIF', GIF],
    ['a WAVE sound', WAVE],
    ['no bytes', bytes()],
    ['a cut-off PNG signature', PNG.subarray(0, 7)],
    ['a cut-off WebP', WEBP.subarray(0, 11)],
  ])('refuses %s', (_name, head) => {
    expect(sniffImageType(head)).toBeNull()
  })

  it('reads the bytes of a view that starts inside its buffer', () => {
    const file = bytes(0x00, 0x00, ...PNG)
    expect(sniffImageType(file.subarray(2))).toBe('image/png')
    expect(sniffImageType(file)).toBeNull()
  })

  it('refuses what is not bytes', () => {
    for (const head of [null, undefined, [0xff, 0xd8, 0xff], 'ÿØÿ', {}]) {
      expect(sniffImageType(head as unknown as Uint8Array)).toBeNull()
    }
  })
})

describe('checkImage', () => {
  it('takes a JPEG, PNG or WebP of up to 4 MB', () => {
    expect(checkImage({ size: 12_345, head: JPEG })).toBe('ok')
    expect(checkImage({ size: IMAGE_MAX_BYTES, head: PNG })).toBe('ok')
    expect(checkImage({ size: 1, head: WEBP })).toBe('ok')
  })

  it('refuses a picture over 4 MB', () => {
    expect(checkImage({ size: IMAGE_MAX_BYTES + 1, head: PNG })).toBe('tooLarge')
  })

  it('decides the kind first, so a large SVG is unsupported', () => {
    expect(checkImage({ size: IMAGE_MAX_BYTES * 10, head: SVG })).toBe('unsupported')
  })

  it('refuses a text file named like a picture', () => {
    expect(checkImage({ size: TEXT.length, head: TEXT })).toBe('unsupported')
  })

  it.each([Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY])('does not trust the size %s', (size) => {
    expect(checkImage({ size, head: JPEG })).toBe('tooLarge')
  })

  it('refuses input that is not a file description', () => {
    expect(checkImage(null as unknown as { size: number; head: Uint8Array })).toBe('unsupported')
    expect(checkImage({ size: 10 } as unknown as { size: number; head: Uint8Array })).toBe('unsupported')
  })
})

describe('checkImageAddress', () => {
  it('reads a missing picture as none', () => {
    expect(checkImageAddress(null)).toEqual({ ok: true, value: null })
    expect(checkImageAddress(undefined)).toEqual({ ok: true, value: null })
  })

  it('takes a data URL whose bytes are the picture it says', () => {
    for (const [type, data] of [
      ['image/jpeg', JPEG],
      ['image/png', PNG],
      ['image/webp', WEBP],
    ] as const) {
      expect(checkImageAddress(dataUrl(type, data))).toEqual({ ok: true, value: dataUrl(type, data) })
    }
  })

  it('rewrites the type of a data URL to what its bytes are', () => {
    expect(checkImageAddress(dataUrl('image/png', JPEG))).toEqual({ ok: true, value: dataUrl('image/jpeg', JPEG) })
  })

  it.each([
    ['SVG bytes that claim to be a PNG', dataUrl('image/png', SVG)],
    ['text bytes that claim to be a JPEG', dataUrl('image/jpeg', TEXT)],
    ['an SVG data URL', dataUrl('image/svg+xml', SVG)],
    ['a GIF data URL', dataUrl('image/gif', GIF)],
    ['an HTML data URL', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
    ['a data URL that is not base64', 'data:image/png,%89PNG'],
    ['an empty data URL', 'data:image/png;base64,'],
    ['base64 with a character it cannot have', `data:image/png;base64,${base64(PNG).slice(0, -4)}AA@A`],
    ['base64 of a broken length', `data:image/png;base64,${base64(PNG)}A`],
    ['padding in the middle', `data:image/png;base64,iVBO=w0KGgoAAAAN`],
    ['a data URL in capitals', dataUrl('IMAGE/PNG', PNG)],
    ['a data URL with extra parameters', `data:image/png;charset=utf-8;base64,${base64(PNG)}`],
  ])('refuses %s', (_name, value) => {
    expect(checkImageAddress(value)).toEqual({ ok: false, error: 'invalid' })
  })

  it('takes a picture of exactly 4 MB and refuses one byte more', () => {
    // 12 head bytes in 16 characters, then zero bytes: three per "AAAA", one in "AA==", two in "AAA=".
    const head = base64(PNG)
    const groups = 'AAAA'.repeat((IMAGE_MAX_BYTES - 12 - 1) / 3)
    expect(checkImageAddress(`data:image/png;base64,${head}${groups}AA==`).ok).toBe(true)
    expect(checkImageAddress(`data:image/png;base64,${head}${groups}AAA=`)).toEqual({ ok: false, error: 'invalid' })
    expect(checkImageAddress(`data:image/png;base64,${head}${groups}AAAAAAAA`)).toEqual({ ok: false, error: 'invalid' })
  })

  it('takes an https link in its clean form', () => {
    expect(checkImageAddress('https://CDN.example.com/menu/latte.webp')).toEqual({
      ok: true,
      value: 'https://cdn.example.com/menu/latte.webp',
    })
  })

  it.each([
    '',
    ' ',
    'http://cdn.example.com/latte.png',
    'javascript:alert(1)',
    '//cdn.example.com/latte.png',
    'latte.png',
    'blob:https://cdn.example.com/1',
    'https://me:pw@cdn.example.com/latte.png',
    ' https://cdn.example.com/latte.png',
    `https://cdn.example.com/${'a'.repeat(3000)}.png`,
  ])('refuses the address %j', (value) => {
    expect(checkImageAddress(value)).toEqual({ ok: false, error: 'invalid' })
  })

  it.each([42, true, {}, ['https://cdn.example.com/a.png']])('refuses %j, which is not an address', (value) => {
    expect(checkImageAddress(value)).toEqual({ ok: false, error: 'invalid' })
  })
})
