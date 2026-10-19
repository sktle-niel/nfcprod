import { describe, expect, it } from 'vitest'
import { createMockAuth } from './auth'
import { BillingError, createMockBilling, isCheckoutUrl } from './billing'

const NOW = Date.parse('2026-10-19T02:00:00Z')

async function signedIn() {
  const accounts = createMockAuth({ delay: 0 })
  await accounts.signUp({ name: 'Ana Cruz', email: 'ana@example.com', password: 'long enough' })
  return { accounts, billing: createMockBilling(accounts, { delay: 0, now: () => NOW }) }
}

describe('createMockBilling', () => {
  it('starts a new owner on the trial', async () => {
    const { billing } = await signedIn()
    expect(await billing.current()).toEqual({
      trialEndsAt: '2026-10-26T02:00:00.000Z',
      plan: null,
      paidUntil: null,
      freeCards: { count: 2, sent: false },
    })
  })

  it('turns the plan on at checkout (demo) and keeps it', async () => {
    const { billing } = await signedIn()
    const checkout = await billing.startCheckout('year')
    expect(checkout).toMatchObject({ kind: 'done', subscription: { plan: 'year', paidUntil: '2027-10-19T02:00:00.000Z' } })
    expect((await billing.current()).plan).toBe('year')
  })

  it('refuses when nobody is signed in', async () => {
    const billing = createMockBilling(createMockAuth({ delay: 0 }), { delay: 0 })
    await expect(billing.current()).rejects.toBeInstanceOf(BillingError)
  })
})

describe('isCheckoutUrl', () => {
  it('lets the browser go only to the payment provider over https', () => {
    expect(isCheckoutUrl('https://checkout.paymongo.com/cs_123')).toBe(true)
    expect(isCheckoutUrl('http://checkout.paymongo.com/cs_123')).toBe(false)
    expect(isCheckoutUrl('https://checkout.paymongo.com.evil.example/x')).toBe(false)
    expect(isCheckoutUrl('https://user:pw@checkout.paymongo.com/x')).toBe(false)
    expect(isCheckoutUrl('javascript:alert(1)')).toBe(false)
    expect(isCheckoutUrl('/dashboard')).toBe(false)
  })
})
