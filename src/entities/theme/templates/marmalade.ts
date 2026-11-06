import { TEMPLATE_CHOICES, type StyleDef } from '../styleDef'

/**
 * Marmalade: a fine old shop sign. The card color is the deep paint of the fascia and of the Visit board, marmalade peel by day and
 * a shade above the wall at night. The accent is the gilt that lines them out, 3:1 on the cream wall, and the boards lift it toward
 * their letters. Its page is drawn by src/shared/menu/templates/marmalade.
 */
export const STYLE: StyleDef = {
  id: 'marmalade',
  bestFor: ['casualDining', 'milkTea'],
  native: 'light',
  choices: { ...TEMPLATE_CHOICES, font: 'dmSerif', layout: 'list' },
  palettes: {
    light: { primary: '#b87210', secondary: '#2c1a11', background: '#f8f0e2', surface: '#34180e' },
    dark: { primary: '#dca04a', secondary: '#f4e7d2', background: '#1b0f09', surface: '#2a160d' },
  },
}
