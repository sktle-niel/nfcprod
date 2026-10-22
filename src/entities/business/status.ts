import type { Access } from '@/entities/account/subscription'
import type { Business } from './business'

/**
 * What the public menu is doing for its owner. One answer for every page, so two pages never tell the owner different things.
 * - none: no business yet (the setup wizard has not run).
 * - unknown: the plan has not loaded, so say nothing that could be wrong.
 * - live: the trial or plan runs and the owner published the menu.
 * - draft: the trial or plan runs, but the menu is not published, so nobody can see it yet.
 * - paused: the trial or plan has ended. The menu is paused, never deleted, whether or not it is published.
 */
export type MenuState = 'none' | 'unknown' | 'live' | 'draft' | 'paused'

export function menuState(business: Pick<Business, 'published'> | null, access: Access | null): MenuState {
  if (business === null) return 'none'
  if (access === null) return 'unknown'
  if (access.kind === 'trialEnded' || access.kind === 'lapsed') return 'paused'
  return business.published ? 'live' : 'draft'
}
