import { ORDER_STATUSES, type OrderStatus } from '@/entities/order/order'

/** The status that `value` names, or undefined when it names none (a select or a query string can hold anything). */
export function toStatus(value: string | null): OrderStatus | undefined {
  return ORDER_STATUSES.find((status) => status === value)
}
