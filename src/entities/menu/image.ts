import { fail, isMissing, pass, readField, type Check } from '@/shared/lib/checks'
import { parseHttpsUrl } from '@/shared/lib/url'
import { IMAGE_MAX_BYTES, type ImageType } from './menu'

// The first bytes of each kind of picture we take. A file name or a declared type can lie; these bytes cannot.
const SIGNATURES: readonly { type: ImageType; bytes: readonly (number | null)[] }[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // "RIFF", four bytes of size (any value), "WEBP".
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] },
]

/** How many first bytes of a file `sniffImageType` needs to see. */
export const IMAGE_HEAD_BYTES = 12

function bytesOf(head: unknown): Uint8Array | null {
  if (!ArrayBuffer.isView(head)) return null
  try {
    return new Uint8Array(head.buffer, head.byteOffset, head.byteLength)
  } catch {
    return null
  }
}

function sniff(head: unknown): ImageType | null {
  const bytes = bytesOf(head)
  if (bytes === null) return null
  const found = SIGNATURES.find(
    ({ bytes: signature }) =>
      signature.length <= bytes.length && signature.every((byte, i) => byte === null || bytes[i] === byte),
  )
  return found ? found.type : null
}

/** The kind of picture the first bytes of a file show, or null when they are not a JPEG, PNG or WebP (an SVG never is). */
export function sniffImageType(head: Uint8Array): ImageType | null {
  return sniff(head)
}

export type ImageCheck = 'ok' | 'tooLarge' | 'unsupported'

/** Whether a file can be a picture: its kind from its first bytes (decided first), then its size. */
export function checkImage(input: { size: number; head: Uint8Array }): ImageCheck {
  if (sniff(readField(input, 'head')) === null) return 'unsupported'
  const size = readField(input, 'size')
  return typeof size === 'number' && Number.isSafeInteger(size) && size >= 0 && size <= IMAGE_MAX_BYTES ? 'ok' : 'tooLarge'
}

const DATA_URL_HEAD = /^data:image\/(?:png|jpeg|webp);base64,/
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/
// The longest data URL a picture can be: IMAGE_MAX_BYTES in base64, after the longest head.
const DATA_URL_MAX = 'data:image/jpeg;base64,'.length + Math.ceil(IMAGE_MAX_BYTES / 3) * 4
const IMAGE_URL_MAX = 2048

function decodeHead(body: string): Uint8Array {
  return Uint8Array.from(atob(body.slice(0, 16)), (char) => char.charCodeAt(0))
}

function checkDataUrl(value: string): Check<string> {
  const head = DATA_URL_HEAD.exec(value.slice(0, 32))
  if (head === null || value.length > DATA_URL_MAX) return fail('invalid')
  const body = value.slice(head[0].length)
  if (body === '' || body.length % 4 !== 0 || !BASE64.test(body)) return fail('invalid')
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0
  if ((body.length / 4) * 3 - padding > IMAGE_MAX_BYTES) return fail('invalid')
  const type = sniffImageType(decodeHead(body))
  // The head is rewritten to the kind the bytes show, so a JPEG uploaded as "photo.png" still says image/jpeg.
  return type === null ? fail('invalid') : pass(`data:${type};base64,${body}`)
}

/**
 * Where a picture is: null for none; a base64 data URL whose bytes are really a JPEG, PNG or WebP (what an upload gives
 * back for now); or an https link (the server will only take its own storage). Anything else is 'invalid'.
 */
export function checkImageAddress(value: unknown): Check<string | null> {
  if (isMissing(value)) return pass(null)
  if (typeof value !== 'string') return fail('invalid')
  if (value.startsWith('data:')) return checkDataUrl(value)
  const url = parseHttpsUrl(value, IMAGE_URL_MAX)
  return url === null ? fail('invalid') : pass(url.href)
}
