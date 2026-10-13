import { ChartTable } from './ChartTable'
import styles from './MiniBars.module.css'
import type { Count } from './stats'

type Props = {
  points: readonly Count[]
  caption: string
  format?: (value: number) => string
}

/** Thin columns that grow from one baseline. Hover a bar for its value; the numbers are also in a table for screen readers. */
export function MiniBars({ points, caption, format = String }: Props) {
  const max = Math.max(...points.map((point) => point.value), 1)
  return (
    <figure className={styles.figure}>
      <div className={styles.bars} aria-hidden="true">
        {points.map((point) => (
          <span
            key={point.label}
            className={styles.bar}
            style={{ height: `${point.value > 0 ? Math.max(8, (point.value / max) * 100) : 0}%` }}
            title={`${point.label}: ${format(point.value)}`}
          />
        ))}
      </div>
      <ChartTable caption={caption} points={points} format={format} />
    </figure>
  )
}
