import { describe, expect, it } from 'vitest'
import type { Access } from '@/entities/account/subscription'
import { menuState } from './status'

const trial: Access = { kind: 'trial', daysLeft: 7, endsAt: 1 }
const active: Access = { kind: 'active', plan: 'month', renewsAt: 1 }
const ended: Access = { kind: 'trialEnded' }
const lapsed: Access = { kind: 'lapsed', plan: 'year' }
const published = { published: true }
const draft = { published: false }

describe('menuState', () => {
  it('has no state for an owner without a business', () => {
    expect(menuState(null, trial)).toBe('none')
    expect(menuState(null, null)).toBe('none')
  })

  it('says nothing certain until the plan is known', () => {
    expect(menuState(published, null)).toBe('unknown')
    expect(menuState(draft, null)).toBe('unknown')
  })

  it('is live when the menu is published and the trial or the plan runs', () => {
    expect(menuState(published, trial)).toBe('live')
    expect(menuState(published, active)).toBe('live')
  })

  it('is a draft when the plan runs and the menu is not published', () => {
    expect(menuState(draft, trial)).toBe('draft')
    expect(menuState(draft, active)).toBe('draft')
  })

  it('is paused when the trial or the plan has ended, published or not: publishing cannot fix that', () => {
    for (const access of [ended, lapsed]) {
      expect(menuState(published, access)).toBe('paused')
      expect(menuState(draft, access)).toBe('paused')
    }
  })
})
