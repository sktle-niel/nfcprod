import type { ReactNode } from 'react'
import styles from './Skeleton.module.css'

type BlockProps = {
  width?: string | number
  height?: string | number
  shape?: 'round' | 'pill'
}

/** A gray stand-in for one piece of content, sized like the real thing so nothing jumps when it arrives. */
export function Block({ width = '100%', height = 14, shape }: BlockProps) {
  const className = shape ? `${styles.block} ${styles[shape]}` : styles.block
  return <span className={className} style={{ width, height }} />
}

type PulseProps = {
  children: ReactNode
  className?: string | undefined
}

/**
 * Wraps the blocks of one region and breathes them together, which costs one animated layer instead of many.
 * Hidden from screen readers: the layout announces "Loading" once for the whole page.
 */
export function Pulse({ children, className }: PulseProps) {
  return (
    <div className={className ? `${styles.pulse} ${className}` : styles.pulse} aria-hidden="true">
      {children}
    </div>
  )
}
