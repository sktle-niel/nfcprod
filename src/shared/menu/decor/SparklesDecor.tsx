import { Line, Star } from './Line'
import styles from './SparklesDecor.module.css'

/** A big star with two small ones and a few dots. */
function Burst({ className }: { className: string | undefined }) {
  return (
    <Line viewBox="0 0 80 60" className={className}>
      <g fill="currentColor" fillOpacity="0.25">
        <Star x={26} y={30} r={20} />
      </g>
      <Star x={60} y={14} r={8} />
      <Star x={64} y={46} r={5} />
      <circle cx="46" cy="54" r="1.6" />
      <circle cx="6" cy="6" r="1.6" />
    </Line>
  )
}

/** A middle star, a small one and two dots. */
function Twinkle({ className }: { className: string | undefined }) {
  return (
    <Line viewBox="0 0 60 60" className={className}>
      <g fill="currentColor" fillOpacity="0.25">
        <Star x={34} y={30} r={14} />
      </g>
      <Star x={12} y={12} r={6} />
      <circle cx="12" cy="48" r="1.6" />
      <circle cx="54" cy="8" r="1.6" />
    </Line>
  )
}

/** The sparkles set: a cluster of stars in each corner, the larger ones at the top. */
export function SparklesDecor() {
  return (
    <>
      <Burst className={styles.topLeft} />
      <Twinkle className={styles.topRight} />
      <Twinkle className={styles.footLeft} />
      <Burst className={styles.footRight} />
    </>
  )
}
