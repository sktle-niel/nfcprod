import { copy } from '@/config/copy'
import { HeaderLogo, motion } from '../kit'
import type { MenuViewBusiness } from '../../MenuView'
import { pictureSrc } from '../../picture'
import type { TemplateProps } from '../types'
import { Jump } from './Jump'
import styles from './Opening.module.css'

type Props = {
  business: MenuViewBusiness
  as: TemplateProps['tags']['name']
  /** Where the Menu link goes: the first category. */
  menuId: string
  /** Where the Visit link goes, or null for a shop with no Visit section. */
  visitId: string | null
  interactive: boolean
}

const text = copy.menu.view.template.siteNav

/**
 * The title wall of the gallery: the two links to the places on this page, then the name of the shop and its tagline. It stays short so
 * the first photo is on the first screen. A shop with nothing to visit has one place only, so it draws no links at all.
 */
export function Opening({ business, as: Name, menuId, visitId, interactive }: Props) {
  // Name, then tagline: the one composed moment of the page, on the public page only.
  const step = (later?: string) => (interactive ? [motion.opening, later].filter(Boolean).join(' ') : '')
  const links = visitId !== null && (
    <ul className={styles.links}>
      <li>
        <Jump to={menuId} interactive={interactive} className={styles.link}>
          {text.menu}
        </Jump>
      </li>
      <li>
        <Jump to={visitId} interactive={interactive} className={styles.link}>
          {text.visit}
        </Jump>
      </li>
    </ul>
  )
  return (
    <div className={styles.opening}>
      {interactive && links !== false ? <nav aria-label={text.label}>{links}</nav> : links}
      <div className={styles.title}>
        {pictureSrc(business.logo) !== null && (
          <span className={`${styles.logo} ${step()}`}>
            <HeaderLogo logo={business.logo} />
          </span>
        )}
        <Name className={`${styles.name} ${step()}`}>{business.name}</Name>
        {business.tagline !== '' && <p className={`${styles.tagline} ${step(motion.afterOne)}`}>{business.tagline}</p>}
      </div>
    </div>
  )
}
