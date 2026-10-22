import type { Menu } from '@/entities/menu/menu'
import type { MenuViewBusiness } from '@/shared/menu/MenuView'

/** What a customer's phone needs to draw one menu: the business details they may see, the menu, and the look (inside `business.theme`). */
export type PublicMenu = { business: MenuViewBusiness; menu: Menu }

/**
 * The seam between the public menu page and wherever menus are kept (a public read of the published menu, later). Nobody
 * is signed in: the answer holds only what a customer may see. A rejected promise means the call failed (the page offers
 * Retry); null means there is no menu at that link: unknown, not published, or paused.
 */
export interface PublicMenuRepository {
  get(slug: string): Promise<PublicMenu | null>
}
