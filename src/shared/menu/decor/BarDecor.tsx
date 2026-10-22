import { Line, Star } from './Line'
import styles from './BarDecor.module.css'

/** A small sky of four-point stars and dots. */
function Stars() {
  return (
    <Line viewBox="0 0 64 52" className={styles.stars}>
      <g fill="currentColor" fillOpacity="0.25">
        <Star x={20} y={24} r={14} />
      </g>
      <Star x={48} y={10} r={6} />
      <circle cx="44" cy="38" r="1.5" />
      <circle cx="6" cy="46" r="1.5" />
    </Line>
  )
}

/** A coupe glass with a cherry, and a star beside it. */
function Coupe() {
  return (
    <Line viewBox="0 0 76 76" className={styles.coupe}>
      <path d="M8 22h44c0 13-10 21-22 21S8 35 8 22zM30 43v24M19 70h22M14 28h32" />
      <circle cx="45" cy="15" r="4" />
      <path d="M45 11c1-4 5-6 8-6" />
      <Star x={66} y={40} r={6} />
    </Line>
  )
}

/** A bottle with a label. */
function Bottle() {
  return (
    <Line viewBox="0 0 56 100" className={styles.bottle}>
      <path d="M23 3h10v6H23zM24 9v14c0 5-9 9-9 17v52a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4V40c0-8-9-12-9-17V9" />
      <rect x="18" y="52" width="20" height="20" rx="2" />
    </Line>
  )
}

/** A short glass with ice. */
function Rocks() {
  return (
    <Line viewBox="0 0 60 60" className={styles.rocks}>
      <path d="M8 12l4 42h28l4-42zM10 28h32" />
      <rect x="15" y="32" width="9" height="9" rx="1.5" transform="rotate(-10 19.5 36.5)" />
      <rect x="27" y="36" width="9" height="9" rx="1.5" transform="rotate(12 31.5 40.5)" />
    </Line>
  )
}

/** The bar set: stars at the top left, a coupe at the top right, a bottle and a short glass at the foot. */
export function BarDecor() {
  return (
    <>
      <Stars />
      <Coupe />
      <Bottle />
      <Rocks />
    </>
  )
}
