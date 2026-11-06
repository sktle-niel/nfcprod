import { useCallback } from 'react'
import { calmMotion } from './calmMotion'
import './motion.module.css'

const ATTRIBUTE = 'data-reveal'
/** How near the screen a section is when its entrance starts, so a price is never read while it is still faint. */
const NEAR_SCREEN = '0px 0px 64px 0px'
/** An observer answers once right after it starts. One that stays silent this long is broken: the section shows without it. */
const SILENT_LIMIT_MS = 1000

/** Ends the wait of `element`, if it is waiting, with no entrance: for a link that jumps to it, which needs its true position. */
export function settleReveal(element: Element): void {
  if (element.getAttribute(ATTRIBUTE) === 'waiting') element.removeAttribute(ATTRIBUTE)
}

/**
 * Puts one element on hold until it nears the screen. Every step that can fail comes before the hold, so a failure leaves the element
 * visible, and the function it returns always lifts the hold. Returns nothing when the element does not wait.
 */
function holdUntilNear(element: HTMLElement): (() => void) | undefined {
  if (typeof IntersectionObserver === 'undefined' || calmMotion()) return undefined
  // On screen, or above it on a page restored further down: no wait. A box that is not laid out measures 0, so it stays too.
  if (element.getBoundingClientRect().top < window.innerHeight) return undefined

  let observer: IntersectionObserver | undefined
  let silent: number | undefined
  const stopWatching = () => {
    window.clearTimeout(silent)
    observer?.disconnect()
  }
  const arrive = () => {
    stopWatching()
    if (element.getAttribute(ATTRIBUTE) === 'waiting') element.setAttribute(ATTRIBUTE, 'arriving')
  }
  try {
    observer = new IntersectionObserver(
      (entries) => {
        window.clearTimeout(silent)
        if (entries.some((entry) => entry.isIntersecting)) arrive()
      },
      { rootMargin: NEAR_SCREEN },
    )
    observer.observe(element)
  } catch {
    observer?.disconnect()
    return undefined
  }
  silent = window.setTimeout(arrive, SILENT_LIMIT_MS)
  element.setAttribute(ATTRIBUTE, 'waiting')
  return () => {
    stopWatching()
    element.removeAttribute(ATTRIBUTE)
  }
}

/**
 * One calm entrance for a section as it nears the screen, once. Returns a ref to put on one element or on many:
 *
 *   const reveal = useReveal(interactive)
 *   sections.map((section) => <section key={section.id} ref={reveal}>...</section>)
 *
 * The default is fully visible. Only an element JavaScript has measured below the fold goes on hold, and only after its observer is
 * running: a browser with no observer, or one that fails or stays silent, keeps the content showing. Nothing is held with `interactive`
 * false (Design preview, gallery thumbnails) or under prefers-reduced-motion, and elements on screen at load do not wait.
 *
 * Put it on whole sections, not on a sticky bar. Scroll to them with the kit's `scrollToSection`, which knows about the hold.
 * The look is in motion.module.css, which this file loads: a template adds no class.
 */
export function useReveal(interactive: boolean): (element: HTMLElement | null) => (() => void) | undefined {
  return useCallback((element: HTMLElement | null) => (element !== null && interactive ? holdUntilNear(element) : undefined), [interactive])
}
