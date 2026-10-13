import { describe, expect, it } from 'vitest'
import { makeOrder } from '@/test/orders'
import { customersOf, customerText } from './customers'

describe('customersOf', () => {
  it('makes one customer per mobile number and adds up their orders', () => {
    const customers = customersOf([
      makeOrder({ phone: '+639171111111', fullName: 'Ana Cruz', total: 58000, createdAt: '2026-10-01T00:00:00Z' }),
      makeOrder({ phone: '+639171111111', fullName: 'Ana Cruz', total: 78000, createdAt: '2026-10-05T00:00:00Z' }),
      makeOrder({ phone: '+639172222222', fullName: 'Ben Reyes', total: 139900, createdAt: '2026-10-03T00:00:00Z' }),
    ])
    expect(customers.map((customer) => customer.name)).toEqual(['Ana Cruz', 'Ben Reyes'])
    expect(customers[0]).toMatchObject({ orders: 2, spent: 136000, last: '2026-10-05T00:00:00Z' })
    expect(customers[1]).toMatchObject({ orders: 1, spent: 139900 })
  })

  it('takes the name and the place from the newest order', () => {
    const [customer] = customersOf([
      makeOrder({ phone: '+639171111111', fullName: 'Ana Cruz', city: 'Cebu City', createdAt: '2026-10-01T00:00:00Z' }),
      makeOrder({ phone: '+639171111111', fullName: 'Ana Reyes', city: 'Davao City', createdAt: '2026-10-05T00:00:00Z' }),
    ])
    expect(customer).toMatchObject({ name: 'Ana Reyes', city: 'Davao City' })
  })

  it('leaves out people whose orders were all cancelled', () => {
    expect(customersOf([makeOrder({ status: 'cancelled' })])).toEqual([])
  })
})

describe('customerText', () => {
  it('contains the mobile number both ways', () => {
    const [customer] = customersOf([makeOrder({ phone: '+639171234567' })])
    const text = customerText(customer!)
    expect(text).toContain('+639171234567')
    expect(text).toContain('09171234567')
  })
})
