import { TEMPLATE_CHOICES, type StyleDef } from '../styleDef'

/**
 * Drip: a coffeehouse price list. Warm paper, deep chocolate (sampled from the reference: #361f12) for the words, and the same
 * chocolate as the card color (`surface`) for the band that opens the page, its poured edge and the Visit section that closes it. The
 * accent is a roasted brown, for the mark on the category line. The dark mode is the same family at night: dark roast paper, a
 * slightly lighter band, cream words, a caramel mark. A text serif sets the list. The page is drawn by src/shared/menu/templates/drip.
 */
export const STYLE: StyleDef = {
  id: 'drip',
  bestFor: ['coffee', 'milkTea', 'bakery'],
  native: 'light',
  choices: { ...TEMPLATE_CHOICES, font: 'sourceSerif', layout: 'list' },
  palettes: {
    light: { primary: '#8a5428', secondary: '#361f12', background: '#fbf6ee', surface: '#361f12' },
    dark: { primary: '#c98a4b', secondary: '#f1e4d6', background: '#1b120c', surface: '#3d2819' },
  },
}
