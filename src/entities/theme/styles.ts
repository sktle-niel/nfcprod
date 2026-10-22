import type { BusinessType } from '@/entities/business/business'
import { DEFAULT_THEME, type Mode, type StyleId, type Theme } from './theme'

/** The colors a style has in one mode. `surface` null is the automatic card color. */
type Palette = Pick<Theme, 'primary' | 'secondary' | 'background' | 'surface'>

/** Everything a style sets besides colors and the mode: how the menu is drawn. */
type Choices = Omit<Theme, keyof Palette | 'mode' | 'style'>

export type StyleDef = {
  id: StyleId
  /** The kinds of business it suits. The picker says so in words (the design copy). */
  bestFor: readonly BusinessType[]
  /** The mode its look was made for. The other mode has a palette of the same family. */
  native: Mode
  choices: Choices
  palettes: Record<Mode, Palette>
}

const auto = null

/**
 * The ready-made looks. Each is a starting point: `styleTheme` gives the whole theme for a mode, and the owner can change any
 * choice afterwards. The palettes are tested (src/entities/theme/styles.test.ts): the text reads on the page at 4.5:1, the
 * accent has 3:1 on the page, and a dark mode has a dark page. Four styles default to a drawn texture (roast grain,
 * atelier plaster, gourmet marble, noir deco); their palettes are unchanged, and the texture audit covers every pairing.
 */
