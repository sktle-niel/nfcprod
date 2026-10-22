import type { CardKind, HeaderKind, PhotoShape } from '@/entities/theme/theme'

/**
 * Tiny drawings of the choices, made of plain shapes on a 48 by 36 box: [shape, left, top, width, height]. The shapes are
 * styled in Glyph.module.css (app tokens only). `fill` is a card, `box` an outlined card, `pic` a picture, `cut` a picture
 * without a frame, `line` and `bold` text, `price` a price chip, `dots` a dotted leader.
 */
export const GLYPH_PARTS = [
  'fill',
  'softFill',
  'box',
  'pic',
  'round',
  'arch',
  'cut',
  'pedestal',
  'line',
  'bold',
  'price',
  'priceDot',
  'tag',
  'dots',
  'rule',
  'star',
  'awning',
  'frame',
  'diamond',
  'script',
] as const
export type GlyphPart = (typeof GLYPH_PARTS)[number]
export type Part = readonly [GlyphPart, number, number, number, number]

/** The same parts moved right by `dx` and down by `dy`, to repeat a card. */
const at = (dx: number, dy: number, parts: readonly Part[]): Part[] =>
  parts.map(([shape, x, y, w, h]) => [shape, x + dx, y + dy, w, h] as const)

const rowCard: Part[] = [['fill', 0, 0, 48, 16], ['bold', 3, 4, 22, 3], ['line', 3, 10, 16, 2], ['pic', 34, 2, 12, 12]]
const leaderRow: Part[] = [['round', 0, 0, 8, 8], ['bold', 10, 2, 14, 3], ['dots', 25, 4, 14, 1], ['bold', 41, 2, 7, 3]]
const tileCard: Part[] = [['fill', 0, 0, 22, 36], ['pic', 2, 2, 18, 13], ['bold', 2, 18, 14, 3], ['line', 2, 23, 17, 2], ['price', 2, 28, 9, 5]]
const badgeCard: Part[] = [['pedestal', 2, 21, 18, 5], ['cut', 5, 4, 12, 19], ['priceDot', 14, 1, 8, 8], ['bold', 4, 30, 14, 3]]
const plateRow: Part[] = [['round', 0, 0, 14, 14], ['priceDot', 10, 0, 5, 5], ['bold', 18, 2, 18, 3], ['rule', 18, 8, 30, 1], ['line', 18, 11, 12, 2], ['bold', 41, 2, 7, 3]]

export const CARD_GLYPHS: Readonly<Record<CardKind, readonly Part[]>> = {
  row: [...rowCard, ...at(0, 20, rowCard)],
  leader: [...leaderRow, ...at(0, 14, leaderRow), ...at(0, 28, leaderRow)],
  tile: [...tileCard, ...at(26, 0, tileCard)],
  badge: [...badgeCard, ...at(26, 0, badgeCard)],
  outline: [['box', 0, 5, 40, 26], ['bold', 4, 10, 18, 3], ['line', 4, 16, 14, 2], ['price', 4, 22, 12, 5], ['cut', 31, 2, 17, 30]],
  soft: [['softFill', 0, 5, 40, 26], ['bold', 4, 11, 20, 4], ['line', 4, 18, 13, 2], ['cut', 29, 3, 19, 29], ['tag', 20, 23, 11, 6]],
  plate: [...plateRow, ...at(0, 20, plateRow)],
  poster: [['cut', 0, 2, 17, 32], ['bold', 21, 5, 25, 4], ['line', 21, 13, 11, 2], ['line', 35, 13, 11, 2], ['line', 21, 18, 11, 2], ['line', 35, 18, 11, 2], ['bold', 21, 26, 13, 3]],
}

export const HEADER_GLYPHS: Readonly<Record<HeaderKind, readonly Part[]>> = {
  plain: [['round', 0, 2, 11, 11], ['bold', 0, 17, 30, 4], ['line', 0, 25, 22, 2]],
  awning: [['awning', 0, 0, 48, 9], ['bold', 10, 17, 28, 4], ['line', 14, 25, 20, 2]],
  poster: [['star', 1, 4, 6, 6], ['bold', 9, 6, 30, 9], ['star', 41, 4, 6, 6], ['line', 14, 22, 20, 2]],
  script: [['round', 19, 0, 10, 10], ['script', 8, 13, 32, 8], ['line', 14, 26, 20, 2]],
  frame: [['frame', 4, 5, 40, 26], ['diamond', 22, 2, 5, 5], ['bold', 12, 14, 24, 3], ['line', 16, 21, 16, 2]],
}

export const PHOTO_GLYPHS: Readonly<Record<PhotoShape, readonly Part[]>> = {
  rounded: [['pic', 10, 2, 28, 28]],
  circle: [['round', 10, 2, 28, 28]],
  arch: [['arch', 12, 0, 24, 32]],
  cutout: [['pedestal', 10, 28, 28, 6], ['cut', 14, 0, 20, 31]],
}
