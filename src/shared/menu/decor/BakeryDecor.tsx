import { Line } from './Line'
import styles from './BakeryDecor.module.css'

// The kernels of a wheat ear, in pairs up the stalk, and the awns from the top ones.
const KERNELS = [64, 54, 44, 34].map((y) => `M30 ${y}c-6-1-9-6-8-12 5 1 8 6 8 12zM30 ${y}c6-1 9-6 8-12-5 1-8 6-8 12z`).join('')

/** A stalk of wheat. */
function Wheat({ className }: { className: string | undefined }) {
  return (
    <Line viewBox="0 0 60 120" className={className}>
      <path d={`M30 118V24c-4-4-4-10 0-14 4 4 4 10 0 14${KERNELS}M22 22l-6-12M38 22l6-12`} />
    </Line>
  )
}

/** A balloon whisk, tilted. */
function Whisk() {
  return (
    <Line viewBox="0 0 70 110" className={styles.whisk}>
      <g transform="rotate(22 35 55)">
        <rect x="31" y="4" width="8" height="32" rx="4" />
        <path d="M33 36C16 58 20 98 35 104c15-6 19-46 2-68M34.5 36C28 60 29 96 35 104c6-8 7-44.5.5-68M35 36v68" />
      </g>
    </Line>
  )
}

/** A croissant. */
function Croissant() {
  return (
    <Line viewBox="0 0 64 44" className={styles.croissant}>
      <path d="M5 38C8 24 20 15 32 15s24 9 27 23c-6 1-11-1-14-4-4 3-8 4-13 4s-9-1-13-4c-3 3-8 5-14 4zM21 19c2 5 3 10 3 16M32 15v22M43 19c-2 5-3 10-3 16" />
    </Line>
  )
}

/** The bakery set: crossed wheat at the top left, a whisk at the top right, a croissant and wheat at the foot. */
export function BakeryDecor() {
  return (
    <>
      <Wheat className={styles.wheatA} />
      <Wheat className={styles.wheatB} />
      <Whisk />
      <Croissant />
      <Wheat className={styles.wheatFoot} />
    </>
  )
}
