/** Days a new owner gets before a plan is needed. */
export const TRIAL_DAYS = 7
/** NFC cards that open the owner's menu website, sent free once a plan starts. */
export const FREE_WEBSITE_CARDS = 2

const DAY = 86_400_000

export const PLANS = ['month', 'year'] as const
export type Plan = (typeof PLANS)[number]

/** The owner's standing as the server keeps it. Times are ISO 8601. */
export type Subscription = {
  trialEndsAt: string
  /** The plan paid for, or null while on the trial. */
  plan: Plan | null
  /** End of the paid period, or null before the first payment. */
  paidUntil: string | null
  freeCards: {
    count: number
    /** True once the cards are on their way. */
    sent: boolean
  }
}

/** What the owner's standing means right now. */
export type Access =
  | { kind: 'trial'; daysLeft: number; endsAt: number }
  | { kind: 'trialEnded' }
  | { kind: 'active'; plan: Plan; renewsAt: number }
  | { kind: 'lapsed'; plan: Plan }

/** A new owner's standing: the trial starts now, and the free cards wait for a plan. */
export function startTrial(now: number): Subscription {
  return {
    trialEndsAt: new Date(now + TRIAL_DAYS * DAY).toISOString(),
    plan: null,
    paidUntil: null,
    freeCards: { count: FREE_WEBSITE_CARDS, sent: false },
  }
}

export function accessOf(subscription: Subscription, now: number): Access {
  const paidUntil = subscription.paidUntil === null ? null : Date.parse(subscription.paidUntil)
  if (subscription.plan && paidUntil !== null) {
    return paidUntil > now ? { kind: 'active', plan: subscription.plan, renewsAt: paidUntil } : { kind: 'lapsed', plan: subscription.plan }
  }
  const endsAt = Date.parse(subscription.trialEndsAt)
  // Counted in started days, so the last afternoon still says "1 day left".
  return endsAt > now ? { kind: 'trial', daysLeft: Math.ceil((endsAt - now) / DAY), endsAt } : { kind: 'trialEnded' }
}

/** The public menu shows only during the trial or a paid period. Otherwise it is paused, never deleted. */
export function isMenuLive(subscription: Subscription, now: number): boolean {
  const kind = accessOf(subscription, now).kind
  return kind === 'trial' || kind === 'active'
}

/**
 * The next moment (ms) at which what `accessOf` says changes: the day count of a trial dropping, the end of a trial, or the end
 * of a paid period. Null when nothing more will change by itself (a trial or plan that already ended).
 */
export function nextAccessChange(subscription: Subscription, now: number): number | null {
  const access = accessOf(subscription, now)
  if (access.kind === 'trial') return access.endsAt - (access.daysLeft - 1) * DAY
  if (access.kind === 'active') return access.renewsAt
  return null
}

/** Where the free cards stand: sent, due (a plan was paid for, so they are next) or waiting for a first plan. */
export type FreeCardsState = 'sent' | 'due' | 'waiting'

/** A plan that has since lapsed still counts: the first payment earned the cards. */
export function freeCardsState(subscription: Subscription): FreeCardsState {
  if (subscription.freeCards.sent) return 'sent'
  return subscription.plan === null ? 'waiting' : 'due'
}

/** The end of a period of `plan` that starts at `from`. */
export function periodEnd(plan: Plan, from: number): number {
  const end = new Date(from)
  if (plan === 'month') end.setUTCMonth(end.getUTCMonth() + 1)
  else end.setUTCFullYear(end.getUTCFullYear() + 1)
  return end.getTime()
}
