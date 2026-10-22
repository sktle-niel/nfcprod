import { styleTheme } from '@/entities/theme/styles'
import type { Preset } from './types'

/** Casual dining: photos, add-ons and sides for the meals, best sellers marked. Starts in the Diner style. */
export const casualDiningPreset: Preset = {
  type: 'casualDining',
  categories: ['Appetizers', 'Mains', 'Sides', 'Drinks', 'Desserts'],
  theme: styleTheme('diner', 'dark'),
  groups: [
    {
      name: 'Extras',
      required: false,
      min: 0,
      max: 3,
      options: [
        { label: 'Extra rice', price: 2500 },
        { label: 'Fried egg', price: 2000 },
        { label: 'Extra gravy', price: 1500 },
        { label: 'Cheese', price: 2500 },
      ],
    },
    {
      name: 'Side orders',
      required: false,
      min: 0,
      max: 2,
      options: [
        { label: 'Java rice', price: 3500 },
        { label: 'French fries', price: 6000 },
        { label: 'Coleslaw', price: 4500 },
        { label: 'Buttered vegetables', price: 5000 },
      ],
    },
  ],
  sizes: [],
  samples: [
    {
      category: 'Appetizers',
      name: 'Calamares',
      description: 'Crispy squid rings with spiced vinegar and garlic mayo.',
      price: 24500,
      tags: [],
    },
    {
      category: 'Mains',
      name: 'Chicken Inasal',
      description: 'Grilled chicken leg in calamansi, lemongrass and annatto oil, with rice.',
      price: 19500,
      tags: ['bestSeller'],
    },
    {
      category: 'Mains',
      name: 'Pork Sisig',
      description: 'Sizzling chopped pork with onions, chili and calamansi.',
      price: 23500,
      tags: ['spicy'],
    },
    { category: 'Sides', name: 'Garlic Rice', description: 'Rice fried with toasted garlic.', price: 4500, tags: [] },
    {
      category: 'Drinks',
      name: 'Calamansi Juice',
      description: 'Freshly squeezed and lightly sweetened.',
      price: 7500,
      tags: ['vegan'],
    },
    {
      category: 'Desserts',
      name: 'Halo-Halo',
      description: 'Shaved ice with sweet beans, leche flan, ube and evaporated milk.',
      price: 15000,
      tags: [],
    },
  ],
}
