import 'lenis/dist/lenis.css'
import Lenis from 'lenis'
import { useEffect } from 'react'

/**
 * Eases mouse-wheel scrolling so scroll-driven animations glide instead of stepping.
 * Touch keeps native momentum. Skipped entirely for reduced motion.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({ lerp: 0.14, wheelMultiplier: 1.1, anchors: true })
    let frame = requestAnimationFrame(function tick(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(tick)
    })

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])
}
