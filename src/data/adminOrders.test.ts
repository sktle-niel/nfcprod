import { describe, expect, it } from 'vitest'
import { isInPhilippines, roundPin } from '@/entities/location/pin'
import { MAX_QUANTITY, PLATFORMS } from '@/entities/order/order'
import { normalizePhone } from '@/entities/order/validate'
import { createMockAdminOrders } from './adminOrders'
import { SAMPLE_AS_OF, sampleOrders } from './adminOrders.sample'

describe('sample orders', () => {
  it('have unique references and run newest first', () => {
    const references = sampleOrders.map((order) => order.reference)
    expect(new Set(references).size).toBe(references.length)
    const times = sampleOrders.map((order) => Date.parse(order.createdAt))
    expect(times.every((time, index) => index === 0 || time < (times[index - 1] ?? Infinity))).toBe(true)
  })

  it('are all older than the demo day', () => {
    expect(sampleOrders.every((order) => Date.parse(order.createdAt) <= Date.parse(SAMPLE_AS_OF))).toBe(true)
  })

  it('show both kinds of order, with a pin and without one', () => {
    expect(sampleOrders.some((order) => order.pin)).toBe(true)
    expect(sampleOrders.some((order) => !order.pin)).toBe(true)
  })

  it('keep every pin inside the Philippines, at the five decimals a real order carries', () => {
    const pins = sampleOrders.flatMap((order) => (order.pin ? [order.pin] : []))
    expect(pins.length).toBeGreaterThan(0)
    for (const pin of pins) {
      expect(isInPhilippines(pin)).toBe(true)
      expect(roundPin(pin)).toEqual(pin)
    }
  })

  it.each(sampleOrders.map((order) => [order.reference, order] as const))('%s follows the order rules', (_, order) => {
    const platforms = order.items.map((item) => item.platform)
    expect(platforms.length).toBeGreaterThan(0)
    expect(platforms.every((platform) => PLATFORMS.includes(platform))).toBe(true)
    expect(new Set(platforms).size).toBe(platforms.length)
    expect(order.items.every((item) => Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= MAX_QUANTITY)).toBe(true)
    expect(normalizePhone(order.phone)).toBe(order.phone)
    expect(Number.isInteger(order.total)).toBe(true)
  })
})

describe('createMockAdminOrders', () => {
  it('lists the orders and says they are demo data', async () => {
    const repository = createMockAdminOrders()
    expect(await repository.list()).toEqual({ records: sampleOrders, demo: true, asOf: SAMPLE_AS_OF })
  })

  it('changes a status and remembers it', async () => {
    const [first] = sampleOrders
    if (!first) throw new Error('no sample orders')
    const repository = createMockAdminOrders()

    const updated = await repository.setStatus(first.reference, 'delivered')
    expect(updated).toEqual({ ...first, status: 'delivered' })
    const { records } = await repository.list()
    expect(records.find((order) => order.reference === first.reference)?.status).toBe('delivered')
  })

  it('does not touch the sample orders or other repositories', async () => {
    const [first] = sampleOrders
    if (!first) throw new Error('no sample orders')
    await createMockAdminOrders().setStatus(first.reference, 'cancelled')
    expect((await createMockAdminOrders().list()).records[0]).toEqual(first)
  })

  it('refuses an unknown reference', async () => {
    await expect(createMockAdminOrders().setStatus('NFC-NOPE00', 'confirmed')).rejects.toThrow()
  })
})
