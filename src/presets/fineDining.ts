import { styleTheme } from '@/entities/theme/styles'
import type { Preset } from './types'

/** Fine dining: an elegant serif list with few photos, courses, wine pairings and long descriptions. Starts in the Gourmet style. */
export const fineDiningPreset: Preset = {
  type: 'fineDining',
  categories: ['Starters', 'Mains', 'Desserts', 'Wine', 'Tasting Menu'],
  theme: styleTheme('gourmet', 'dark'),
  groups: [
    {
      name: 'Doneness',
      required: true,
      min: 1,
      max: 1,
      options: [
        { label: 'Rare', price: 0 },
        { label: 'Medium rare', price: 0 },
        { label: 'Medium', price: 0 },
        { label: 'Medium well', price: 0 },
        { label: 'Well done', price: 0 },
      ],
    },
    {
      name: 'Wine pairing',
      required: false,
      min: 0,
      max: 1,
      options: [
        { label: 'Glass of red', price: 45000 },
        { label: 'Glass of white', price: 45000 },
        { label: 'Full pairing', price: 180000 },
      ],
    },
  ],
  sizes: [],
  samples: [
    {
      category: 'Starters',
      name: 'Tuna Kinilaw',
      description: 'Yellowfin tuna cured in coconut vinegar with calamansi, ginger and chili.',
      price: 48000,
      tags: ['glutenFree'],
    },
    {
      category: 'Mains',
      name: 'Short Rib Kare-Kare',
      description: 'Beef short rib braised for twelve hours, roasted peanut sauce and shrimp paste.',
      price: 125000,
      tags: ['bestSeller'],
    },
    {
      category: 'Desserts',
      name: 'Tablea Chocolate Tart',
      description: 'Dark tablea ganache, salted caramel and pili nut crumble.',
      price: 39000,
      tags: ['vegetarian'],
    },
    {
      category: 'Wine',
      name: 'House Red, by the Glass',
      description: "Ask about tonight's pour.",
      price: 45000,
      tags: [],
    },
    {
      category: 'Tasting Menu',
      name: 'Seven-Course Tasting Menu',
      description: 'A seasonal journey through Philippine produce. Wine pairing available.',
      price: 450000,
      tags: ['new'],
    },
  ],
}
