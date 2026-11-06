import { TEMPLATE_CHOICES, type StyleDef } from '../styleDef'

/**
 * Sandstone: a printed carte on pale sand paper, in one deep warm ink. The browns come from the owner's reference. Dark is
 * the same card at night: a chocolate stock, a sand ink. Instrument Serif is the one pairing that is a serif for the name and the
 * text alike, with a true italic. Its page is drawn by src/shared/menu/templates/sandstone.
 */
export const STYLE: StyleDef = {
  id: 'sandstone',
  bestFor: ['fineDining', 'bakery'],
  native: 'light',
  choices: { ...TEMPLATE_CHOICES, font: 'instrumentSerif', layout: 'list' },
  palettes: {
    light: { primary: '#7a4420', secondary: '#38190a', background: '#f4ead9', surface: null },
    dark: { primary: '#d8a878', secondary: '#f0dfc6', background: '#241710', surface: null },
  },
}
