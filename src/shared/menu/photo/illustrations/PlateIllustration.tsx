import { Art } from './Art'
import { DEEP, SOFT } from './fills'

/** A plated dish seen from above, between a fork and a knife. */
export function PlateIllustration() {
  return (
    <Art>
      <circle cx="32" cy="32" r="18" />
      <circle cx="32" cy="32" r="12" {...SOFT} />
      <path d="M27 36c0-6 5-10 10-10 0 6-4 10-10 10zM27 36l5-5" {...DEEP} />
      <path d="M5 14v8M8 14v8M11 14v8M5 22a3 3 0 0 0 6 0M8 25v26" />
      <path d="M58 13c-3.5 4-3.5 11 0 14zM58 27v24" />
    </Art>
  )
}
