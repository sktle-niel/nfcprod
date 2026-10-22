import { PLATFORMS, countCards } from '@/entities/order/order'
import type { OrderRecord, Platform } from '@/entities/order/order'
import type { Count } from '@/shared/ui/chart'

export const DAY = 86_400_000

// The Philippines is UTC+8 all year, so "a day" for the business starts at 16:00 UTC.
const PH_OFFSET = 8 * 3_600_000

/** The moment (in ms) that the Philippine day containing `ms` starts. */
export function dayStart(ms: number): number {
  return Math.floor((ms + PH_OFFSET) / DAY) * DAY - PH_OFFSET
}

export type Span = { from: number; to: number }

/** The last `days` days, ending with the day of `asOf`. `to` is the end of that day. */
export function lastDays(asOf: number, days: number): Span {
  const to = dayStart(asOf) + DAY
  return { from: to - days * DAY, to }
}

/** The same number of days right before `span`. */
export function before(span: Span): Span {
  return { from: span.from - (span.to - span.from), to: span.from }
}

export function within(records: readonly OrderRecord[], span: Span): OrderRecord[] {
  return records.filter((order) => {
    const time = Date.parse(order.createdAt)
    return time >= span.from && time < span.to
  })
}

/** Cancelled orders never count towards the numbers. */
export function counted(records: readonly OrderRecord[]): OrderRecord[] {
  return records.filter((order) => order.status !== 'cancelled')
}

/** Order sizes the admin groups by: 1 card, 2 cards, or 3 and more. */
export const SIZES = ['one', 'two', 'more'] as const
export type Size = (typeof SIZES)[number]

export function sizeOf(order: OrderRecord): Size {
  const count = countCards(order.items)
  return count <= 1 ? 'one' : count === 2 ? 'two' : 'more'
}

export type Totals = {
  orders: number
  /** Integer centavos. */
  revenue: number
  /** Integer centavos. */
  average: number
  /** How many cards of each platform were sold. */
  cards: Record<Platform, number>
  /** How many orders of each size. */
  sizes: Record<Size, number>
}

export function totals(records: readonly OrderRecord[]): Totals {
  const list = counted(records)
  const revenue = list.reduce((sum, order) => sum + order.total, 0)
  const cards = Object.fromEntries(PLATFORMS.map((platform) => [platform, 0])) as Record<Platform, number>
  const sizes = Object.fromEntries(SIZES.map((size) => [size, 0])) as Record<Size, number>
  for (const order of list) {
    sizes[sizeOf(order)] += 1
    for (const item of order.items) cards[item.platform] += item.quantity
  }
  return { orders: list.length, revenue, average: list.length ? Math.round(revenue / list.length) : 0, cards, sizes }
}

/** Percent change from `previous` to `current`, or null when there is nothing to compare with. */
export function change(current: number, previous: number): number | null {
  return previous === 0 ? null : ((current - previous) / previous) * 100
}

export type Bucket = { from: number; to: number; orders: number; revenue: number }

/** One bucket for every `size` days of `span`, oldest first. The oldest bucket may be shorter. */
export function buckets(records: readonly OrderRecord[], span: Span, size: number): Bucket[] {
  const result: Bucket[] = []
  for (let to = span.to; to > span.from; to -= size * DAY) {
    result.unshift({ from: Math.max(span.from, to - size * DAY), to, orders: 0, revenue: 0 })
  }
  for (const order of counted(records)) {
    const time = Date.parse(order.createdAt)
    const bucket = result.find((item) => time >= item.from && time < item.to)
    if (bucket) {
      bucket.orders += 1
      bucket.revenue += order.total
    }
  }
  return result
}

/** Short periods get a bar per day, long ones a bar per week. */
export function bucketSize(days: number): number {
  return days <= 31 ? 1 : 7
}

/** The provinces with the most orders, biggest first. */
export function topProvinces(records: readonly OrderRecord[], limit = 5): Count[] {
  const counts = new Map<string, number>()
  for (const order of counted(records)) counts.set(order.province, (counts.get(order.province) ?? 0) + 1)
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit)
}
