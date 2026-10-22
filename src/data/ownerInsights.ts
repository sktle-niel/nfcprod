import type { Product } from '@/entities/menu/menu'
import type { Insights } from './ownerRepository'

const DAY = 86_400_000
const DAYS = 14
const TOP_ITEMS = 5
// The Philippines keep UTC+8 all year, so a Manila date is the UTC date eight hours later.
const MANILA_OFFSET = 8 * 3_600_000

/** A small seeded random number generator (FNV-1a of the text as the seed, then mulberry32): numbers from 0 to below 1. */
function seeded(text: string): () => number {
  let state = 0x811c9dc5
  for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 0x01000193)
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

/**
 * Believable visitor numbers for the Overview until the analytics store exists: the two weeks that end on the Manila
 * date of `now`, and up to five of `products` by views. The same slug gives the same numbers.
 */
export function sampleInsights(slug: string, products: readonly Product[], now: number): Insights {
  // The business's usual day: 30 to 119 views. Friday to Sunday are busier.
  const usual = 30 + Math.floor(seeded(slug)() * 90)
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(now + MANILA_OFFSET - (DAYS - 1 - i) * DAY).toISOString().slice(0, 10)
    // Seeded by the date too, so a day keeps its numbers as the two weeks move on.
    const next = seeded(`${slug}:${date}`)
    const busy = [0, 5, 6].includes(new Date(date).getUTCDay()) ? 1.4 : 1
    const views = Math.max(1, Math.round(usual * busy * (0.7 + next() * 0.6)))
    // A tap on the card opens the menu, so taps are a part of the views: 35 to 65 percent.
    return { date, views, taps: Math.floor(views * (0.35 + next() * 0.3)) }
  })
  const next = seeded(`${slug}:top`)
  const picked = [...new Set(products.map((product) => product.name))]
    .map((name) => ({ name, order: next() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, TOP_ITEMS)
  let views = Math.round(days.reduce((sum, day) => sum + day.views, 0) * 0.2)
  const topItems = picked.map(({ name }) => {
    const item = { name, views }
    views = Math.max(1, Math.min(views - 1, Math.round(views * (0.55 + next() * 0.3))))
    return item
  })
  return { demo: true, days, topItems }
}
