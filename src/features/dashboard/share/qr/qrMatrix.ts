import { encode } from 'uqr'

/** Rows of modules, true for a dark one. */
export type QrMatrix = readonly (readonly boolean[])[]

/** The empty border a scanner needs around the code, in modules (the QR standard asks for four). */
export const QUIET_ZONE = 4

/**
 * The modules of a QR code for `text`, or null when the text does not fit in one. Level M survives a scuffed card and
 * still keeps the code small for a short link. The quiet zone is added when drawing, so the border here is zero.
 */
export function qrMatrix(text: string): QrMatrix | null {
  try {
    return encode(text, { ecc: 'M', border: 0 }).data
  } catch {
    return null
  }
}

/** Width and height of the drawing, in modules, with the quiet zone. */
export function qrSide(matrix: QrMatrix): number {
  return matrix.length + QUIET_ZONE * 2
}

/** One SVG path for all the dark modules: each horizontal run of them is a single rectangle. */
export function qrPath(matrix: QrMatrix): string {
  const parts: string[] = []
  matrix.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x += 1
        continue
      }
      const start = x
      while (row[x]) x += 1
      const length = x - start
      parts.push(`M${start + QUIET_ZONE} ${y + QUIET_ZONE}h${length}v1h-${length}z`)
    }
  })
  return parts.join('')
}
