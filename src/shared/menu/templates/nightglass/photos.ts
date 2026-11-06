import type { Section } from '../../sections'
import type { TemplateProps } from '../types'

/**
 * The one picture pinned to each category of the board, by position, or null for a category with none to spare. An item that can be
 * had goes before a sold-out one, and a picture a category above already showed is not pinned again.
 */
export function pinnedPhotos(sections: readonly Section[], photoOf: TemplateProps['photoOf']): (string | null)[] {
  const used = new Set<string | null>([null])
  return sections.map(({ products }) => {
    const fresh = products.filter((product) => !used.has(photoOf(product)))
    const pick = fresh.find((product) => product.available) ?? fresh[0]
    const photo = pick === undefined ? null : photoOf(pick)
    used.add(photo)
    return photo
  })
}
