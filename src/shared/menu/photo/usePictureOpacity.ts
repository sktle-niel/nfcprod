import { useEffect, useState } from 'react'

/** What the pixels of a picture showed: nothing yet, fully opaque, or with see-through parts. */
export type PictureOpacity = 'pending' | 'opaque' | 'clear'

// The read happens on a tiny canvas: cheap, and a transparent background survives any downscale (most of it stays see-through).
const SAMPLE = 24

/** True when any sampled pixel is even slightly see-through. */
export function hasClearPixel(pixels: Uint8ClampedArray): boolean {
  for (let at = 3; at < pixels.length; at += 4) {
    const alpha = pixels[at]
    if (alpha !== undefined && alpha < 250) return true
  }
  return false
}

type Reading = { src: string; opacity: PictureOpacity }

/**
 * Whether the picture at `src` has see-through parts, read from its pixels. 'pending' while nothing is known: still
 * loading, failed to load, or no canvas to read on (the caller then keeps the shape it asked for). A picture that loads
 * but may not be read (a canvas it taints) counts as opaque: framing an unreadable picture can only make it more readable.
 * Pass null to skip the work entirely, for shapes that fit any picture.
 */
export function usePictureOpacity(src: string | null): PictureOpacity {
  // The reading remembers whose pixels it saw, so a changed src is 'pending' again without a reset inside the effect.
  const [reading, setReading] = useState<Reading | null>(null)

  useEffect(() => {
    if (src === null) return undefined
    let gone = false
    const probe = new Image()
    // A storage picture is cross-origin: without this, a canvas it is drawn on refuses to be read (the storage's CORS
    // must allow it, ARCHITECTURE.md section 7.10). An upload travels as a data address and is always readable.
    if (!src.startsWith('data:')) probe.crossOrigin = 'anonymous'
    probe.onload = () => {
      if (gone) return
      const canvas = document.createElement('canvas')
      canvas.width = SAMPLE
      canvas.height = SAMPLE
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (context === null) return
      try {
        context.drawImage(probe, 0, 0, SAMPLE, SAMPLE)
        setReading({ src, opacity: hasClearPixel(context.getImageData(0, 0, SAMPLE, SAMPLE).data) ? 'clear' : 'opaque' })
      } catch {
        setReading({ src, opacity: 'opaque' })
      }
    }
    probe.src = src
    return () => {
      gone = true
    }
  }, [src])

  return src !== null && reading !== null && reading.src === src ? reading.opacity : 'pending'
}
