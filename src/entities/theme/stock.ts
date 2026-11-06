import { BUSINESS_TYPES, type BusinessType } from '@/entities/business/business'
import { isOneOf } from '@/shared/lib/checks'
import { STOCK_PHOTOS, type StockCategory, type StockPhoto } from './stockPhotos'

/*
 * The one way into the photo library. A theme stores only an id; the address of the file is built here from the table entry
 * that id names, and from nothing else, so no text a person typed ever reaches a URL or CSS. Pure and free of configuration:
 * the files are served from the app's own address (public/stock).
 */

// Looked up by exact id. A Map holds only what the table put in it, so a prototype key such as '__proto__' finds nothing.
const BY_ID: ReadonlyMap<string, StockPhoto> = new Map(STOCK_PHOTOS.map((photo) => [photo.id, photo] as const))

/** The library photo with this id, or null for anything else: an id the table does not know, a path, an empty text, a value that is not text. */
export function stockPhoto(id: unknown): StockPhoto | null {
  return typeof id === 'string' ? (BY_ID.get(id) ?? null) : null
}

/** The address of the full photo, or null when the library has no such photo. */
export function stockSrc(id: unknown): string | null {
  const photo = stockPhoto(id)
  return photo === null ? null : `/stock/${photo.file}.jpg`
}

/** The address of the small thumbnail the picker draws, or null when the library has no such photo. */
export function stockThumbSrc(id: unknown): string | null {
  const photo = stockPhoto(id)
  return photo === null ? null : `/stock/${photo.file}.thumb.jpg`
}

// The library is sorted by the same six kinds of business as the presets, under spellings of its own (the folder names).
const CATEGORY_OF: Readonly<Record<BusinessType, StockCategory>> = {
  coffee: 'coffee',
  milkTea: 'milktea',
  casualDining: 'casual',
  fineDining: 'fine',
  bakery: 'bakery',
  bar: 'bar',
}

/**
 * The category the picker opens on for a business: the one of its first kind of business, as its look is (`mergePresets`).
 * A business with no kind, or whose first kind is not one of the six, gets coffee.
 */
export function stockCategoryFor(types: readonly BusinessType[] | undefined): StockCategory {
  const first = types?.[0]
  return isOneOf(BUSINESS_TYPES, first) ? CATEGORY_OF[first] : 'coffee'
}
