import { useId, type CSSProperties } from 'react'
import { copy } from '@/config/copy'
import type { Business, BusinessType } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import { toCssVars } from '@/entities/theme/cssVars'
import type { CardKind } from '@/entities/theme/theme'
import { ProductCard } from './cards/ProductCard'
import { CategoryNav } from './CategoryNav'
import { Decor } from './decor/Decor'
import { useMenuFonts } from './fonts'
import { MenuHeader } from './headers/MenuHeader'
import { lookOf, LookProvider, type Look } from './look'
import { MenuFooter } from './MenuFooter'
import { pictureSrc, renderableTheme } from './picture'
import { placeholderKind } from './photo/placeholders'
import { spotlightOf, visibleSections } from './sections'
import { Spotlight } from './Spotlight'
import { SectionTitle } from './titles/SectionTitle'
import { usePhotoBackdrop } from './usePhotoBackdrop'
import styles from './MenuView.module.css'

export type MenuViewBusiness = Pick<Business, 'name' | 'tagline' | 'logo' | 'phone' | 'address' | 'hours' | 'social' | 'theme'> & {
  /** What the business serves: it picks the illustration of a product that has no picture. Optional. */
  types?: readonly BusinessType[] | undefined
}

type Props = {
  business: MenuViewBusiness
  menu: Menu
  /** The level of the business name. The public page is 1; a preview inside another page is 2. */
  headingLevel?: 1 | 2
  /** False draws links as plain text with no tab stops (the Design preview). The public page keeps the default. */
  interactive?: boolean
}

// The card kinds that sit side by side when the layout is "grid" and the menu is wide enough ('many'). The poster is one column on a
// phone and two on a wide menu ('wide', whatever the layout). The others are always one column.
const MANY_COLUMNS: readonly CardKind[] = ['row', 'tile', 'badge']
const columnsOf = (look: Look) => {
  if (look.card === 'poster') return 'wide'
  return look.layout === 'grid' && MANY_COLUMNS.includes(look.card) ? 'many' : 'one'
}

/**
 * The one renderer of a business's menu, for the Design preview and the public page. It is painted from the --menu-*
 * variables only, and sized by its own width (container queries), so it fits a phone and a small preview frame alike. How it
 * is drawn (the card, the picture shape, the titles, the header, the line art) comes from the theme's look.
 */
export function MenuView({ business, menu, headingLevel = 1, interactive = true }: Props) {
  const uid = useId()
  // The photo backdrop must be a picture this page may show (renderableTheme: checked address, trusted origin) before
  // its address can reach toCssVars. Outside the storage it is no photo at all, and the page stays the page color. And on
  // a screen wider than the photo can fill, the menu paints the texture of its style instead (usePhotoBackdrop).
  const { theme, layer, layerRef } = usePhotoBackdrop(renderableTheme(business.theme))
  const look = lookOf(theme)
  useMenuFonts(business.theme)
  const sections = visibleSections(menu)
  const spotlight = look.spotlight ? spotlightOf(sections) : null
  const groupIds = new Set(menu.groups.map((group) => group.id))
  const idOf = (index: number) => `${uid}-section-${index}`
  const [categoryTag, productTag] = headingLevel === 1 ? (['h2', 'h3'] as const) : (['h3', 'h4'] as const)

  return (
    // The variables are fixed names with checked values (toCssVars), and every data attribute is one of our own list
    // values (lookOf), so the root is not built from free text.
    <LookProvider value={look}>
      <div
        className={styles.root}
        style={toCssVars(theme) as CSSProperties}
        data-menu-layout={look.layout}
        data-menu-columns={columnsOf(look)}
        data-menu-card={look.card}
        data-menu-photo={look.photo}
        data-menu-title={look.title}
        data-menu-header={look.header}
        data-menu-decor={look.decor}
        data-menu-backdrop={look.backdrop}
        data-menu-backdrop-fit={look.backdropFit}
        data-menu-backdrop-position={look.backdropPosition}
      >
        {/* The photo under the page: one screen tall, it stays put while the menu scrolls over it (MenuView.module.css). */}
        {layer && <div ref={layerRef} className={styles.photo} aria-hidden="true" />}
        <Decor />
        <div className={styles.content}>
          <MenuHeader business={business} as={headingLevel === 1 ? 'h1' : 'h2'} />
          {sections.length === 0 ? (
            <p className={styles.empty}>{copy.menu.view.empty}</p>
          ) : (
            <>
              <CategoryNav sections={sections} idOf={idOf} interactive={interactive} />
              {spotlight && (
                <Spotlight
                  as={categoryTag}
                  product={spotlight.product}
                  photo={pictureSrc(spotlight.product.image)}
                  placeholder={placeholderKind({ product: spotlight.product.name, category: spotlight.category.name }, business.types)}
                />
              )}
              {sections.map(({ category, products }, index) => (
                <section
                  key={category.id}
                  id={idOf(index)}
                  className={styles.section}
                  // A landmark on the public page only: in the Design preview it would add the customer's menu to the owner's landmarks.
                  aria-labelledby={interactive ? `${idOf(index)}-title` : undefined}
                >
                  <SectionTitle as={categoryTag} id={`${idOf(index)}-title`} name={category.name} />
                  <ul className={styles.products}>
                    {products.map((product, position) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        as={productTag}
                        hasAddOns={product.groupIds.some((id) => groupIds.has(id))}
                        photo={pictureSrc(product.image)}
                        placeholder={placeholderKind({ product: product.name, category: category.name }, business.types)}
                        number={position + 1}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
          <MenuFooter business={business} interactive={interactive} />
        </div>
      </div>
    </LookProvider>
  )
}
