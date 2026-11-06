import { pictureSrc } from '../../picture'
import type { MenuViewBusiness } from '../../MenuView'
import { HeaderLogo, motion } from '../kit'
import type { TemplateProps } from '../types'
import { Ornament } from './Ornament'
import styles from './Masthead.module.css'

type Props = {
  business: MenuViewBusiness
  as: TemplateProps['tags']['name']
  /** False in the Design preview: the page stands still. */
  interactive: boolean
}

/** How big the name can be set: the longer it is, the smaller the type, so it never breaks inside a word. */
const sizeOf = (name: string) => {
  const longest = Math.max(...name.trim().split(/\s+/).map((word) => word.length))
  if (longest > 14 || name.length > 30) return 's'
  return longest > 10 || name.length > 16 ? 'm' : 'l'
}

/**
 * The head of the card: the name of the shop set as type and what it says of itself, closed by the swelled rule. This is the one
 * composed moment of the page: name, then tagline, then the rule drawn out from its center. A plain box, so a preview adds no landmark.
 */
export function Masthead({ business, as: Name, interactive }: Props) {
  const tagline = business.tagline.trim()
  const enter = (base: string | undefined, step?: string) => (interactive ? [base, motion.opening, step].filter(Boolean).join(' ') : base)
  return (
    <div className={styles.masthead}>
      {pictureSrc(business.logo) !== null && (
        <span className={enter(styles.logo)}>
          <HeaderLogo logo={business.logo} />
        </span>
      )}
      <Name className={enter(styles.name)} data-size={sizeOf(business.name)}>
        {business.name}
      </Name>
      {tagline !== '' && <p className={enter(styles.tagline, motion.afterOne)}>{tagline}</p>}
      <span className={styles.rule} data-draw={interactive ? '' : undefined}>
        <Ornament />
      </span>
    </div>
  )
}