export const STYLES: Record<StyleId, StyleDef> = {
  classic: {
    id: 'classic',
    bestFor: ['coffee', 'milkTea', 'casualDining', 'fineDining', 'bakery', 'bar'],
    native: 'light',
    choices: {
      card: 'row',
      photo: 'rounded',
      title: 'plain',
      header: 'plain',
      decor: 'none',
      backdrop: 'plain',
      spotlight: false,
      font: 'urbanist',
      buttonStyle: 'rounded',
      layout: 'grid',
    },
    palettes: {
      light: { primary: DEFAULT_THEME.primary, secondary: DEFAULT_THEME.secondary, background: DEFAULT_THEME.background, surface: auto },
      dark: { primary: '#5b9bf5', secondary: '#eef2f9', background: '#11161f', surface: auto },
    },
  },
  roast: {
    id: 'roast',
    bestFor: ['coffee', 'milkTea', 'bakery'],
    native: 'dark',
    choices: {
      card: 'poster',
      photo: 'cutout',
      title: 'bullets',
      header: 'poster',
      decor: 'coffee',
      backdrop: 'grain',
      spotlight: false,
      font: 'playfair',
      buttonStyle: 'rounded',
      layout: 'list',
    },
    palettes: {
      light: { primary: '#8a4b1f', secondary: '#3b2418', background: '#f6ecdd', surface: auto },
      dark: { primary: '#e8b36a', secondary: '#f7ead8', background: '#4b2e22', surface: auto },
    },
  },
  atelier: {
    id: 'atelier',
    bestFor: ['coffee', 'milkTea', 'bakery'],
    native: 'dark',
    choices: {
      card: 'outline',
      photo: 'cutout',
      title: 'script',
      header: 'script',
      decor: 'coffee',
      backdrop: 'plaster',
      spotlight: true,
      font: 'urbanist',
      buttonStyle: 'pill',
      layout: 'list',
    },
    palettes: {
      light: { primary: '#a8723a', secondary: '#3a2316', background: '#f7efe4', surface: auto },
      dark: { primary: '#d9b17e', secondary: '#f8efe3', background: '#4a2a1c', surface: auto },
    },
  },
  sunny: {
    id: 'sunny',
    bestFor: ['coffee', 'milkTea', 'bakery'],
    native: 'light',
    choices: {
      card: 'badge',
      photo: 'cutout',
      title: 'ribbon',
      header: 'awning',
      decor: 'coffee',
      backdrop: 'paper',
      spotlight: false,
      font: 'fredoka',
      buttonStyle: 'pill',
      layout: 'grid',
    },
    palettes: {
      light: { primary: '#c2680f', secondary: '#3b2a1c', background: '#ebe3d5', surface: auto },
      dark: { primary: '#f0a650', secondary: '#f4e9d8', background: '#2d2118', surface: auto },
    },
  },
  editorial: {
    id: 'editorial',
    bestFor: ['coffee', 'casualDining', 'fineDining', 'bar'],
    native: 'light',
    choices: {
      card: 'tile',
      photo: 'cutout',
      title: 'ribbon',
      header: 'poster',
      decor: 'none',
      backdrop: 'plain',
      spotlight: true,
      font: 'playfair',
      buttonStyle: 'square',
      layout: 'grid',
    },
    palettes: {
      light: { primary: '#7a4a2b', secondary: '#1f1410', background: '#fbf8f3', surface: auto },
      dark: { primary: '#d1a572', secondary: '#f3e9de', background: '#1a110d', surface: auto },
    },
  },
  cocoa: {
    id: 'cocoa',
    bestFor: ['bakery', 'coffee', 'milkTea'],
    native: 'dark',
    choices: {
      card: 'soft',
      photo: 'cutout',
      title: 'rule',
      header: 'poster',
      decor: 'coffee',
      backdrop: 'plain',
      spotlight: false,
      font: 'dmSerif',
      buttonStyle: 'rounded',
      layout: 'list',
    },
    palettes: {
      light: { primary: '#a2541c', secondary: '#3b2418', background: '#f4eadb', surface: '#fffaf1' },
      dark: { primary: '#e08a3c', secondary: '#f6e9d8', background: '#3a2a24', surface: '#f3e6d3' },
    },
  },
  retro: {
    id: 'retro',
    bestFor: ['coffee', 'bar', 'bakery'],
    native: 'dark',
    choices: {
      card: 'leader',
      photo: 'cutout',
      title: 'rule',
      header: 'poster',
      decor: 'sparkles',
      backdrop: 'plain',
      spotlight: true,
      font: 'anton',
      buttonStyle: 'square',
      layout: 'list',
    },
    palettes: {
      light: { primary: '#b4571f', secondary: '#4a2a1a', background: '#f5e6c8', surface: auto },
      dark: { primary: '#e29a4a', secondary: '#ffe8c2', background: '#4d2a1f', surface: auto },
    },
  },
  gourmet: {
    id: 'gourmet',
    bestFor: ['fineDining', 'bar'],
    native: 'dark',
    choices: {
      card: 'plate',
      photo: 'circle',
      title: 'ornament',
      header: 'frame',
      decor: 'dining',
      backdrop: 'marble',
      spotlight: false,
      font: 'playfair',
      buttonStyle: 'square',
      layout: 'list',
    },
    palettes: {
      light: { primary: '#8a6a1f', secondary: '#1d3a2f', background: '#f6f1e4', surface: auto },
      dark: { primary: '#c9a45a', secondary: '#f3ead7', background: '#0f2e26', surface: auto },
    },
  },
  fresh: {
    id: 'fresh',
    bestFor: ['milkTea', 'casualDining', 'bakery', 'coffee'],
    native: 'light',
    choices: {
      card: 'tile',
      photo: 'circle',
      title: 'ribbon',
      header: 'plain',
      decor: 'leaves',
      backdrop: 'dots',
      spotlight: false,
      font: 'urbanist',
      buttonStyle: 'pill',
      layout: 'grid',
    },
    palettes: {
      light: { primary: '#3f9d5a', secondary: '#1f3a2a', background: '#f5faf2', surface: auto },
      dark: { primary: '#7bd08f', secondary: '#e7f4e8', background: '#0f2118', surface: auto },
    },
  },
  blush: {
    id: 'blush',
    bestFor: ['bakery', 'milkTea', 'coffee'],
    native: 'light',
    choices: {
      card: 'tile',
      photo: 'arch',
      title: 'script',
      header: 'script',
      decor: 'bakery',
      backdrop: 'dots',
      spotlight: false,
      font: 'dmSerif',
      buttonStyle: 'pill',
      layout: 'grid',
    },
    palettes: {
      light: { primary: '#c75b7a', secondary: '#4a2c3a', background: '#fdf3f0', surface: auto },
      dark: { primary: '#f08fab', secondary: '#fbe9ee', background: '#2b1a22', surface: auto },
    },
  },
  diner: {
    id: 'diner',
    bestFor: ['casualDining', 'bar', 'coffee'],
    native: 'dark',
    choices: {
      card: 'badge',
      photo: 'cutout',
      title: 'stripe',
      header: 'poster',
      decor: 'sparkles',
      backdrop: 'stripes',
      spotlight: false,
      font: 'anton',
      buttonStyle: 'rounded',
      layout: 'grid',
    },
    palettes: {
      light: { primary: '#d62828', secondary: '#2a1a10', background: '#fff6df', surface: auto },
      dark: { primary: '#ffc21a', secondary: '#fff7e0', background: '#161412', surface: auto },
    },
  },
  noir: {
    id: 'noir',
    bestFor: ['bar', 'fineDining'],
    native: 'dark',
    choices: {
      card: 'leader',
      photo: 'arch',
      title: 'ornament',
      header: 'frame',
      decor: 'bar',
      backdrop: 'deco',
      spotlight: false,
      font: 'playfair',
      buttonStyle: 'square',
      layout: 'list',
    },
    palettes: {
      light: { primary: '#8a6a1f', secondary: '#1b1b1b', background: '#f3eee3', surface: auto },
      dark: { primary: '#c7a14a', secondary: '#efe6d2', background: '#0d0d0f', surface: auto },
    },
  },
  catalog: {
    id: 'catalog',
    bestFor: ['bakery', 'coffee', 'casualDining'],
    native: 'light',
    choices: {
      card: 'tile',
      photo: 'rounded',
      title: 'rule',
      header: 'plain',
      decor: 'none',
      backdrop: 'plain',
      spotlight: false,
      font: 'urbanist',
      buttonStyle: 'rounded',
      layout: 'grid',
    },
    palettes: {
      light: { primary: '#3b6f5c', secondary: '#22262b', background: '#f7f6f2', surface: auto },
      dark: { primary: '#8cc4ae', secondary: '#eef1f2', background: '#14181a', surface: auto },
    },
  },
}

/** The whole theme of a style in a mode: its choices, its palette for that mode, and the style itself. */
export function styleTheme(id: StyleId, mode: Mode): Theme {
  const style = STYLES[id]
  return { ...style.choices, ...style.palettes[mode], style: id, mode }
}
