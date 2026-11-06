import { Fragment } from 'react'
import { BAND } from './art'
import styles from './Band.module.css'

/** The two shapes, then the same two mirrored, and on: wider than the 720 px a menu can be, at the size the strip is drawn. */
const ORDER = [
  [0, false],
  [1, false],
  [0, true],
  [1, true],
  [0, false],
  [1, false],
] as const

/** Each piece of the strip with where it starts. */
const PIECES = ORDER.map(([shape, mirror], index) => ({ piece: BAND.pieces[shape], mirror, left: index * BAND.pieces[shape].w }))
const WIDE = ORDER.length * BAND.pieces[0].w
const TALL = BAND.h + 4
/** How large the strip is drawn: small, so it stays a trim of the band and costs the page little height. */
const SCALE = 0.6

/** The lower edge of the band for a coffee, milk tea or bakery shop: the chocolate running down the sheet. `pours` runs its entrance. */
export function DripEdge({ pours }: { pours: boolean }) {
  return (
    <svg
      className={styles.edge}
      data-pours={pours ? '' : undefined}
      width="100%"
      height={Math.round(TALL * SCALE)}
      viewBox={`0 -4 ${WIDE} ${TALL}`}
      preserveAspectRatio="xMinYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      {PIECES.map(({ piece, mirror, left }) => (
        <Fragment key={left}>
          {/* Two pieces meet at their flat height: this bridge keeps the join from showing as a hairline in the brown. */}
          <rect x={left - 0.5} y={-4} width={1} height={BAND.join + 4} />
          <g transform={mirror ? `translate(${left + piece.w} 0) scale(-1 1)` : `translate(${left} 0)`}>
            <path d={piece.edge} />
          </g>
        </Fragment>
      ))}
    </svg>
  )
}
