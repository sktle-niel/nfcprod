import type { ReactNode } from 'react'

type Props = {
  /** The drawing's own coordinates; the set's stylesheet gives the width and the place, the height follows. */
  viewBox: string
  className: string | undefined
  children: ReactNode
}

/**
 * One piece of line art of a decoration set: an outline in `currentColor` with round ends. Its strokes keep their width in
 * screen pixels whatever size the piece is drawn at (`Decor.module.css`), so a small and a large piece look like one hand.
 */
export function Line({ viewBox, className, children }: Props) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

/** A four-point star centered on (x, y), `r` from the center to a point. Shared by the sets that sparkle. */
export function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const k = r * 0.22
  return (
    <path
      d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}z`}
    />
  )
}

/** A coffee bean centered on (x, y), turned by `a` degrees: an oval with its crease. */
export function Bean({ x, y, a }: { x: number; y: number; a: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <ellipse rx="8" ry="11" />
      <path d="M0 -10c-4 5 4 8 0 20" />
    </g>
  )
}
