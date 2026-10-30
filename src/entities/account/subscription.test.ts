import { describe, expect, it } from 'vitest'
import { accessOf, freeCardsState, isMenuLive, nextAccessChange, periodEnd, startTrial, type Subscription } from './subscription'

const DAY = 86_400_000
const START = Date.parse('2026-10-19T02:00:00Z')

describe('startTrial', () => {
  it('gives seven days and two free cards waiting for a plan', () => {
    expect(startTrial(START)).toEqual({
      trialEndsAt: '2026-10-26T02:00:00.000Z',
      plan: null,
      paidUntil: null,
      freeCards: { count: 2, sent: false },
    })
  })
})

describe('accessOf', () => {
  const trial = startTrial(START)

  it('counts the trial in started days', () => {
    expect(accessOf(trial, START)).toEqual({ kind: 'trial', daysLeft: 7, endsAt: START + 7 * DAY })
    expect(accessOf(trial, START + 6 * DAY + 1)).toMatchObject({ kind: 'trial', daysLeft: 1 })
    expect(accessOf(trial, START + 7 * DAY)).toEqual({ kind: 'trialEnded' })
  })

  it('is active while paid, then lapsed', () => {
    const paid: Subscription = { ...trial, plan: 'year', paidUntil: '2027-10-19T02:00:00.000Z' }
    expect(accessOf(paid, START)).toEqual({ kind: 'active', plan: 'year', renewsAt: Date.parse('2027-10-19T02:00:00Z') })
    expect(accessOf(paid, Date.parse('2027-10-20T00:00:00Z'))).toEqual({ kind: 'lapsed', plan: 'year' })
  })
})

describe('isMenuLive', () => {
  it('shows the menu during the trial and a paid period only', () => {
    const trial = startTrial(START)
    expect(isMenuLive(trial, START)).toBe(true)
    expect(isMenuLive(trial, START + 8 * DAY)).toBe(false)
    expect(isMenuLive({ ...trial, plan: 'month', paidUntil: '2026-11-19T02:00:00.000Z' }, START + 8 * DAY)).toBe(true)
  })
})

describe('nextAccessChange', () => {
  const trial = startTrial(START)
  const paid: Subscription = { ...trial, plan: 'month', paidUntil: '2026-11-19T02:00:00.000Z' }

  it('is the next day count drop while a trial has days to run', () => {
    expect(nextAccessChange(trial, START)).toBe(START + DAY)
  })

  it('is the end of the trial on its last day', () => {
    expect(nextAccessChange(trial, START + 6 * DAY + 1)).toBe(START + 7 * DAY)
  })

  it('is null once the trial has ended', () => {
    expect(nextAccessChange(trial, START + 7 * DAY)).toBeNull()
  })

  it('is the end of the paid period while a plan is active', () => {
    const yearly: Subscription = { ...trial, plan: 'year', paidUntil: '2027-10-19T02:00:00.000Z' }
    expect(nextAccessChange(yearly, START)).toBe(Date.parse('2027-10-19T02:00:00Z'))
  })

  it('is null once a paid period has lapsed', () => {
    expect(nextAccessChange(paid, Date.parse('2027-10-20T00:00:00Z'))).toBeNull()
  })

  it('is always later than the moment asked about, and the access changes right at it', () => {
    const samples: [Subscription, number][] = [
      [trial, START],
      [trial, START + 3 * DAY + 5_000],
      [trial, START + 6 * DAY + 1],
      [paid, START],
      [paid, START + 29 * DAY],
    ]
    for (const [subscription, now] of samples) {
      const change = nextAccessChange(subscription, now)
      if (change === null) throw new Error(`no change after ${new Date(now).toISOString()}`)
      expect(change).toBeGreaterThan(now)
      expect(accessOf(subscription, change - 1)).not.toEqual(accessOf(subscription, change))
    }
  })
})

describe('periodEnd', () => {
  it('adds a calendar month or year', () => {
    expect(new Date(periodEnd('month', START)).toISOString()).toBe('2026-11-19T02:00:00.000Z')
    expect(new Date(periodEnd('year', START)).toISOString()).toBe('2027-10-19T02:00:00.000Z')
  })
})

describe('freeCardsState', () => {
  const trial = startTrial(START)

  it('waits for a first plan during the trial', () => {
    expect(freeCardsState(trial)).toBe('waiting')
  })

  it('is due once a plan was paid for, and stays due if the plan lapses', () => {
    const paid: Subscription = { ...trial, plan: 'month', paidUntil: '2026-11-19T02:00:00.000Z' }
    expect(freeCardsState(paid)).toBe('due')
    expect(accessOf(paid, Date.parse('2027-01-01T00:00:00Z')).kind).toBe('lapsed')
    expect(freeCardsState(paid)).toBe('due')
  })

  it('is sent when the cards are on their way, whatever the plan', () => {
    expect(freeCardsState({ ...trial, freeCards: { count: 2, sent: true } })).toBe('sent')
    expect(freeCardsState({ ...trial, plan: 'year', paidUntil: '2027-10-19T02:00:00.000Z', freeCards: { count: 2, sent: true } })).toBe('sent')
  })
})
