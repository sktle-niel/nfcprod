import { describe, expect, it, vi } from 'vitest'
import { QR_DARK, QR_LIGHT } from './qrColors'
import { drawQr, PNG_SIZE, qrPngBlob, qrSvgText, saveBlob, type CanvasLike, type Drawing, type SaveEnv } from './qrFiles'
import { qrMatrix, qrPath, qrSide, QUIET_ZONE, type QrMatrix } from './qrMatrix'

const TINY: QrMatrix = [
  [true, false],
  [false, true],
]

type Paint = { color: string; x: number; y: number; width: number; height: number }

function fakeDrawing() {
  const paints: Paint[] = []
  const drawing: Drawing = {
    fillStyle: '',
    fillRect(x, y, width, height) {
      paints.push({ color: this.fillStyle, x, y, width, height })
    },
  }
  return { drawing, paints }
}

describe('qrSvgText', () => {
  it('is a standalone SVG of the same path the page draws, dark on a white tile', () => {
    const matrix = qrMatrix('https://menu.example/m/kape-kanto')!
    const svg = qrSvgText(matrix)
    const side = qrSide(matrix)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain(`viewBox="0 0 ${side} ${side}"`)
    expect(svg).toContain(`<path d="${qrPath(matrix)}" fill="${QR_DARK}"/>`)
    expect(svg).toContain(`fill="${QR_LIGHT}"`)
  })
})

describe('drawQr', () => {
  it('paints a white square first and then one dark square per dark module', () => {
    const { drawing, paints } = fakeDrawing()
    drawQr(drawing, TINY, 100)
    expect(paints[0]).toEqual({ color: QR_LIGHT, x: 0, y: 0, width: 100, height: 100 })
    const dark = paints.slice(1)
    expect(dark.every((paint) => paint.color === QR_DARK)).toBe(true)
    expect(dark).toHaveLength(2)
  })

  it('uses whole pixels and centres the code, so a quiet zone stays on every side', () => {
    const { drawing, paints } = fakeDrawing()
    drawQr(drawing, TINY, 100)
    const modules = 2 + 2 * QUIET_ZONE
    const unit = Math.floor(100 / modules)
    const offset = Math.floor((100 - unit * modules) / 2)
    expect(paints[1]).toEqual({ color: QR_DARK, x: offset + QUIET_ZONE * unit, y: offset + QUIET_ZONE * unit, width: unit, height: unit })
    expect(paints[2]).toEqual({
      color: QR_DARK,
      x: offset + (1 + QUIET_ZONE) * unit,
      y: offset + (1 + QUIET_ZONE) * unit,
      width: unit,
      height: unit,
    })
  })

  it('paints a real code only inside its quiet zone', () => {
    const matrix = qrMatrix('https://menu.example/m/kape-kanto')!
    const { drawing, paints } = fakeDrawing()
    drawQr(drawing, matrix, PNG_SIZE)
    const unit = Math.floor(PNG_SIZE / qrSide(matrix))
    for (const paint of paints.slice(1)) {
      expect(paint.x).toBeGreaterThanOrEqual(QUIET_ZONE * unit)
      expect(paint.y).toBeGreaterThanOrEqual(QUIET_ZONE * unit)
      expect(paint.x + paint.width).toBeLessThanOrEqual(PNG_SIZE - QUIET_ZONE * unit)
    }
  })
})

describe('qrPngBlob', () => {
  function fakeCanvas(blob: Blob | null, hasContext = true) {
    const { drawing, paints } = fakeDrawing()
    const sizes: number[] = []
    const canvas: CanvasLike = {
      setSize: (size) => void sizes.push(size),
      drawing: () => (hasContext ? drawing : null),
      toPng: (done) => done(blob),
    }
    return { canvas, paints, sizes }
  }

  it('draws on a canvas of 1024 pixels and gives the PNG it makes', async () => {
    const png = new Blob(['png'], { type: 'image/png' })
    const { canvas, paints, sizes } = fakeCanvas(png)
    await expect(qrPngBlob(TINY, () => canvas)).resolves.toBe(png)
    expect(sizes).toEqual([PNG_SIZE])
    expect(paints.length).toBeGreaterThan(1)
  })

  it('rejects when the browser has no 2D canvas', async () => {
    await expect(qrPngBlob(TINY, () => fakeCanvas(null, false).canvas)).rejects.toThrow()
  })

  it('rejects when the canvas cannot make a picture', async () => {
    await expect(qrPngBlob(TINY, () => fakeCanvas(null).canvas)).rejects.toThrow()
  })
})

describe('saveBlob', () => {
  function fakeEnv(click: SaveEnv['click'] = () => {}) {
    const later: (() => void)[] = []
    const env: SaveEnv = {
      createUrl: vi.fn(() => 'blob:fake'),
      revokeUrl: vi.fn(),
      later: (work) => void later.push(work),
      click: vi.fn(click),
    }
    return { env, later }
  }

  it('downloads the blob under the file name and frees the address only afterwards', () => {
    const blob = new Blob(['x'])
    const { env, later } = fakeEnv()
    saveBlob(blob, 'kape-kanto-qr.png', env)
    expect(env.createUrl).toHaveBeenCalledWith(blob)
    expect(env.click).toHaveBeenCalledWith('blob:fake', 'kape-kanto-qr.png')
    expect(env.revokeUrl).not.toHaveBeenCalled()
    later.forEach((work) => work())
    expect(env.revokeUrl).toHaveBeenCalledWith('blob:fake')
  })

  it('still frees the address when the download could not start', () => {
    const { env, later } = fakeEnv(() => {
      throw new Error('blocked')
    })
    expect(() => saveBlob(new Blob(['x']), 'a.svg', env)).toThrow('blocked')
    later.forEach((work) => work())
    expect(env.revokeUrl).toHaveBeenCalledWith('blob:fake')
  })
})
