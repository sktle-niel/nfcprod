import { samplePicturePath } from '@/entities/menu/samplePictures'

/**
 * The real photo of a preset's example item, chosen by eye, so a new menu starts with pictures and a picture-led template has
 * something to show from the first minute. The owner replaces them with their own. An item with no photo that fits has none here:
 * no picture beats the wrong dish.
 */
const PHOTOS: Readonly<Record<string, string>> = {
  Americano: 'cup-4',
  'Spanish Latte': 'cup-2',
  'Mocha Frappe': 'iced-4',
  'Iced Caramel Latte': 'iced-3',
  'Iced Caramel Macchiato': 'iced-3',
  Ensaymada: 'pastry-5',
  'Butter Croissant': 'pastry-1',
  'Classic Pearl Milk Tea': 'boba-1',
  'Wintermelon Milk Tea': 'boba-8',
  'Lychee Green Tea': 'iced-12',
  'Mango Passion Fruit Tea': 'iced-11',
  'Brown Sugar Fresh Milk': 'boba-9',
  Calamares: 'bowl-5',
  'Chicken Inasal': 'plate-2',
  'Pork Sisig': 'plate-10',
  'Sizzling Sisig': 'plate-10',
  'Garlic Rice': 'bowl-6',
  'Calamansi Juice': 'cocktail-3',
  'Calamansi Mojito': 'cocktail-3',
  'Craft IPA, pint': 'cocktail-4',
  'House White, glass': 'cocktail-5',
  'House Red, by the Glass': 'cocktail-6',
  'Short Rib Kare-Kare': 'plate-8',
  'Tablea Chocolate Tart': 'slice-5',
  'Seven-Course Tasting Menu': 'plate-5',
}

/** The photo of an example item by its name, or null when none fits. */
export function presetPhoto(name: string): string | null {
  const file = PHOTOS[name]
  return file === undefined ? null : samplePicturePath(file)
}
