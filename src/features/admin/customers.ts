import type { OrderRecord } from '@/entities/order/order'
import { counted } from './stats'

export type Customer = {
  /** +639XXXXXXXXX. One customer per number. */
  phone: string
  name: string
  city: string
  province: string
  orders: number
  /** Integer centavos. */
  spent: number
  /** ISO time of the newest order. */
  last: string
}

/** One entry per mobile number, built from the orders that count. The newest order names the person and the place. */
export function customersOf(records: readonly OrderRecord[]): Customer[] {
  const byPhone = new Map<string, Customer>()
  for (const order of counted(records)) {
    const known = byPhone.get(order.phone)
    if (!known) {
      byPhone.set(order.phone, {
        phone: order.phone,
        name: order.fullName,
        city: order.city,
        province: order.province,
        orders: 1,
        spent: order.total,
        last: order.createdAt,
      })
      continue
    }
    known.orders += 1
    known.spent += order.total
    if (Date.parse(order.createdAt) > Date.parse(known.last)) {
      known.last = order.createdAt
      known.name = order.fullName
      known.city = order.city
      known.province = order.province
    }
  }
  return [...byPhone.values()].sort((a, b) => Date.parse(b.last) - Date.parse(a.last))
}

/** What an admin might type to find a customer: name, mobile (both ways of writing it) and place. */
export function customerText(customer: Customer): string {
  return [customer.name, customer.phone, `0${customer.phone.slice(3)}`, customer.city, customer.province].join(' ')
}
