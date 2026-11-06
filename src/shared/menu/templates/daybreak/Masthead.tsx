import { HeaderLogo, motion } from '../kit'
import { pictureSrc } from '../../picture'
import type { MenuViewBusiness } from '../../MenuView'
import type { TemplateProps } from '../types'
import { joined } from './classes'
import styles from './Masthead.module.css'

type Props = { business: MenuViewBusiness; as: TemplateProps['tags']['name']; interactive: boolean }

/** How big a name can be set: the longer it is, the smaller the type, so it fills the sheet without breaking inside a word. */
const sizeOf = (name: string) => {
  const longest = Math.max(...name.trim().split(/\s+/).map((word) => word.length))
  if (longest > 12 || name.length > 26) return 's'
  return longest > 8 || name.length > 14 ? 'm' : 'l'
}

/**
 * The top of the sheet: the logo if there is one, the name of the shop set as big as it fits, and its tagline. On the public page
 * they begin the one composed moment as it opens, the name first. A plain box, so a preview or a gallery tile adds no landmark.
 */
export function Masthead({ business, as: Name, interactive }: Props) {
  const first = interactive ? motion.opening : undefined
  const second = interactive ? joined(motion.opening, motion.afterOne) : undefined
  return (
    <div className={styles.masthead}>
      {pictureSrc(business.logo) !== null && (
        <span className={joined(styles.logo, first)}>
          <HeaderLogo logo={business.logo} />
        </span>
      )}
      <Name className={joined(styles.name, first)} data-size={sizeOf(business.name)}>
        {business.name}
      </Name>
      {business.tagline !== '' && <p className={joined(styles.tagline, second)}>{business.tagline}</p>}
    </div>
  )
}
