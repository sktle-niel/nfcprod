import { copy } from '@/config/copy'
import type { Menu } from '@/entities/menu/menu'
import { ProductCard } from './cards/ProductCard'
import { CategoryNav } from './CategoryNav'
import { Decor } from './decor/Decor'
import { MenuHeader } from './headers/MenuHeader'
import { useLook } from './look'
import { MenuFooter } from './MenuFooter'
import type { MenuViewBusiness } from './MenuView'
import { pictureSrc } from './picture'
import { placeholderKind } from './photo/placeholders'
import { spotlightOf, type Section } from './sections'
import { Spotlight } from './Spotlight'
import { SectionTitle } from './titles/SectionTitle'
import styles from './MenuView.module.css'

type Props = {
  business: MenuViewBusiness
  sections: Section[]
  groups: Menu['groups']
  headingLevel: 1 | 2
  interactive: boolean
  idOf: (index: number) => string
}

/**
 * The Classic page: the menu drawn from the look's card, picture shape, titles, header and line art. It is the look of a menu with no
 * template, of a menu with nothing on it (there is no page to lay out), and of a template that could not be loaded.
 */
export function ClassicPage({ business, sections, groups, headingLevel, interactive, idOf }: Props) {
  const look = useLook()
  const groupIds = new Set(groups.map((group) => group.id))
  const [categoryTag, productTag] = headingLevel === 1 ? (['h2', 'h3'] as const) : (['h3', 'h4'] as const)
  const spotlight = look.spotlight ? spotlightOf(sections) : null

  return (
    <>
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
    </>
  )
}
