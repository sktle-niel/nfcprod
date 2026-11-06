import { pictureSrc } from '../../picture'
import type { MenuViewBusiness } from '../../MenuView'
import { HeaderLogo, motion } from '../kit'
import type { TemplateProps } from '../types'
import styles from './Masthead.module.css'

type Props = { business: MenuViewBusiness; as: TemplateProps['tags']['name']; interactive: boolean }

/** How wide the name can be lettered: the longer it is, the smaller the type, so a word never breaks. */
const sizeOf = (name: string) => {
  const longest = Math.max(...name.trim().split(/\s+/).map((word) => word.length))
  if (longest > 12 || name.length > 22) return 's'
  return longest > 8 || name.length > 12 ? 'm' : 'l'
}

/** The name of the shop gilded across the top of the board, like its sign. It settles once as the lamp comes up, on the page only. */
export function Masthead({ business, as: Name, interactive }: Props) {
  const opening = interactive ? motion.opening : ''
  const afterOne = interactive ? motion.afterOne : ''
  return (
    <div className={styles.masthead}>
      {pictureSrc(business.logo) !== null && (
        <span className={`${styles.logo} ${opening}`}>
          <HeaderLogo logo={business.logo} />
        </span>
      )}
      <Name className={`${styles.name} ${opening}`} data-size={sizeOf(business.name)}>
        {business.name}
      </Name>
      {business.tagline !== '' && <p className={`${styles.tagline} ${opening} ${afterOne}`}>{business.tagline}</p>}
    </div>
  )
}
