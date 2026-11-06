import styles from './TornEdge.module.css'

const WIDTH = 400
const HEIGHT = 12

/** A deckled line across the drawing, the same every time: small quick tears on a slow wander. A closed shape, for filling. */
function tornPath(seed: number): string {
  let state = seed
  const next = () => {
    state = (state * 16807) % 2147483647
    return state / 2147483647
  }
  const points = [`0 ${HEIGHT}`]
  for (let x = 0; x <= WIDTH; x += 3 + next() * 7) {
    const slow = Math.sin(x / 41 + seed) * 2.2 + Math.sin(x / 17 + seed / 2) * 1.2
    points.push(`${x.toFixed(1)} ${(4.5 + slow + (next() - 0.5) * 3.2).toFixed(1)}`)
  }
  points.push(`${WIDTH} 4.5`, `${WIDTH} ${HEIGHT}`)
  return `M${points.join('L')}Z`
}

const CORE = tornPath(7321)
const PAPER = tornPath(1913)

type Props = { place: 'top' | 'bottom'; flipped: boolean }

/** The deckled end of a pasted label: the paper over the rougher core that a tear lays bare. */
export function TornEdge({ place, flipped }: Props) {
  return (
    <svg className={styles.edge} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" data-place={place} data-flipped={flipped ? '' : undefined} aria-hidden="true" focusable="false">
      <path className={styles.core} d={CORE} />
      <path className={styles.paper} d={PAPER} transform="translate(0 2)" />
    </svg>
  )
}
