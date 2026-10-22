import { styleTheme } from '@/entities/theme/styles'
import type { Preset } from './types'

/** Milk tea and drinks: two sizes, sugar and ice levels picked every time, and toppings such as pearls and jelly. Starts in the Fresh style. */
export const milkTeaPreset: Preset = {
  type: 'milkTea',
  categories: ['Classics', 'Fruit Teas', 'Specials'],
  theme: styleTheme('fresh', 'light'),
  groups: [
    {
      name: 'Sugar level',
      required: true,
      min: 1,
      max: 1,
      options: [
        { label: '0%', price: 0 },
        { label: '25%', price: 0 },
        { label: '50%', price: 0 },
        { label: '75%', price: 0 },
        { label: '100%', price: 0 },
      ],
    },
    {
      name: 'Ice level',
      required: true,
      min: 1,
      max: 1,
      options: [
        { label: 'No ice', price: 0 },
        { label: 'Less ice', price: 0 },
        { label: 'Regular ice', price: 0 },
      ],
    },
    {
      name: 'Toppings',
      required: false,
      min: 0,
      max: 3,
      options: [
        { label: 'Pearls', price: 1500 },
        { label: 'Nata de coco', price: 1500 },
        { label: 'Coffee jelly', price: 2000 },
        { label: 'Grass jelly', price: 1500 },
        { label: 'Egg pudding', price: 2000 },
        { label: 'Cream cheese', price: 3000 },
      ],
    },
    {
      name: 'Milk alternatives',
      required: false,
      min: 0,
      max: 1,
      options: [
        { label: 'Oat milk', price: 4000 },
        { label: 'Coconut milk', price: 3000 },
      ],
    },
  ],
  sizes: ['M', 'L'],
  samples: [
    {
      category: 'Classics',
      name: 'Classic Pearl Milk Tea',
      description: 'Black tea with fresh milk and chewy brown sugar pearls.',
      price: 9900,
      tags: ['bestSeller'],
    },
    {
      category: 'Classics',
      name: 'Wintermelon Milk Tea',
      description: 'Mellow wintermelon syrup with black tea and milk.',
      price: 10500,
      tags: [],
    },
    {
      category: 'Fruit Teas',
      name: 'Lychee Green Tea',
      description: 'Jasmine green tea shaken with lychee and ice.',
      price: 11000,
      tags: ['vegan'],
    },
    {
      category: 'Fruit Teas',
      name: 'Mango Passion Fruit Tea',
      description: 'Green tea with real mango and passion fruit.',
      price: 11500,
      tags: ['new', 'vegan'],
    },
    {
      category: 'Specials',
      name: 'Brown Sugar Fresh Milk',
      description: 'Fresh milk over brown sugar syrup and warm pearls.',
      price: 13500,
      tags: [],
    },
  ],
}
