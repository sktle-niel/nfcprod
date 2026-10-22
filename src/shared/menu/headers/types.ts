import type { Business } from '@/entities/business/business'

/** What every kind of header is given. */
export type HeaderProps = {
  business: Pick<Business, 'name' | 'tagline' | 'logo'>
  /** The level of the business name: h1 on the public page, h2 in a preview inside another page. */
  as: 'h1' | 'h2'
}
