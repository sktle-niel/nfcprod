import { styleTheme } from '@/entities/theme/styles'
import type { Preset } from './types'

/** Coffee shop: hot, iced and blended drinks in three sizes, with extra shots, syrups and other milks. Starts in the Atelier style. */
export const coffeePreset: Preset = {
  type: 'coffee',
  categories: ['Hot', 'Iced', 'Blended', 'Pastries'],
  theme: styleTheme('atelier', 'dark'),
  groups: [
    {
      name: 'Extra shot',
      required: false,
      min: 0,
      max: 1,
      options: [
        { label: '1 extra shot', price: 4000 },
        { label: '2 extra shots', price: 8000 },
      ],
    },
    {
      name: 'Syrups',
      required: false,
      min: 0,
      max: 2,
      options: [
        { label: 'Vanilla', price: 3000 },
        { label: 'Caramel', price: 3000 },
        { label: 'Hazelnut', price: 3000 },
      ],
    },
    {
      name: 'Milk alternatives',
      required: false,
      min: 0,
      max: 1,
      options: [
        { label: 'Oat milk', price: 4500 },
        { label: 'Almond milk', price: 4500 },
        { label: 'Soy milk', price: 3500 },
      ],
    },
  ],
  sizes: ['S', 'M', 'L'],
  samples: [
    { category: 'Hot', name: 'Americano', description: 'A double shot of espresso with hot water.', price: 12000, tags: [] },
    {
      category: 'Hot',
      name: 'Spanish Latte',
      description: 'Espresso and steamed milk, sweetened with condensed milk.',
      price: 16500,
      tags: ['bestSeller'],
    },
    {
      category: 'Iced',
      name: 'Iced Caramel Macchiato',
      description: 'Vanilla milk over ice, topped with espresso and caramel.',
      price: 17500,
      tags: [],
    },
    {
      category: 'Blended',
      name: 'Mocha Frappe',
      description: 'Espresso, chocolate and milk blended with ice, with whipped cream.',
      price: 19500,
      tags: [],
    },
    {
      category: 'Pastries',
      name: 'Ensaymada',
      description: 'Soft brioche with butter, sugar and grated cheese.',
      price: 8500,
      tags: ['vegetarian'],
      sized: false,
    },
  ],
}
