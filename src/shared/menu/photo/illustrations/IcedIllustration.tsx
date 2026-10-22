import { Art } from './Art'
import { SOFT } from './fills'

/** A cold drink: a tall cup with a dome lid, a straw and ice in it. */
export function IcedIllustration() {
  return (
    <Art>
      <path d="M40 3l-5.5 9" />
      <path d="M19 20a13 8.5 0 0 1 26 0" />
      <path d="M15 20h34" />
      <path d="M19.5 31h25l-2.6 25.8a2 2 0 0 1-2 1.8H24.1a2 2 0 0 1-2-1.8z" {...SOFT} stroke="none" />
      <path d="M18 20l4.1 36.8a2 2 0 0 0 2 1.8h15.8a2 2 0 0 0 2-1.8L46 20" />
      <rect x="23" y="35" width="8" height="8" rx="1.5" transform="rotate(-12 27 39)" />
      <rect x="33" y="41" width="8" height="8" rx="1.5" transform="rotate(10 37 45)" />
    </Art>
  )
}
