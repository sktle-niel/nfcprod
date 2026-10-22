import { QR_DARK, QR_LIGHT } from './qrColors'
import { qrPath, qrSide, type QrMatrix } from './qrMatrix'

type Props = {
  matrix: QrMatrix
  /** What a screen reader says about the picture. */
  label: string
  className?: string | undefined
}

/** The QR code as SVG elements: one rectangle for the tile and one path for the dark modules. */
export function QrCode({ matrix, label, className }: Props) {
  const side = qrSide(matrix)
  return (
    <svg viewBox={`0 0 ${side} ${side}`} role="img" aria-label={label} shapeRendering="crispEdges" className={className}>
      <rect width={side} height={side} fill={QR_LIGHT} />
      <path d={qrPath(matrix)} fill={QR_DARK} />
    </svg>
  )
}
