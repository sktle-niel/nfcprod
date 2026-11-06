import { useCallback } from 'react'
import { calmMotion } from '../kit'

const ATTRIBUTE = 'data-arriving'

/** Holds one picture that has not arrived yet, and lets it go when it has, or never will. */
function holdUntilLoaded(image: HTMLImageElement): () => void {
  const release = () => image.removeAttribute(ATTRIBUTE)
  image.setAttribute(ATTRIBUTE, '')
  image.addEventListener('load', release, { once: true })
  image.addEventListener('error', release, { once: true })
  return () => {
    image.removeEventListener('load', release)
    image.removeEventListener('error', release)
    release()
  }
}

/**
 * A ref for a picture that fades in once it has arrived, in a box that already has its shape. The default is a showing picture: only
 * script that sees one still on its way holds it, so with no script the browser just draws it. It does nothing in the Design preview,
 * under reduced motion, or for a picture that is already there.
 */
export function usePictureFade(interactive: boolean): (image: HTMLImageElement | null) => (() => void) | undefined {
  return useCallback((image: HTMLImageElement | null) => (image !== null && interactive && !image.complete && !calmMotion() ? holdUntilLoaded(image) : undefined), [interactive])
}
