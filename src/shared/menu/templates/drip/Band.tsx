import type { ReactNode } from 'react'
import { HeaderLogo, motion } from '../kit'
import type { TemplateProps } from '../types'
import { DripEdge } from './DripEdge'
import { sizeOf } from './sizeOf'
import styles from './Band.module.css'

type Props = {
  business: TemplateProps['business']
  /** The tag of the name (`tags.name`). */
  as: 'h1' | 'h2'
  /** True for a shop whose drinks or bakes the drip belongs to: any other shop gets a straight edge. */
  drips: boolean
  interactive: boolean
  /** The links of the site, above the name. */
  children: ReactNode
}

/**
 * The opening of the page: the links, the shop's own logo if it has one, its name in script and its tagline. On the public page they
 * rise once as it loads, and the edge pours out from under them. Nothing below the band waits for any of it.
 */
export function Band({ business, as: Name, drips, interactive, children }: Props) {
  const nameClass = interactive ? `${styles.name} ${motion.opening}` : styles.name
  const taglineClass = interactive ? `${styles.tagline} ${motion.opening} ${motion.afterOne}` : styles.tagline
  return (
    <div className={styles.band}>
      <div className={styles.plate}>
        {children}
        <div className={styles.title}>
          <HeaderLogo logo={business.logo} />
          <div className={styles.words}>
            <Name className={nameClass} data-size={sizeOf(business.name)}>
              {business.name}
            </Name>
            {business.tagline !== '' && <p className={taglineClass}>{business.tagline}</p>}
          </div>
        </div>
      </div>
      {drips && <DripEdge pours={interactive} />}
    </div>
  )
}
