import { copy } from '@/config/copy'
import type { Menu } from '@/entities/menu/menu'
import { MenuView, type MenuViewBusiness } from './MenuView'
import styles from './MenuPreviewFrame.module.css'

type Props = { business: MenuViewBusiness; menu: Menu }

/** A phone-shaped window onto the menu, for the Design page. The menu scrolls inside it. */
export function MenuPreviewFrame({ business, menu }: Props) {
  return (
    // The scroll area takes the keyboard, so a person without a mouse can read all of the preview. Inside it nothing
    // is a link or a tab stop: the draft's phone and social links must not be reachable before the form.
    <div className={styles.frame} role="region" aria-label={copy.menu.view.previewLabel} tabIndex={0}>
      <MenuView business={business} menu={menu} headingLevel={2} interactive={false} />
    </div>
  )
}
