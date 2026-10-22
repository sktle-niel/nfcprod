import { QR_DARK, QR_LIGHT } from './qrColors'
import { qrPath, qrSide, QUIET_ZONE, type QrMatrix } from './qrMatrix'

/** The side of the PNG in pixels. */
export const PNG_SIZE = 1024

/** The text of a standalone SVG file of the code. Built from numbers and fixed colors only, and saved as a file, never put in the page. */
export function qrSvgText(matrix: QrMatrix): string {
  const side = qrSide(matrix)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${PNG_SIZE}" height="${PNG_SIZE}" shape-rendering="crispEdges">` +
    `<rect width="${side}" height="${side}" fill="${QR_LIGHT}"/><path d="${qrPath(matrix)}" fill="${QR_DARK}"/></svg>`
  )
}

/** The part of a 2D canvas context this file uses, so a test can pass a fake. */
export type Drawing = {
  fillStyle: string
  fillRect(x: number, y: number, width: number, height: number): void
}

/** The part of a canvas element this file uses. */
export type CanvasLike = {
  /** Makes the canvas a square of `size` pixels. */
  setSize(size: number): void
  /** The 2D drawing, or null when the browser has none. */
  drawing(): Drawing | null
  toPng(done: (blob: Blob | null) => void): void
}

/** Paints the code on a white square of `size` pixels. Modules are whole pixels, so the edges stay sharp. */
export function drawQr(drawing: Drawing, matrix: QrMatrix, size: number): void {
  const modules = qrSide(matrix)
  const unit = Math.max(1, Math.floor(size / modules))
  // Whatever does not divide evenly becomes extra quiet zone, evenly on both sides.
  const offset = Math.floor((size - unit * modules) / 2)
  drawing.fillStyle = QR_LIGHT
  drawing.fillRect(0, 0, size, size)
  drawing.fillStyle = QR_DARK
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) drawing.fillRect(offset + (x + QUIET_ZONE) * unit, offset + (y + QUIET_ZONE) * unit, unit, unit)
    })
  })
}

function pageCanvas(): CanvasLike {
  const canvas = document.createElement('canvas')
  return {
    setSize: (size) => {
      canvas.width = size
      canvas.height = size
    },
    drawing: () => {
      const context = canvas.getContext('2d')
      if (!context) return null
      return {
        get fillStyle() {
          return String(context.fillStyle)
        },
        set fillStyle(color: string) {
          context.fillStyle = color
        },
        fillRect: (x, y, width, height) => context.fillRect(x, y, width, height),
      }
    },
    toPng: (done) => canvas.toBlob(done, 'image/png'),
  }
}

/** The PNG of the code. Rejects when the browser has no canvas or cannot encode the picture. */
export function qrPngBlob(matrix: QrMatrix, makeCanvas: () => CanvasLike = pageCanvas): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = makeCanvas()
    canvas.setSize(PNG_SIZE)
    const drawing = canvas.drawing()
    if (!drawing) {
      reject(new Error('No canvas'))
      return
    }
    drawQr(drawing, matrix, PNG_SIZE)
    canvas.toPng((blob) => (blob ? resolve(blob) : reject(new Error('No picture'))))
  })
}

/** What saving a file needs from the page, so a test can pass a fake. */
export type SaveEnv = {
  createUrl(blob: Blob): string
  revokeUrl(url: string): void
  /** Runs `work` a little later: the download must have started before its address is revoked. */
  later(work: () => void): void
  click(url: string, filename: string): void
}

const pageEnv: SaveEnv = {
  createUrl: (blob) => URL.createObjectURL(blob),
  revokeUrl: (url) => URL.revokeObjectURL(url),
  later: (work) => void setTimeout(work, 1000),
  click: (url, filename) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.hidden = true
    document.body.append(link)
    link.click()
    link.remove()
  },
}

/** Hands `blob` to the browser as a download and frees its address afterwards. */
export function saveBlob(blob: Blob, filename: string, env: SaveEnv = pageEnv): void {
  const url = env.createUrl(blob)
  try {
    env.click(url, filename)
  } finally {
    env.later(() => env.revokeUrl(url))
  }
}
