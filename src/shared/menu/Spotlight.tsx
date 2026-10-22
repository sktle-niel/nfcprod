import { copy } from '@/config/copy'
import { Description, Price, SoldOutLabel, Variants } from './cards/CardParts'
import { soldOutAttr } from './cards/cardState'
import type { CardProps } from './cards/types'
import { useLook } from './look'
import { ProductPhoto } from './photo/ProductPhoto'
import styles from './Spotlight.module.css'

type Props = Pick<CardProps, 'product' | 'photo' | 'placeholder'> & {
  /** The heading tag of the name: the level of a category title, since the panel stands beside the categories. */
  as: 'h2' | 'h3'
}

/**
 * The best seller, shown big under the category links when the look asks for it: a panel in the card color with a large
 * picture (made for cut-outs, fine in any shape), a "Best seller" label (in the script font when the category titles are
 * script), the name large in the display font, the description and the price with its sizes. The product also stays in its
 * category; this is a second, bigger look at it.
 */
export function Spotlight({ product, photo, placeholder, as: Heading }: Props) {
  const { title, photo: shape } = useLook()
  const script = title === 'script'
  return (
    <article className={styles.panel} data-photo={shape} data-sold-out={soldOutAttr(product)}>
      <div className={styles.media}>
        <ProductPhoto src={photo} placeholder={placeholder} className={styles.photo} />
      </div>
      <div className={styles.body}>
        <p className={script ? styles.script : styles.label} data-label={script ? 'script' : 'chip'}>
          {copy.menu.view.tags.bestSeller}
        </p>
        <SoldOutLabel product={product} className={styles.soldOut} />
        <Heading className={styles.name}>{product.name}</Heading>
        <Description product={product} className={styles.description} />
        <Price product={product} className={styles.price} />
        <Variants product={product} className={styles.variants} />
      </div>
    </article>
  )
}
