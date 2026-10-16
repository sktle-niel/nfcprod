import { PLATFORMS } from '@/entities/order/order'
import type { OrderItem, OrderRecord, Platform } from '@/entities/order/order'

/** The "today" of the demo, so the dashboard numbers never go stale. */
export const SAMPLE_AS_OF = '2026-10-13T12:00:00Z'

const DAY = 86_400_000

// What the server charged for 1, 2 and 3 cards when these made-up orders came in, before the
// price per card (integer centavos).
const PRICE = { 1: 58000, 2: 78000, 3: 139900 } as const

/** One card of each platform, the way orders looked before quantities. */
const each = (...platforms: Platform[]): OrderItem[] => platforms.map((platform) => ({ platform, quantity: 1 }))

// The last three weeks, written by hand.
const recent: OrderRecord[] = [
  {
    reference: 'NFC-7K2M9Q', createdAt: '2026-10-13T04:12:00Z', status: 'new', total: PRICE[3],
    items: each('facebook', 'instagram', 'google'), fullName: 'Maria Angelica Santos', phone: '+639171234501',
    province: 'Cebu', city: 'Cebu City', barangay: 'Lahug', street: '12 Salinas Drive',
    landmark: 'Blue gate beside the 7-Eleven, 2nd house',
  },
  {
    reference: 'NFC-4P8R1T', createdAt: '2026-10-12T09:40:00Z', status: 'new', total: PRICE[1],
    items: each('google'), fullName: 'Juan Dela Cruz', phone: '+639171234502',
    province: 'Davao del Sur', city: 'Davao City', barangay: 'Buhangin', street: '45 Rizal Street',
    landmark: 'Second floor above the pharmacy, green door',
  },
  {
    reference: 'NFC-9D3X6B', createdAt: '2026-10-12T02:05:00Z', status: 'new', total: PRICE[2],
    items: each('facebook', 'instagram'), fullName: 'Ramon Villanueva', phone: '+639171234503',
    province: 'Metro Manila', city: 'Quezon City', barangay: 'Project 4', street: '88 Aurora Boulevard',
    landmark: 'Gray gate across the bakery, ring the bell twice',
  },
  {
    reference: 'NFC-2W6H5N', createdAt: '2026-10-11T11:30:00Z', status: 'new', total: PRICE[1],
    items: each('facebook'), fullName: 'Cheryl Anne Mercado', phone: '+639171234504',
    province: 'Pampanga', city: 'Angeles City', barangay: 'Balibago', street: '7 Fields Avenue',
    landmark: 'Beside the milk tea shop, white building',
  },
  {
    reference: 'NFC-8T1Y4C', createdAt: '2026-10-10T07:55:00Z', status: 'confirmed', total: PRICE[3],
    items: each('facebook', 'instagram', 'google'), fullName: 'Joshua Bautista', phone: '+639171234505',
    province: 'Cavite', city: 'Bacoor', barangay: 'Molino IV', street: '23 Tirona Highway',
    landmark: 'Yellow house after the basketball court',
  },
  {
    reference: 'NFC-5G7J2K', createdAt: '2026-10-09T14:20:00Z', status: 'confirmed', total: PRICE[2],
    items: each('instagram', 'google'), fullName: 'Patricia Lim', phone: '+639171234506',
    province: 'Iloilo', city: 'Iloilo City', barangay: 'Mandurriao', street: '101 Diversion Road',
    landmark: 'Unit 3B, glass door facing the parking lot',
  },
  {
    reference: 'NFC-3M9Q8V', createdAt: '2026-10-08T03:10:00Z', status: 'delivered', total: PRICE[1],
    items: each('instagram'), fullName: 'Mark Anthony Reyes', phone: '+639171234507',
    province: 'Laguna', city: 'Santa Rosa', barangay: 'Tagapo', street: '56 Market Street',
    landmark: 'Blue sari-sari store beside the chapel',
  },
  {
    reference: 'NFC-6B4Z1R', createdAt: '2026-10-07T10:45:00Z', status: 'delivered', total: PRICE[3],
    items: each('facebook', 'instagram', 'google'), fullName: 'Liza Marie Navarro', phone: '+639171234508',
    province: 'Bohol', city: 'Tagbilaran City', barangay: 'Poblacion II', street: '9 CPG Avenue',
    landmark: 'Corner lot with a red roof, near the church',
  },
  {
    reference: 'NFC-1C8L3F', createdAt: '2026-10-05T08:25:00Z', status: 'delivered', total: PRICE[2],
    items: each('facebook', 'google'), fullName: 'Daniel Ocampo', phone: '+639171234509',
    province: 'Bulacan', city: 'Malolos', barangay: 'Sumapang Matanda', street: '34 Paseo del Congreso',
    landmark: 'Third house from the barangay hall',
  },
  {
    reference: 'NFC-7X2D6P', createdAt: '2026-10-03T12:00:00Z', status: 'delivered', total: PRICE[1],
    items: each('google'), fullName: 'Grace Villaflor', phone: '+639171234510',
    province: 'Negros Occidental', city: 'Bacolod City', barangay: 'Mandalagan', street: '15 Lacson Street',
    landmark: 'Cream building, cafe on the ground floor',
  },
  {
    reference: 'NFC-4N5S9A', createdAt: '2026-10-01T06:35:00Z', status: 'delivered', total: PRICE[3],
    items: each('facebook', 'instagram', 'google'), fullName: 'Paolo Mendoza', phone: '+639171234511',
    province: 'Batangas', city: 'Lipa City', barangay: 'Sabang', street: '72 Ayala Highway',
    landmark: 'Beside the gas station, brown gate',
  },
  {
    reference: 'NFC-9H3E7W', createdAt: '2026-09-29T15:50:00Z', status: 'delivered', total: PRICE[2],
    items: each('instagram', 'google'), fullName: 'Rhea Camille Soriano', phone: '+639171234512',
    province: 'Pangasinan', city: 'Dagupan City', barangay: 'Pantal', street: '28 Perez Boulevard',
    landmark: 'Pink gate, laundry shop in front',
  },
  {
    reference: 'NFC-2K6U4T', createdAt: '2026-09-26T09:15:00Z', status: 'cancelled', total: PRICE[1],
    items: each('facebook'), fullName: 'Eduardo Tan', phone: '+639171234513',
    province: 'Rizal', city: 'Antipolo', barangay: 'San Roque', street: '4 Sumulong Highway',
    landmark: 'White fence beside the vulcanizing shop',
  },
  {
    reference: 'NFC-8R1M5G', createdAt: '2026-09-24T05:05:00Z', status: 'delivered', total: PRICE[3],
    items: each('facebook', 'instagram', 'google'), fullName: 'Hazel Anne Dizon', phone: '+639171234514',
    province: 'Cebu', city: 'Mandaue City', barangay: 'Subangdaku', street: '61 Fortuna Street',
    landmark: 'Second floor, stairs beside the hardware store',
  },
]

