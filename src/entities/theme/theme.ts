import { isDarkColor } from './color'

/** Font pairings the app ships, by name (display, body and script together). No other font name ever reaches a style. */
export const FONTS = ['urbanist', 'instrumentSerif', 'system', 'playfair', 'dmSerif', 'anton', 'fredoka', 'pacifico'] as const
export type Font = (typeof FONTS)[number]

/** The corner of the menu's buttons and chips. */
export const BUTTON_STYLES = ['rounded', 'square', 'pill'] as const
export type ButtonStyle = (typeof BUTTON_STYLES)[number]

/** How products are laid out on the public menu: columns for the card kinds that can do both. */
export const LAYOUTS = ['grid', 'list'] as const
export type Layout = (typeof LAYOUTS)[number]

/** Light or dark menu. Switching it (`withMode`) moves the page and text colors when the page does not suit the new mode. */
export const MODES = ['light', 'dark'] as const
export type Mode = (typeof MODES)[number]

/** The ready-made looks an owner starts from. Each one sets every choice below (`styleTheme` in styles.ts). */
export const STYLE_IDS = [
  'classic',
  'roast',
  'atelier',
  'sunny',
  'editorial',
  'cocoa',
  'retro',
  'gourmet',
  'fresh',
  'blush',
  'diner',
  'noir',
  'catalog',
] as const
export type StyleId = (typeof STYLE_IDS)[number]

/** How one product is drawn. */
export const CARDS = ['row', 'leader', 'tile', 'badge', 'outline', 'soft', 'plate', 'poster'] as const
export type CardKind = (typeof CARDS)[number]

/** The shape of a product picture. `cutout` has no frame and is made for pictures with a transparent background. */
export const PHOTOS = ['rounded', 'circle', 'arch', 'cutout'] as const
export type PhotoShape = (typeof PHOTOS)[number]

/** How a category name is drawn. */
export const TITLES = ['plain', 'bullets', 'script', 'ribbon', 'ornament', 'rule', 'stripe'] as const
export type TitleKind = (typeof TITLES)[number]

/** The top of the menu: logo, name and tagline. */
export const HEADERS = ['plain', 'awning', 'poster', 'script', 'frame'] as const
export type HeaderKind = (typeof HEADERS)[number]

/** The line-art set drawn in the corners of the menu. */
export const DECORS = ['none', 'coffee', 'leaves', 'dining', 'bakery', 'bar', 'sparkles'] as const
export type DecorKind = (typeof DECORS)[number]

/**
 * The texture of the page, in picker order. The first five are drawn by the menu's CSS; the rest are textures drawn from
 * the palette by `backdropLayers` (backdrop.ts) and reach CSS as one variable. 'picture' is the owner's own photo under a
 * veil of the page color (`pictureBackdropImage`), shown only while `backdropPicture` holds a checked address.
 */
export const BACKDROPS = [
  'plain',
  'paper',
  'dots',
  'stripes',
  'glow',
  'grain',
  'plaster',
  'marble',
  'linen',
  'weave',
  'terrazzo',
  'waves',
  'arches',
  'deco',
  'gingham',
  'check',
  'topo',
  'bloom',
  'picture',
] as const
export type BackdropKind = (typeof BACKDROPS)[number]

/** How strongly a photo backdrop shows through its veil of the page color, from barely to clearly. */
export const VEILS = ['faint', 'soft', 'strong'] as const
export type Veil = (typeof VEILS)[number]

/**
 * What makes one business menu look different from another. Plain values only: colors are `#rrggbb`, the rest come
 * from the lists above. It becomes CSS variables through a pure function (`toCssVars`), never raw CSS from text.
 */
export type Theme = {
  /**
   * The accent: the bar beside each category name, the line under the category links, the outline of labels such as Best
   * seller, the keyboard focus ring, and (moved the least that is needed) the fill behind price badges and label chips.
   * Never the color of text, so it needs 3:1 on the page and no text color of its own.
   */
  primary: string
  /** The text color, drawn on `background`. */
  secondary: string
  /** The color of the page. */
  background: string
  /**
   * The color of cards and panels, or null for the automatic one (white on a light page, the page lifted a little on a dark
   * one). The text on a card is picked to read on it, whatever the page text color is.
   */
  surface: string | null
  /** The ready-made look the other choices started from, for the picker to mark. The renderer reads only the choices. */
  style: StyleId
  card: CardKind
  photo: PhotoShape
  title: TitleKind
  header: HeaderKind
  decor: DecorKind
  backdrop: BackdropKind
  /**
   * The owner's own page photo, drawn only while `backdrop` is 'picture': a data address from a checked upload, or an
   * https address on the picture storage. It goes through the same checks as every picture (`checkImageAddress`,
   * `pictureSrc`), and `toCssVars` refuses any address that could not sit inside url("...").
   */
  backdropPicture: string | null
  /** How strongly the photo shows through the veil of the page color over it. */
  backdropVeil: Veil
  /** Show the first best seller big at the top. */
  spotlight: boolean
  font: Font
  buttonStyle: ButtonStyle
  layout: Layout
  mode: Mode
}

/** The Classic look in light mode: what a menu is before an owner chooses anything. */
export const DEFAULT_THEME: Theme = {
  primary: '#2f80ed',
  secondary: '#19202b',
  background: '#ffffff',
  surface: null,
  style: 'classic',
  card: 'row',
  photo: 'rounded',
  title: 'plain',
  header: 'plain',
  decor: 'none',
  backdrop: 'plain',
  backdropPicture: null,
  backdropVeil: 'soft',
  spotlight: false,
  font: 'urbanist',
  buttonStyle: 'rounded',
  layout: 'grid',
  mode: 'light',
}

/** The page and text colors of a theme: the pair that follows a switch between light and dark. */
export type ModeColors = Pick<Theme, 'background' | 'secondary'>

const MODE_COLORS: Record<Mode, ModeColors> = {
  light: { background: DEFAULT_THEME.background, secondary: DEFAULT_THEME.secondary },
  // A blue-black page with soft white text. The default accent still has 3:1 on it.
  dark: { background: '#11161f', secondary: '#eef2f9' },
}

/** The page and text colors a menu starts with in `mode`. */
export function modeDefaults(mode: Mode): ModeColors {
  return { ...MODE_COLORS[mode] }
}

/**
 * The theme in `mode`. The page decides: a dark menu is one whose page color is dark. When the page already suits `mode` the
 * owner's page and text colors stay as they are. When it does not (a cream page asked to be dark, a near-black page asked
 * to be light) page and text move to `remembered`, the owner's own pair for that mode, or to the plain defaults. The
 * accent and everything else stay. A page color that is not a color yet (half typed) only changes `mode`.
 */
export function withMode(theme: Theme, mode: Mode, remembered?: ModeColors): Theme {
  const dark = isDarkColor(theme.background)
  if (dark === null || dark === (mode === 'dark')) return { ...theme, mode }
  const pair = remembered && isDarkColor(remembered.background) === (mode === 'dark') ? { ...remembered } : modeDefaults(mode)
  return { ...theme, ...pair, mode }
}
