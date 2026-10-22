import type { ReactNode } from 'react'
import { formatPercent } from '@/shared/lib/format'
import { IconTrend } from './icons'
import { Block, Pulse } from './Skeleton'
import styles from './StatTile.module.css'

type Props = {
  label: string
  value: string
  /** Percent change against the previous period. Left out when there is nothing to compare with. */
  delta?: number | null
  /** Names that previous period, for example "vs previous 30 days". */
  versus?: string
  /** Waiting for the numbers: the label stays, the rest becomes skeleton blocks. */
  loading?: boolean
  /** Height of the plot or list under the number, so the skeleton takes the same room. */
  bodyHeight?: number
  children?: ReactNode
}

/** One headline number with its change, and optionally a small plot or list under it. */
export function StatTile({ label, value, delta = null, versus, loading = false, bodyHeight, children }: Props) {
  const sign = delta === null || delta === 0 ? '' : delta > 0 ? '+' : '−'
  return (
    <section className={styles.tile}>
      <h3 className={styles.label}>{label}</h3>
      {loading ? (
        <Pulse className={styles.skeleton}>
          <Block width="55%" height={33} />
          <Block width="75%" height={14} />
          {bodyHeight !== undefined && <Block height={bodyHeight} />}
        </Pulse>
      ) : (
        <>
          <p className={styles.value}>{value}</p>
          {delta !== null && (
            <p className={styles.delta}>
              <span className={delta < 0 ? styles.down : styles.up}>
                <IconTrend size={14} down={delta < 0} />
              </span>
              {sign}
              {formatPercent(delta)}
              {versus && <span className={styles.versus}>{versus}</span>}
            </p>
          )}
          {children && <div className={styles.body}>{children}</div>}
        </>
      )}
    </section>
  )
}
