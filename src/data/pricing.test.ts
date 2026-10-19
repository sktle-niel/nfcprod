import { describe, expect, it } from 'vitest'
import { createMockPricing, DEFAULT_PRICES, PricingError } from './pricing'

describe('createMockPricing', () => {
  it('starts with the default prices and keeps a change', async () => {
    const repository = createMockPricing()
    expect(await repository.get()).toEqual(DEFAULT_PRICES)
    const next = { card: 29900, month: 49900, year: 449900 }
    expect(await repository.save(next)).toEqual(next)
    expect(await repository.get()).toEqual(next)
  })

  it('refuses prices the server would refuse', async () => {
    const repository = createMockPricing()
    await expect(repository.save({ card: 0, month: 47900, year: 399900 })).rejects.toBeInstanceOf(PricingError)
    expect(await repository.get()).toEqual(DEFAULT_PRICES)
  })
})
