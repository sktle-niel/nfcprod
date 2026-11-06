import { pictureSrc } from '../../picture'
import type { MenuViewBusiness } from '../../MenuView'
import { HeaderLogo, motion } from '../kit'
import type { TemplateProps } from '../types'
import { SiteNav } from './SiteNav'
import { SwelledRule } from './SwelledRule'
import frame from './Frame.module.css'
import styles from './Masthead.module.css'

type Props = {
  business: MenuViewBusiness
  as: TemplateProps['tags']['name']
  /** Where the top links go: the first category, and the Visit section, or null for a shop with nothing to put in it. */
  menuId: string
  visitId: string | null
  interactive: boolean
}

/** How big a name can be lettered: the longest word has to fit across the fascia without breaking. */
const sizeOf = (name: string) => {
  const longest = Math.max(...name.trim().split(/\s+/).map((word) => word.length))
  if (longest > 12 || name.length > 28) return 's'
  return longest > 8 || name.length > 18 ? 'm' : 'l'
}

const join = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

/**
 * The fascia over the shop front: a deep painted board lined out in gilt, the name lettered across it with a fine painter's shade,
 * a swelled rule under it and the tagline. On the public page the sign comes together once, in three short steps.
 */
export function Masthead({ business, as: Name, menuId, visitId, interactive }: Props) {
  const logo = pictureSrc(business.logo) !== null
  return (
    <div className={join(frame.ground, styles.fascia)}>
      {visitId !== null && <SiteNav menuId={menuId} visitId={visitId} interactive={interactive} />}
      <div className={join(frame.lined, styles.sign)}>
        {logo && (
          <span className={join(styles.logo, interactive && motion.opening)}>
            <HeaderLogo logo={business.logo} />
          </span>
        )}
        <Name className={join(styles.name, interactive && motion.opening)} data-size={sizeOf(business.name)}>
          {business.name}
        </Name>
        <SwelledRule className={join(styles.rule, interactive && styles.drawn)} />
        {business.tagline !== '' && <p className={join(styles.tagline, interactive && motion.opening, interactive && motion.afterTwo)}>{business.tagline}</p>}
      </div>
    </div>
  )
}
