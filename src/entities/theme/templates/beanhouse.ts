import { TEMPLATE_CHOICES, type StyleDef } from '../styleDef'

/**
 * Beanhouse: the kraft bag of a good roaster. Light is a soft unbleached kraft printed in two inks, a deep coffee and a brick red for the
 * seal and the marks, with cream paper labels. Dark is the black kraft some roasters use, printed in cream and caramel, with labels of
 * a dark paper so the page stays dim. Source Serif sets the name of each thing, Inter the reading. Its page is drawn by
 * src/shared/menu/templates/beanhouse.
 */
export const STYLE: StyleDef = {
  id: 'beanhouse',
  bestFor: ['coffee', 'milkTea', 'bakery'],
  native: 'light',
  choices: { ...TEMPLATE_CHOICES, font: 'sourceSerif', layout: 'list' },
  palettes: {
    light: { primary: '#7a3320', secondary: '#2e1c10', background: '#dcc7a6', surface: '#fbf6ec' },
    dark: { primary: '#cf9a6a', secondary: '#ecdcc3', background: '#1c1612', surface: '#2c221a' },
  },
}
