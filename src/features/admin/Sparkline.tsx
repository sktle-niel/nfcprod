import { ChartTable } from './ChartTable'
import styles from './Sparkline.module.css'
import type { Count } from './stats'

type Props = {
  points: readonly Count[]
  caption: string
  format?: (value: number) => string
}

// The plot is drawn in a 100 x 100 box and stretched to the tile; the line keeps its 2px width.
const LEFT = 3
const RIGHT = 97
const TOP = 8
const BOTTOM = 92

/** A trend line in a quiet gray with the latest value marked in the accent. */
export function Sparkline({ points, caption, format = String }: Props) {
  const max = Math.max(...points.map((point) => point.value), 1)
  const coords = points.map((point, index) => ({
    x: points.length > 1 ? LEFT + (index / (points.length - 1)) * (RIGHT - LEFT) : RIGHT,
    y: BOTTOM - (point.value / max) * (BOTTOM - TOP),
  }))
  const line = coords.map((c, index) => `${index === 0 ? 'M' : 'L'}${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ')
  const end = coords[coords.length - 1]
  const last = points[points.length - 1]

  return (
    <figure className={styles.figure}>
      <div className={styles.plot} aria-hidden="true">
        <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none">
          <path className={styles.line} d={line} />
        </svg>
        {end && last && (
          <span
            className={styles.dot}
            style={{ left: `${end.x}%`, top: `${end.y}%` }}
            title={`${last.label}: ${format(last.value)}`}
          />
        )}
      </div>
      <ChartTable caption={caption} points={points} format={format} />
    </figure>
  )
}
