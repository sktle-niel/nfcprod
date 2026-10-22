import type { ReactNode } from 'react'

/**
 * The frame every placeholder illustration shares: a 64 x 64 drawing in `currentColor`, strokes of 2 with round ends, so the
 * nine read as one family at 48 px and at 120 px. Decoration only: hidden from assistive technology and never focusable.
 */
export function Art({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}
