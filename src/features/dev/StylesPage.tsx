import { useSearchParams } from 'react-router-dom'
import type { Business } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import { isHexColor, normalizeHex } from '@/entities/theme/color'
import { STYLES, styleTheme } from '@/entities/theme/styles'
import {
  BACKDROPS,
  BUTTON_STYLES,
  CARDS,
  DECORS,
  FONTS,
  HEADERS,
  LAYOUTS,
  MODES,
  PHOTOS,
  STYLE_IDS,
  TITLES,
  VEILS,
  type Mode,
  type StyleId,
  type Theme,
} from '@/entities/theme/theme'
import { mergePresets } from '@/presets'
import { startMenu } from '@/data/ownerMenu'
import { isOneOf } from '@/shared/lib/checks'
import { MenuView, type MenuViewBusiness } from '@/shared/menu/MenuView'
import { samplePhoto } from './samplePhotos'
import styles from './StylesPage.module.css'

/** A small hybrid menu for the gallery: coffee and bakery, with sizes, a best seller, a new item and one sold out. */
function sampleMenu(): Menu {
  let count = 0
  const menu = startMenu(mergePresets(['coffee', 'bakery']), true, () => `sample-${(count += 1)}`)
  const products = menu.products.map((product, index) => ({
    ...product,
    available: index !== 3,
    tags: index === 1 ? (['bestSeller'] as const).slice() : index === 4 ? (['new'] as const).slice() : product.tags,
  }))
  return { ...menu, products }
}

function businessIn(theme: Theme): MenuViewBusiness {
  const social: Business['social'] = { facebook: '', instagram: '', tiktok: '', website: '' }
  return {
    name: 'Kape Kanto',
    tagline: 'Coffee, tea and pastries on the corner',
    logo: null,
    phone: '+63 917 555 0142',
    address: '12 Mabini Street, Lahug, Cebu City',
    hours: 'Mon to Fri, 7 am to 9 pm\nSat and Sun, 8 am to 10 pm',
    social,
    theme,
    types: ['coffee', 'bakery'],
  }
}

/** One choice changed on top of a style: `?card=tile`, `?photo=circle`, `?font=playfair`, `?spotlight=1`, `?surface=%23f3e6d3`. */
function withOverrides(theme: Theme, params: URLSearchParams): Theme {
  const pick = <T extends string>(list: readonly T[], key: string, fallback: T): T => {
    const value = params.get(key)
    return isOneOf(list, value) ? value : fallback
  }
  const surface = params.get('surface')
  const primary = params.get('accent')
  const backdrop = pick(BACKDROPS, 'backdrop', theme.backdrop)
  return {
    ...theme,
    card: pick(CARDS, 'card', theme.card),
    photo: pick(PHOTOS, 'photo', theme.photo),
    title: pick(TITLES, 'title', theme.title),
    header: pick(HEADERS, 'header', theme.header),
    decor: pick(DECORS, 'decor', theme.decor),
    backdrop,
    // The photo backdrop needs a photo: the gallery lends a made-up one, so `?backdrop=picture&veil=strong` shows the veil.
    backdropPicture: backdrop === 'picture' ? samplePhoto(0) : theme.backdropPicture,
    backdropVeil: pick(VEILS, 'veil', theme.backdropVeil),
    font: pick(FONTS, 'font', theme.font),
    buttonStyle: pick(BUTTON_STYLES, 'buttons', theme.buttonStyle),
    layout: pick(LAYOUTS, 'layout', theme.layout),
    spotlight: params.has('spotlight') ? params.get('spotlight') === '1' : theme.spotlight,
    surface: isHexColor(surface) ? normalizeHex(surface) : theme.surface,
    primary: isHexColor(primary) ? normalizeHex(primary) : theme.primary,
  }
}

/**
 * Developers only (the route exists in development builds): every style in light and dark, drawn by the real menu renderer on
 * a small sample menu, each in a phone-wide column. `?style=roast` shows one style, `?mode=dark` one mode. Any other choice
 * can be changed on top: `card`, `photo`, `title`, `header`, `decor`, `backdrop` (`picture` borrows a made-up photo; `veil`
 * sets its strength), `font`, `buttons`, `layout`, `spotlight`
 * (1 or 0), `surface` and `accent` (a `#rrggbb` color, written %23rrggbb in the address). `?width=360` sets the phone width, and
 * `?photos=1` gives every item a made-up photo, to see how each picture shape crops a real one.
 */
export function StylesPage() {
  const [params] = useSearchParams()
  const only = params.get('style')
  const mode = params.get('mode')
  const ids: readonly StyleId[] = isOneOf(STYLE_IDS, only) ? [only] : STYLE_IDS
  const modes: readonly Mode[] = isOneOf(MODES, mode) ? [mode] : MODES
  const asked = Number(params.get('width'))
  const width = Number.isInteger(asked) && asked >= 280 && asked <= 900 ? asked : 390
  const menu = sampleMenu()
  if (params.get('photos') === '1') menu.products = menu.products.map((product, index) => ({ ...product, image: samplePhoto(index) }))

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Menu styles</h1>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(auto-fill, ${width}px)` }}>
        {ids.flatMap((id) =>
          modes.map((themeMode) => (
            <figure key={`${id}-${themeMode}`} className={styles.figure}>
              <figcaption className={styles.caption}>
                {id} / {themeMode}
                {STYLES[id].native === themeMode ? ' (native)' : ''}
              </figcaption>
              <div className={styles.phone} style={{ width }}>
                <MenuView business={businessIn(withOverrides(styleTheme(id, themeMode), params))} menu={menu} headingLevel={2} interactive={false} />
              </div>
            </figure>
          )),
        )}
      </div>
    </main>
  )
}
