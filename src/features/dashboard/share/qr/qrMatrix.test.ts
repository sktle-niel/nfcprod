import { encode } from 'uqr'
import { describe, expect, it } from 'vitest'
import { qrMatrix, qrPath, qrSide, QUIET_ZONE, type QrMatrix } from './qrMatrix'

const LINK = 'https://menu.example/m/kape-kanto'

/** Reads the dark modules back out of a path made of `M x y h n v1 h-n z` rectangles. */
function gridOf(path: string, size: number): boolean[][] {
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => false))
  for (const [, x, y, length] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(length); i += 1) grid[Number(y)]![Number(x) + i] = true
  }
  return grid
}

describe('qrMatrix', () => {
  it('is the matrix uqr encodes for the link, without a border', () => {
    expect(qrMatrix(LINK)).toEqual(encode(LINK, { ecc: 'M', border: 0 }).data)
  })

  it('is square, with finder squares in three corners', () => {
    const matrix = qrMatrix(LINK)!
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true)
    expect(matrix[0]!.slice(0, 7).every(Boolean)).toBe(true)
    expect(matrix[0]!.slice(-7).every(Boolean)).toBe(true)
    expect(matrix.at(-1)!.slice(0, 7).every(Boolean)).toBe(true)
    // The fourth corner has none.
    expect(matrix.at(-1)!.slice(-7).every(Boolean)).toBe(false)
  })

  it('gives nothing for text that does not fit in a code', () => {
    expect(qrMatrix('x'.repeat(5000))).toBeNull()
  })
})

describe('qrPath', () => {
  it('draws exactly the dark modules of the matrix, shifted by the quiet zone', () => {
    const matrix = qrMatrix(LINK)!
    const side = qrSide(matrix)
    expect(side).toBe(matrix.length + 2 * QUIET_ZONE)
    const drawn = gridOf(qrPath(matrix), side)
    const expected = Array.from({ length: side }, (_, y) =>
      Array.from({ length: side }, (_, x) => matrix[y - QUIET_ZONE]?.[x - QUIET_ZONE] === true),
    )
    expect(drawn).toEqual(expected)
  })

  it('leaves the quiet zone empty', () => {
    const matrix = qrMatrix(LINK)!
    const drawn = gridOf(qrPath(matrix), qrSide(matrix))
    expect(drawn.slice(0, QUIET_ZONE).flat().some(Boolean)).toBe(false)
    expect(drawn.every((row) => row.slice(0, QUIET_ZONE).every((dark) => !dark))).toBe(true)
  })

  it('joins a run of dark modules into one rectangle', () => {
    const matrix: QrMatrix = [
      [true, true, true, false, true],
      [false, false, false, false, false],
    ]
    expect(qrPath(matrix)).toBe('M4 4h3v1h-3zM8 4h1v1h-1z')
  })

  it('is empty for a matrix without dark modules', () => {
    expect(qrPath([[false, false]])).toBe('')
  })
})
