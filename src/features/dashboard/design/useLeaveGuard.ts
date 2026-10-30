import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Holds back a move to another page while `when` is true, and asks the browser to confirm a reload or a closed tab.
 * The caller shows the question while the returned blocker is `blocked`, and answers it with `proceed` or `reset`.
 */
export function useLeaveGuard(when: boolean) {
  const blocker = useBlocker(when)
  useEffect(() => {
    if (!when) return
    // The browser shows its own words for this prompt; the handler only has to ask for it.
    const ask = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', ask)
    return () => window.removeEventListener('beforeunload', ask)
  }, [when])
  return blocker
}
