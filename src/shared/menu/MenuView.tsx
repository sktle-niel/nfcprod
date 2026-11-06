import { Suspense, useId, type CSSProperties } from 'react'
import { copy } from '@/config/copy'
import type { Business, BusinessType } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import { toCssVars } from '@/entities/theme/cssVars'
import { isTemplateStyle, type CardKind } from '@/entities/theme/theme'
import { ClassicPage } from './ClassicPage'
import { useMenuFonts } from './fonts'
import { lookOf, LookProvider, type Look } from './look'
import { pictureSrc, renderableTheme } from './picture'
import { placeholderKind } from './photo/placeholders'
import { spotlightOf, visibleSections } from './sections'
import { TEMPLATES } from './templates'
import { TemplateBoundary } from './templates/TemplateBoundary'
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
 * is drawn comes from the theme's look: a page template draws the whole page itself (src/shared/menu/templates), and every other
 * menu is the Classic page (`ClassicPage`), which also stands in for a template that cannot be loaded.
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
  const idOf = (index: number) => `${uid}-section-${index}`
  const [categoryTag, productTag] = headingLevel === 1 ? (['h2', 'h3'] as const) : (['h3', 'h4'] as const)
  // A menu with nothing on it is drawn the Classic way, with its own words, whatever the template: there is no page to lay out.
  const Template = sections.length > 0 && isTemplateStyle(look.style) ? TEMPLATES[look.style] : null
  const classic = <ClassicPage business={business} sections={sections} groups={menu.groups} headingLevel={headingLevel} interactive={interactive} idOf={idOf} />

  return (
    // The variables are fixed names with checked values (toCssVars), and every data attribute is one of our own list
    // values (lookOf), so the root is not built from free text.
    <LookProvider value={look}>
      <div
        className={styles.root}
        style={toCssVars(theme) as CSSProperties}
        data-menu-template={Template ? look.style : undefined}
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
        {Template ? (
          // Above the photo layer, like the Classic content. The key starts the boundary over when another template is chosen.
          <div className={styles.content}>
            <TemplateBoundary key={look.style} fallback={classic} interactive={interactive}>
              {/* Nothing is laid out yet, so nothing moves when the page comes. The words only appear on a slow download. */}
              <Suspense fallback={interactive ? <p role="status" className={styles.templateLoading}>{copy.menu.view.template.loading}</p> : null}>
                <Template
                  business={business}
                  sections={sections}
                  // A template decides for itself whether to feature it, so it is always handed one.
                  spotlight={spotlightOf(sections)}
                  groups={menu.groups}
                  layout={look.layout}
                  tags={{ name: headingLevel === 1 ? 'h1' : 'h2', category: categoryTag, product: productTag }}
                  interactive={interactive}
                  idOf={idOf}
                  photoOf={(product) => pictureSrc(product.image)}
                  placeholderOf={(product, category) => placeholderKind({ product: product.name, category: category.name }, business.types)}
                />
              </Suspense>
            </TemplateBoundary>
          </div>
        ) : (
          classic
        )}
      </div>
    </LookProvider>
  )
}
