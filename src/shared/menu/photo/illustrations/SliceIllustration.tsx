import { Art } from './Art'
import { DEEP, SOFT } from './fills'

/** A slice of cake with a layer of filling and a berry on top. */
export function SliceIllustration() {
  return (
    <Art>
      <path d="M6 33l52-3v17L6 50z" {...SOFT} />
      <path d="M8.5 41.4l47-2.8" strokeWidth="3.5" strokeOpacity="0.5" />
      <path d="M6 33l38-12 14 9" />
      <circle cx="40" cy="20" r="4" {...DEEP} />
      <path d="M40 16l2-4" />
    </Art>
  )
}
