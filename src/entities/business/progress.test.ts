import { describe, expect, it } from 'vitest'
import type { Access } from '@/entities/account/subscription'
import type { Menu, Product } from '@/entities/menu/menu'
import { DEFAULT_THEME } from '@/entities/theme/theme'
import type { Business } from './business'
import { setupProgress, setupSteps } from './progress'

const fresh: Business = {
  id: 'b1',
  slug: 'cafe-luna',
  name: 'Cafe Luna',
  tagline: '',
  types: ['coffee'],
  logo: null,
  phone: '',
  address: '',
  hours: '',
  social: { facebook: '', instagram: '', tiktok: '', website: '' },
  theme: DEFAULT_THEME,
  published: false,
}

const latte: Product = {
  id: 'p1',
  categoryId: 'c1',
  name: 'Latte',
  description: '',
  price: 15000,
  variants: [],
  tags: [],
  available: true,
  image: null,
  groupIds: [],
}

const empty: Menu = { categories: [{ id: 'c1', name: 'Hot', visible: true }], products: [], groups: [] }
const trial: Access = { kind: 'trial', daysLeft: 7, endsAt: 0 }

const done = (business: Business, menu: Menu = empty, access: Access = trial) =>
  setupSteps({ business, menu, access }).flatMap((step) => (step.done ? [step.id] : []))

describe('setupSteps', () => {
  it('lists the five steps in order, none done for a new business', () => {
    expect(setupSteps({ business: fresh, menu: empty, access: trial })).toEqual([
      { id: 'items', done: false },
      { id: 'details', done: false },
      { id: 'logo', done: false },
      { id: 'publish', done: false },
      { id: 'plan', done: false },
    ])
  })

  it('counts the items step once there is a product', () => {
    expect(done(fresh, { ...empty, products: [latte] })).toEqual(['items'])
  })

  it('counts the details step for a phone, an address or opening hours', () => {
    expect(done({ ...fresh, phone: '0917 123 4567' })).toEqual(['details'])
    expect(done({ ...fresh, address: 'Lahug, Cebu City' })).toEqual(['details'])
    expect(done({ ...fresh, hours: 'Mon to Sat\n8am to 9pm' })).toEqual(['details'])
    expect(done({ ...fresh, phone: '   ', address: '\n' })).toEqual([])
  })

  it('counts the logo, publish and plan steps', () => {
    expect(done({ ...fresh, logo: 'https://cdn.example.com/logo.png' })).toEqual(['logo'])
    expect(done({ ...fresh, logo: '' })).toEqual([])
    expect(done({ ...fresh, published: true })).toEqual(['publish'])
    expect(done(fresh, empty, { kind: 'active', plan: 'year', renewsAt: 0 })).toEqual(['plan'])
  })

  it('does not count a trial or an ended plan as a plan', () => {
    for (const access of [trial, { kind: 'trialEnded' }, { kind: 'lapsed', plan: 'month' }] satisfies Access[]) {
      expect(done(fresh, empty, access)).toEqual([])
    }
  })
})

describe('setupProgress', () => {
  it('counts the steps that are done', () => {
    const steps = setupSteps({ business: { ...fresh, published: true, logo: 'https://cdn.example.com/logo.png' }, menu: empty, access: trial })
    expect(setupProgress(steps)).toEqual({ done: 2, total: 5 })
    expect(setupProgress([])).toEqual({ done: 0, total: 0 })
  })
})
