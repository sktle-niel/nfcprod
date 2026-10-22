import styles from './BarList.module.css'
import { Block, Pulse } from './Skeleton'
import type { Count } from './chart'

/** Stand-ins for `rows` rows, while the numbers load. */
export function BarListSkeleton({ rows }: { rows: number }) {
  return (
    <Pulse className={styles.list}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.row}>
          <Block width="45%" height={16} />
          <Block width={20} height={14} />
          <span className={styles.track} />
        </div>
      ))}
    </Pulse>
  )
}

/** Rows of a name, a number and a thin bar. One color, because the rows are names, not a scale. */
export function BarList({ rows }: { rows: readonly Count[] }) {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <ul className={styles.list}>
      {rows.map((row) => (
        <li key={row.label} className={styles.row}>
          <span className={styles.label}>{row.label}</span>
          <span className={styles.value}>{row.value}</span>
          <span className={styles.track} aria-hidden="true">
            <span className={styles.fill} style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
