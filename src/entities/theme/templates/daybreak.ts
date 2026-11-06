import { TEMPLATE_CHOICES, type StyleDef } from '../styleDef'

/**
 * Daybreak: a paper placemat printed in one ink. The page is warm paper, and the words, rules and pictures are all one deep coffee.
 * Dark is the same sheet at night: espresso paper, a cream ink. DM Serif Display sets the name as a fine shop would have it printed,
 * and carries the item names. Its page is drawn by src/shared/menu/templates/daybreak.
 */
export const STYLE: StyleDef = {
  id: 'daybreak',
  bestFor: ['coffee', 'milkTea', 'casualDining', 'bakery'],
  native: 'light',
  choices: { ...TEMPLATE_CHOICES, font: 'dmSerif', layout: 'list' },
  palettes: {
    light: { primary: '#8a5a3a', secondary: '#43281a', background: '#faf5ec', surface: null },
    dark: { primary: '#d0a27c', secondary: '#efdcc6', background: '#1b1410', surface: null },
  },
}
