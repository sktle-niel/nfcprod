import { Art } from './Art'
import { DEEP, SOFT } from './fills'

/** Milk tea: a sealed cup with a wide straw and pearls at the bottom. */
export function BobaIllustration() {
  return (
    <Art>
      <path d="M30 18l3.4-15h5l-3.4 15" />
      <path d="M18.8 27h26.4l-3.3 29.8a2 2 0 0 1-2 1.8H24.1a2 2 0 0 1-2-1.8z" {...SOFT} stroke="none" />
      <path d="M15 18h34M17.4 23h29.2" />
      <path d="M18 18l4.1 38.8a2 2 0 0 0 2 1.8h15.8a2 2 0 0 0 2-1.8L46 18" />
      <g {...DEEP}>
        <circle cx="27" cy="53" r="2.2" />
        <circle cx="32.5" cy="54" r="2.2" />
        <circle cx="38" cy="53" r="2.2" />
        <circle cx="29.5" cy="48" r="2.2" />
        <circle cx="35.5" cy="48" r="2.2" />
      </g>
    </Art>
  )
}
