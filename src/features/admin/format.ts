import { copy } from '@/config/copy'
import { roundCoordinate, type Pin } from '@/entities/location/pin'
import type { OrderItem } from '@/entities/order/order'

// The business runs on Philippine time, wherever the admin happens to be.
const ZONE = 'Asia/Manila'
const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONE })
const shortDay = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: ZONE })

/** "Oct 13, 2026, 12:12 pm". A value that is not a date is shown as it came. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateTime.format(date)
}

/** "Oct 13". */
export function formatDay(value: string | number): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : shortDay.format(date)
}

/** "Facebook × 2, Google review". A single card shows no count. */
export function formatItems(items: readonly OrderItem[]): string {
  return items
    .map(({ platform, quantity }) => {
      const name = copy.order.cardNames[platform]
      return quantity > 1 ? `${name} × ${quantity}` : name
    })
    .join(', ')
}

/** +639171234567 becomes 0917 123 4567, the way people write and dial PH mobile numbers. */
export function formatMobile(phone: string): string {
  return phone.replace(/^\+63(9\d{2})(\d{3})(\d{4})$/, '0$1 $2 $3')
}

/** "10.32800, 123.90600": latitude, then longitude, always five decimals, the way a maps search box takes them. */
export function formatPin(pin: Pin): string {
  return `${roundCoordinate(pin.lat).toFixed(5)}, ${roundCoordinate(pin.lng).toFixed(5)}`
}
