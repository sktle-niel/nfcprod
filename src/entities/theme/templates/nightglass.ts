import { TEMPLATE_CHOICES, type StyleDef } from '../styleDef'

/**
 * Night Glass: a lettered menu board on a back wall, under one lamp. Its page is drawn by src/shared/menu/templates/nightglass. Dark is its native
 * mode: a warm walnut-black board, cream lettering, and brass in the lamp light, the gilded name and the fine painted lines. The light palette is the
 * same board by day: pale putty paint with dark walnut lettering and a dark wooden frame.
 */
export const STYLE: StyleDef = {
  id: 'nightglass',
  bestFor: ['bar', 'fineDining', 'casualDining'],
  native: 'dark',
  choices: { ...TEMPLATE_CHOICES, font: 'dmSerif', layout: 'list' },
  palettes: {
    light: { primary: '#80531a', secondary: '#21170f', background: '#ebe1cd', surface: null },
    dark: { primary: '#c99a5b', secondary: '#f3e9da', background: '#18120c', surface: null },
  },
}
