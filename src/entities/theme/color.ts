// Colors are always `#rrggbb` here: one strict form that is easy to check and can never carry CSS.
const HEX = /^#[0-9a-f]{6}$/i

/** The two text colors drawn on a colored shape such as an accent button. */
export const WHITE = '#ffffff'
export const INK = '#19202b'

/** True for a color written `#rrggbb`, in either case. Nothing else (no names, no `#rgb`, no alpha) is a color here. */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value)
}

/** The stored form of a color: lowercase. */
export function normalizeHex(value: string): string {
  return value.toLowerCase()
}

type Rgb = readonly [number, number, number]

function rgbOf(hex: string): Rgb | null {
  if (!isHexColor(hex)) return null
  const value = Number.parseInt(hex.slice(1), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

function hexOf(rgb: Rgb): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

// WCAG 2.x relative luminance: each sRGB channel to linear light, then weighted by how bright the eye sees it.
function linear(channel: number): number {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** The WCAG 2.x contrast ratio of two colors, from 1 to 21. A color that is not `#rrggbb` counts as no contrast (1). */
export function contrastRatio(a: string, b: string): number {
  const rgbA = rgbOf(a)
  const rgbB = rgbOf(b)
  if (rgbA === null || rgbB === null) return 1
  const lumA = luminance(rgbA)
  const lumB = luminance(rgbB)
  return (Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05)
}

/**
 * True when `hex` is closer to black than to white, that is when white reads better on it than black does.
 * Null when it is not `#rrggbb`: a half typed color is neither dark nor light.
 */
export function isDarkColor(hex: string): boolean | null {
  const rgb = rgbOf(hex)
  if (rgb === null) return null
  return luminance(rgb) < 0.179
}

/** The text color for something drawn on `hex`, such as the label of an accent button: white or ink, whichever reads better. */
export function readableOn(hex: string): string {
  return contrastRatio(hex, WHITE) > contrastRatio(hex, INK) ? WHITE : INK
}

/** `a` moved toward `b` by `weight` (0 keeps `a`, 1 gives `b`), channel by channel. Null when either is not `#rrggbb`. */
export function mixHex(a: string, b: string, weight: number): string | null {
  const from = rgbOf(a)
  const to = rgbOf(b)
  if (from === null || to === null || !(weight >= 0 && weight <= 1)) return null
  const mix = (x: number, y: number) => Math.round(x + (y - x) * weight)
  return hexOf([mix(from[0], to[0]), mix(from[1], to[1]), mix(from[2], to[2])])
}