// Small deterministic random numbers, so the demo and the tests always see the same orders.
function randomFrom(seed: number) {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

const FIRST_NAMES = ['Anna', 'Ben', 'Carla', 'Dante', 'Erika', 'Felix', 'Gina', 'Harold', 'Irene', 'Jaime', 'Kristine', 'Leo']
const LAST_NAMES = ['Aquino', 'Castillo', 'Domingo', 'Estrada', 'Flores', 'Garcia', 'Ibarra', 'Javier', 'Lopez', 'Magno', 'Pascual', 'Ramos']
const PLACES = [
  { province: 'Cebu', city: 'Cebu City', barangay: 'Banilad', street: 'Mindanao Avenue' },
  { province: 'Davao del Sur', city: 'Davao City', barangay: 'Matina', street: 'McArthur Highway' },
  { province: 'Metro Manila', city: 'Makati', barangay: 'Poblacion', street: 'Kalayaan Avenue' },
  { province: 'Metro Manila', city: 'Pasig', barangay: 'Kapitolyo', street: 'Shaw Boulevard' },
  { province: 'Pampanga', city: 'San Fernando', barangay: 'Dolores', street: 'Olongapo Road' },
  { province: 'Cavite', city: 'Dasmarinas', barangay: 'Salitran', street: 'Aguinaldo Highway' },
  { province: 'Laguna', city: 'Calamba', barangay: 'Real', street: 'National Highway' },
  { province: 'Iloilo', city: 'Iloilo City', barangay: 'Jaro', street: 'Lopez Jaena Street' },
  { province: 'Negros Occidental', city: 'Bacolod City', barangay: 'Villamonte', street: 'Burgos Street' },
  { province: 'Bulacan', city: 'Malolos', barangay: 'Bulihan', street: 'Paseo del Congreso' },
] as const
const LANDMARKS = [
  'Beside the corner bakery, green gate',
  'Across the elementary school, white fence',
  'Next to the pharmacy, second floor',
  'Behind the barangay hall, brown door',
  'In front of the 24-hour convenience store',
  'Third house after the chapel, blue roof',
]

// The weeks before that: delivered orders, a few repeat buyers and one cancelled order now and then.
function earlier(count: number): OrderRecord[] {
  const next = randomFrom(2026)
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)] as T
  const orders: OrderRecord[] = []
  let time = Date.parse('2026-09-23T10:00:00Z')

  for (let index = 0; index < count; index += 1) {
    const roll = next()
    const size = roll < 0.45 ? 1 : roll < 0.75 ? 2 : 3
    const first = Math.floor(next() * PLATFORMS.length)
    const items = each(
      ...Array.from({ length: size }, (_, offset) => PLATFORMS[(first + offset) % PLATFORMS.length] as Platform),
    )
    const place = pick(PLACES)
    const again = index % 9 === 8 ? orders[index - 4] : undefined

    orders.push({
      reference: `NFC-${Math.floor(next() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0')}`,
      createdAt: new Date(time).toISOString(),
      status: index % 17 === 5 ? 'cancelled' : 'delivered',
      total: PRICE[size],
      items,
      fullName: again?.fullName ?? `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      phone: again?.phone ?? `+63917123${5000 + index}`,
      province: place.province,
      city: place.city,
      barangay: place.barangay,
      street: `${1 + Math.floor(next() * 120)} ${place.street}`,
      landmark: pick(LANDMARKS),
    })
    time -= (0.6 + next() * 1.3) * DAY
  }
  return orders
}

/** Made-up people for demo mode, newest first. Not real customers. */
export const sampleOrders: readonly OrderRecord[] = [...recent, ...earlier(40)].sort(
  (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
)
