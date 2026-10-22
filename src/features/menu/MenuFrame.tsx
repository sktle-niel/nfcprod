import type { CSSProperties } from 'react'
import type { Menu } from '@/entities/menu/menu'
import { toCssVars } from '@/entities/theme/cssVars'
import { MenuView, type MenuViewBusiness } from '@/shared/menu/MenuView'
import styles from './MenuFrame.module.css'

type Props = { business: MenuViewBusiness; menu: Menu }

/**
 * A menu as a whole page: the menu's own page color across the screen, the menu in a centered column at most 720 px
 * wide, and the one <main> landmark. Used by the public page and by the owner's preview, so both look the same.
 */
export function MenuFrame({ business, menu }: Props) {
  return (
    // The variables are fixed names with checked values (toCssVars), as on the menu's own root.
    <main className={styles.page} style={toCssVars(business.theme) as CSSProperties}>
      <div className={styles.column}>
        <MenuView business={business} menu={menu} headingLevel={1} interactive />
      </div>
    </main>
  )
}
