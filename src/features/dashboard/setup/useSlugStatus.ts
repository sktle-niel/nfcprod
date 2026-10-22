import { useCallback, useState } from 'react'
import type { SlugStatus } from '@/entities/business/business'
import { SLUG_DEBOUNCE_MS, useSlugCheck } from '../useSlugCheck'

/** How long the owner stops typing before the link is looked up. */
export const CHECK_DELAY_MS = SLUG_DEBOUNCE_MS

/** Where a link stands in the wizard. `checking` and `failed` only exist here: the repository never says them. */
export type SlugState = 'empty' | 'invalid' | 'reserved' | 'checking' | 'available' | 'taken' | 'failed'

/**
 * The link check as the wizard needs it: looked up while `active` (the link step is showing), with no link of its own
 * yet. `markTaken` records a refusal at creation, which is newer than the lookup, until the owner edits the link.
 */
export function useSlugStatus(slug: string, active: boolean, check: (slug: string) => Promise<SlugStatus>) {
  const [attempt, setAttempt] = useState(0)
  const [refused, setRefused] = useState<string | null>(null)
  const checked = useSlugCheck(slug, '', check, { attempt, active })

  // The wizard has no link yet, so `yours` never comes; an empty field is 'empty' here.
  const answer: SlugState = checked === 'idle' ? 'empty' : checked === 'yours' ? 'available' : checked
  const retry = useCallback(() => setAttempt((count) => count + 1), [])
  const markTaken = useCallback((taken: string) => setRefused(taken), [])

  return { state: refused === slug ? ('taken' as const) : answer, retry, markTaken }
}
