import { copy } from '@/config/copy'
import { PlaceLink } from './PlaceLink'
import styles from './SiteNav.module.css'

const text = copy.menu.view.template.siteNav

type Props = { menuId: string; visitId: string; interactive: boolean }

/** The two words at the top of the board, one each side of the lamp. No landmark in the preview, where nothing is a link. */
export function SiteNav({ menuId, visitId, interactive }: Props) {
  const list = (
    <ul className={styles.list}>
      <li>
        <PlaceLink id={menuId} className={styles.link} interactive={interactive}>
          {text.menu}
        </PlaceLink>
      </li>
      <li>
        <PlaceLink id={visitId} className={styles.link} interactive={interactive}>
          {text.visit}
        </PlaceLink>
      </li>
    </ul>
  )
  return interactive ? <nav aria-label={text.label}>{list}</nav> : <div>{list}</div>
}
