import { describe, expect, it } from 'vitest'
import { createMockPricing, DEFAULT_PRICING, PricingError } from './pricing'

describe('createMockPricing', () => {
  it('starts with the default offers and keeps a change', async () => {
    const repository = createMockPricing()
    expect(await repository.get()).toEqual(DEFAULT_PRICING)
    const next = { ...DEFAULT_PRICING, card: { price: 29900, discount: 10, perks: ['Fast delivery'] } }
    expect(await repository.save(next)).toEqual(next)
    expect(await repository.get()).toEqual(next)
  })

  it('refuses offers the server would refuse', async () => {
    const repository = createMockPricing()
    await expect(repository.save({ ...DEFAULT_PRICING, card: { price: 0, discount: 0, perks: [] } })).rejects.toBeInstanceOf(PricingError)
    expect(await repository.get()).toEqual(DEFAULT_PRICING)
  })

  it('hands out copies, so a caller cannot change what is stored', async () => {
    const repository = createMockPricing()
    const first = await repository.get()
    first.card.perks.push('Sneaky')
    expect((await repository.get()).card.perks).toEqual(DEFAULT_PRICING.card.perks)
  })
})
