import { styleTheme } from '@/entities/theme/styles'
import type { Preset } from './types'

/** Bar or resto-bar: a dark list of drinks by the glass or bottle, and pulutan to share. Starts in the Noir style. */
export const barPreset: Preset = {
  type: 'bar',
  categories: ['Cocktails', 'Beer', 'Wine', 'Pulutan'],
  theme: styleTheme('noir', 'dark'),
  groups: [
    {
      name: 'Mixers',
      required: false,
      min: 0,
      max: 1,
      options: [
        { label: 'Cola', price: 4000 },
        { label: 'Lemon-lime soda', price: 4000 },
        { label: 'Tonic water', price: 6000 },
        { label: 'Soda water', price: 4000 },
      ],
    },
    {
      name: 'Dips',
      required: false,
      min: 0,
      max: 2,
      options: [
        { label: 'Spiced vinegar', price: 0 },
        { label: 'Garlic mayo', price: 3000 },
        { label: 'Cheese dip', price: 4500 },
      ],
    },
  ],
  sizes: [],
  samples: [
    {
      category: 'Cocktails',
      name: 'Calamansi Mojito',
      description: 'White rum, calamansi, mint and soda.',
      price: 22000,
      tags: ['bestSeller'],
    },
    { category: 'Beer', name: 'Pale Pilsen, bottle', description: 'Ice-cold local pilsen.', price: 9000, tags: [] },
    {
      category: 'Beer',
      name: 'Craft IPA, pint',
      description: 'Hoppy and citrusy, from a local brewery.',
      price: 18000,
      tags: ['new'],
    },
    {
      category: 'Wine',
      name: 'House White, glass',
      description: 'Crisp and dry. Ask for the bottle price.',
      price: 28000,
      tags: [],
    },
    {
      category: 'Pulutan',
      name: 'Sizzling Sisig',
      description: 'Chopped pork, chili and onions on a hot plate, topped with an egg.',
      price: 28000,
      tags: ['spicy', 'bestSeller'],
    },
    {
      category: 'Pulutan',
      name: 'Chicharon Bulaklak',
      description: 'Crispy pork ruffle fat with spiced vinegar.',
      price: 26000,
      tags: [],
    },
  ],
}
