import { Line } from './Line'
import styles from './DiningDecor.module.css'

// The needles of the herb sprig, in pairs along a straight stem (drawn turned by its piece).
const NEEDLES = Array.from({ length: 9 }, (_, i) => {
  const x = 10 + i * 8
  const n = 9 - i * 0.5
  return `M${x} 0l${n * 0.6} ${-n}M${x + 3} 0l${n * 0.6} ${n}`
}).join('')

/** A sprig of rosemary. */
function Herb({ className }: { className: string | undefined }) {
  return (
    <Line viewBox="0 0 100 100" className={className}>
      <g transform="translate(6 10) rotate(38)">
        <path d={`M0 0h92${NEEDLES}`} />
      </g>
    </Line>
  )
}

/** A fork and a knife, crossed. */
function Cutlery() {
  return (
    <Line viewBox="0 0 110 110" className={styles.cutlery}>
      <path transform="rotate(-40 55 55)" d="M49 6v20M55 6v20M61 6v20M49 26a6 6 0 0 0 12 0M55 32v72" />
      <path transform="rotate(40 55 55)" d="M55 4c6 7 7 28 1 38h-1zM55 42v62" />
    </Line>
  )
}

/** The rim of a plate seen from above, coming in from a corner. */
function Plate() {
  return (
    <Line viewBox="0 0 40 40" className={styles.plate}>
      <circle cx="0" cy="46" r="36" />
      <circle cx="0" cy="46" r="27" />
    </Line>
  )
}

/** The dining set: a herb sprig and cutlery at the top corners, a plate rim and another sprig at the foot. */
export function DiningDecor() {
  return (
    <>
      <Herb className={styles.herbTop} />
      <Cutlery />
      <Plate />
      <Herb className={styles.herbFoot} />
    </>
  )
}
