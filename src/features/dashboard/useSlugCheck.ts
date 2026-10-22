import { useEffect, useState } from 'react'
import type { SlugStatus } from '@/entities/business/business'
import { slugProblem } from '@/entities/business/slug'

/** How long the owner must stop typing before the link is checked. */
export const SLUG_DEBOUNCE_MS = 300

export type SlugCheck = 'idle' | 'checking' | 'failed' | SlugStatus

type Options = {
  /** Asking again for the same link, after a failure: a new number makes a new check. */
  attempt?: number
  /** False while the field is not on screen: nothing is asked. */
  active?: boolean
}

/**
 * Where a typed link stands. What can be told without asking (empty, the current link, a badly formed or reserved
 * word) is told at once; the rest waits for the owner to stop typing, then asks `check`. An answer that arrives for a
 * link that is no longer typed is dropped. The setup wizard and the Share page both use it.
 */
export function useSlugCheck(
  slug: string,
  current: string,
  check: (slug: string) => Promise<SlugStatus>,
  { attempt = 0, active = true }: Options = {},
): SlugCheck {
  const instant: SlugCheck | null = slug === '' ? 'idle' : slug === current ? 'yours' : slugProblem(slug)
  const [answer, setAnswer] = useState<{ slug: string; attempt: number; status: SlugStatus | 'failed' } | null>(null)

  useEffect(() => {
    if (instant !== null || !active) return
    let wanted = true
    const timer = setTimeout(() => {
      const settle = (status: SlugStatus | 'failed') => {
        if (wanted) setAnswer({ slug, attempt, status })
      }
      check(slug).then(settle, () => settle('failed'))
    }, SLUG_DEBOUNCE_MS)
    return () => {
      wanted = false
      clearTimeout(timer)
    }
  }, [slug, instant, active, check, attempt])

  if (instant !== null) return instant
  return answer?.slug === slug && answer.attempt === attempt ? answer.status : 'checking'
}
