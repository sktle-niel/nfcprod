import { useCallback, useState } from 'react'
import { flushSync } from 'react-dom'

export type Theme = 'light' | 'dark'
type Origin = { x: number; y: number }

const STORAGE_KEY = 'theme'

function currentTheme(): Theme {
  return document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset['theme'] = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage can be blocked (private mode). The theme still applies for this visit.
  }
}

/**
 * Light/dark theme. When the browser supports view transitions the new theme grows out of
 * `origin` (the toggle) as a circle; otherwise, or with reduced motion, it switches instantly.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  const toggle = useCallback((origin?: Origin) => {
    const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
    const commit = () => {
      applyTheme(next)
      flushSync(() => setTheme(next))
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!origin || reduceMotion || typeof document.startViewTransition !== 'function') {
      commit()
      return
    }

    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    )
    const transition = document.startViewTransition(commit)
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          {
            duration: 650,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => {})
  }, [])

  return { theme, toggle }
}
