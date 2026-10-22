import { styleTheme } from '@/entities/theme/styles'
import type { Preset } from './types'

/** Bakery and dessert shop: breads and cakes, priced per piece or whole, with extras for cakes. Starts in the Blush style. */
export const bakeryPreset: Preset = {
  type: 'bakery',
  categories: ['Breads', 'Cakes', 'Pastries', 'Drinks'],
  theme: styleTheme('blush', 'light'),
  groups: [
    {
      name: 'Cake extras',
      required: false,
      min: 0,
      max: 3,
      options: [
        { label: 'Message on top', price: 5000 },
        { label: 'Candles', price: 2000 },
        { label: 'Gift box', price: 4000 },
      ],
    },
    {
      name: 'Spreads',
      required: false,
      min: 0,
      max: 2,
      options: [
        { label: 'Butter', price: 1500 },
        { label: 'Kaya', price: 2500 },
        { label: 'Ube halaya', price: 3000 },
      ],
    },
  ],
  sizes: [],
  samples: [
    {
      category: 'Breads',
      name: 'Pandesal, 10 pieces',
      description: 'Soft, lightly sweet rolls, baked every morning.',
      price: 5000,
      tags: ['bestSeller'],
    },
    {
      category: 'Breads',
      name: 'Ube Cheese Pandesal',
      description: 'Purple yam bread with a melting cheese center. Per piece.',
      price: 2500,
      tags: ['vegetarian'],
    },
    {
      category: 'Cakes',
      name: 'Ube Macapuno Cake, whole',
      description: 'Ube chiffon with macapuno strings and ube cream. Order a day ahead.',
      price: 85000,
      tags: [],
    },
    {
      category: 'Pastries',
      name: 'Egg Pie, slice',
      description: 'Creamy custard in a flaky crust.',
      price: 6500,
      tags: ['vegetarian'],
    },
    {
      category: 'Drinks',
      name: 'Tablea Hot Chocolate',
      description: 'Rich hot chocolate made from local cacao tablets.',
      price: 9500,
      tags: [],
    },
    {
      category: 'Drinks',
      name: 'Calamansi Juice',
      description: 'Freshly squeezed and lightly sweetened.',
      price: 6500,
      tags: ['vegan'],
    },
  ],
}
