import { TEMPLATE_CHOICES, type StyleDef } from '../styleDef'

/**
 * Lightbox: a calm gallery of the food. Its page is drawn by src/shared/menu/templates/lightbox, which uses the palette roles in its own
 * way. Light is a warm off-white with an espresso ink; dark is a deep espresso with a cream ink. The wall and the panels are mixed from
 * those two by the page, which is why the card color stays automatic: the Light or dark control only has the page and text pair to keep
 * whole. The accent is brass: the price line, the mark under the category, the underlines, the focus ring.
 */
export const STYLE: StyleDef = {
  id: 'lightbox',
  bestFor: ['coffee', 'milkTea', 'casualDining', 'bakery'],
  native: 'light',
  choices: { ...TEMPLATE_CHOICES, font: 'sourceSerif', layout: 'list' },
  palettes: {
    light: { primary: '#8c5e25', secondary: '#2c2018', background: '#fbf7f0', surface: null },
    dark: { primary: '#c99a5b', secondary: '#f2e9dc', background: '#1a1310', surface: null },
  },
}
