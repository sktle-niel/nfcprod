import { useEffect, useState } from 'react'

/** The size of a picture in its own pixels. */
export type PictureSize = { width: number; height: number }

type Reading = { src: string; size: PictureSize }

/**
 * The size of the picture at `src`, or null while nothing is known: still loading, failed to load, or no picture (null). The
 * picture is only loaded, never drawn on a canvas, so a storage picture needs no CORS for this. Pass null to skip the work.
 */
export function usePictureSize(src: string | null): PictureSize | null {
  // The reading remembers whose size it saw, so a changed src is unknown again without a reset inside the effect.
  const [reading, setReading] = useState<Reading | null>(null)

  useEffect(() => {
    if (src === null) return undefined
    let gone = false
    const probe = new Image()
    probe.onload = () => {
      if (!gone) setReading({ src, size: { width: probe.naturalWidth, height: probe.naturalHeight } })
    }
    probe.src = src
    return () => {
      gone = true
    }
  }, [src])

  return src !== null && reading !== null && reading.src === src ? reading.size : null
}
