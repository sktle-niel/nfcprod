import { Line } from './Line'
import styles from './LeavesDecor.module.css'

/** One leaf, its stalk at (x, y), pointing `a` degrees from the right, `s` times the base size, with its middle vein. */
function Leaf({ x, y, a, s = 1 }: { x: number; y: number; a: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} d="M0 0c5-6 15-7 22 0-7 7-17 6-22 0zM3 0h15" />
}

// The leaves along the branch: where each grows from the stem and which way it points.
const BRANCH: readonly [number, number, number][] = [
  [14, 7, -30], [30, 10, 70], [46, 14, -20], [62, 20, 85], [77, 27, -8], [91, 35, 100], [103, 44, 35],
]

/** A branch reaching in along the top edge from a corner, leaves on both sides. */
function Branch({ className }: { className: string | undefined }) {
  return (
    <Line viewBox="0 0 128 70" className={className}>
      <path d="M-2 4C34 9 70 20 103 44" />
      {BRANCH.map(([x, y, a]) => (
        <Leaf key={`${x}-${y}`} x={x} y={y} a={a} />
      ))}
    </Line>
  )
}

/** A small upright sprig: a stem with pairs of small leaves. */
function Sprig({ className }: { className: string | undefined }) {
  return (
    <Line viewBox="0 0 60 100" className={className}>
      <path d="M30 100C30 74 31 44 37 10" />
      {[84, 68, 52, 36].map((y, i) => (
        <g key={y}>
          <Leaf x={30 + i * 1.5} y={y} a={-150} s={0.75 - i * 0.08} />
          <Leaf x={30 + i * 1.5} y={y} a={-35} s={0.75 - i * 0.08} />
        </g>
      ))}
      <Leaf x={37} y={10} a={-80} s={0.5} />
    </Line>
  )
}

/** The leaves set: two branches frame the header from the top corners, small sprigs grow up at the foot. */
export function LeavesDecor() {
  return (
    <>
      <Branch className={styles.topLeft} />
      <Branch className={styles.topRight} />
      <Sprig className={styles.footRight} />
      <Sprig className={styles.footRightSmall} />
      <Sprig className={styles.footLeft} />
    </>
  )
}
