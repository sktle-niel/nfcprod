/**
 * The product photos of the demo menus (public/sample, Pexels, free to use, credited in CREDITS.md). Only the demo's own sample
 * businesses carry one: an owner's picture is an upload. The renderer shows one of these paths only when it is exactly one of
 * the files below (`samplePicture`), so no other same-origin path can ever be a product picture.
 */
export const SAMPLE_KINDS = ['cup', 'iced', 'boba', 'bowl', 'plate', 'pastry', 'slice', 'burger', 'cocktail'] as const
export type SampleKind = (typeof SAMPLE_KINDS)[number]

export type SamplePicture = {
  /** The file, without folder or extension: `/sample/{file}.jpg`. */
  file: string
  /** What the photo shows, in the words of the placeholder illustrations. */
  kind: SampleKind
  photographer: string
  /** The Pexels page of the photo. */
  page: string
}

export const SAMPLE_PICTURES: readonly SamplePicture[] = [
  { file: 'cup-1', kind: 'cup', photographer: 'Porapak Apichodilok', page: 'https://www.pexels.com/photo/beverage-cafe-caffeine-cappuccino-360200/' },
  { file: 'cup-2', kind: 'cup', photographer: 'Pixabay', page: 'https://www.pexels.com/photo/cup-of-coffee-on-saucer-459489/' },
  { file: 'cup-3', kind: 'cup', photographer: 'Magda Ehlers', page: 'https://www.pexels.com/photo/artistic-latte-with-heart-latte-art-on-wooden-table-31139336/' },
  { file: 'cup-4', kind: 'cup', photographer: 'Ro han', page: 'https://www.pexels.com/photo/clear-glass-mug-with-brown-liquid-3644476/' },
  { file: 'cup-5', kind: 'cup', photographer: 'Magda Ehlers', page: 'https://www.pexels.com/photo/artistic-latte-with-heart-latte-art-on-wooden-table-31139336/' },
  { file: 'cup-6', kind: 'cup', photographer: 'Rania Alsahabi', page: 'https://www.pexels.com/photo/white-ceramic-cup-with-coffee-6747870/' },
  { file: 'cup-7', kind: 'cup', photographer: 'Tata N.', page: 'https://www.pexels.com/photo/a-matcha-latte-and-a-fruit-juice-on-a-table-12201275/' },
  { file: 'iced-1', kind: 'iced', photographer: 'Federica Gioia', page: 'https://www.pexels.com/photo/iced-latte-in-glass-11136849/' },
  { file: 'iced-2', kind: 'iced', photographer: 'solod_sha', page: 'https://www.pexels.com/photo/coffee-with-ice-on-wooden-tray-8605909/' },
  { file: 'iced-3', kind: 'iced', photographer: 'mehmetography', page: 'https://www.pexels.com/photo/refreshing-cold-brew-coffee-on-rustic-table-33241858/' },
  { file: 'iced-4', kind: 'iced', photographer: 'Sóc Năng Động', page: 'https://www.pexels.com/photo/refreshing-iced-coffee-in-textured-glass-outdoors-38127780/' },
  { file: 'iced-5', kind: 'iced', photographer: 'Nguyen Huy', page: 'https://www.pexels.com/photo/a-glass-with-iced-coffee-and-a-paper-straw-18837471/' },
  { file: 'iced-6', kind: 'iced', photographer: 'solod_sha', page: 'https://www.pexels.com/photo/coffee-with-ice-on-wooden-tray-8605909/' },
  { file: 'iced-7', kind: 'iced', photographer: 'T DW', page: 'https://www.pexels.com/photo/clear-highball-glass-with-iced-tea-1484678/' },
  { file: 'iced-8', kind: 'iced', photographer: 'Darina Belonogova', page: 'https://www.pexels.com/photo/matcha-powder-on-the-table-8004567/' },
  { file: 'iced-9', kind: 'iced', photographer: 'Jordan Benton', page: 'https://www.pexels.com/photo/coffee-with-cream-in-a-plastic-cup-15086185/' },
  { file: 'iced-10', kind: 'iced', photographer: 'Diego Romero', page: 'https://www.pexels.com/photo/sweet-shakes-in-glasses-17558646/' },
  { file: 'iced-11', kind: 'iced', photographer: 'Nanda Mends', page: 'https://www.pexels.com/photo/refreshing-mango-juice-in-glass-pitcher-30620864/' },
  { file: 'iced-12', kind: 'iced', photographer: 'Sóc Năng Động', page: 'https://www.pexels.com/photo/refreshing-iced-tea-with-lychee-and-mint-garnish-32002921/' },
  { file: 'boba-1', kind: 'boba', photographer: 'Shameel mukkath', page: 'https://www.pexels.com/photo/fruit-shake-with-tapioca-pearls-on-tall-glass-11160112/' },
  { file: 'boba-2', kind: 'boba', photographer: 'Amar Preciado', page: 'https://www.pexels.com/photo/drink-in-a-glass-8911656/' },
  { file: 'boba-3', kind: 'boba', photographer: 'Augustinus Martinus Noppé', page: 'https://www.pexels.com/photo/milkshake-in-close-up-photography-14333988/' },
  { file: 'boba-4', kind: 'boba', photographer: 'Kim Cruz', page: 'https://www.pexels.com/photo/clear-plastic-cup-with-brown-liquid-and-ice-4071422/' },
  { file: 'boba-5', kind: 'boba', photographer: 'Shameel mukkath', page: 'https://www.pexels.com/photo/a-milk-tea-drink-with-a-red-straw-11160121/' },
  { file: 'boba-6', kind: 'boba', photographer: 'Tata N.', page: 'https://www.pexels.com/photo/a-matcha-latte-and-a-fruit-juice-on-a-table-12201275/' },
  { file: 'boba-7', kind: 'boba', photographer: 'Alberto Lara', page: 'https://www.pexels.com/photo/creamy-boba-milk-tea-with-whipped-topping-35727299/' },
  { file: 'boba-8', kind: 'boba', photographer: 'Telly Mina', page: 'https://www.pexels.com/photo/milk-teas-with-tapioca-pearls-12666754/' },
  { file: 'boba-9', kind: 'boba', photographer: 'Telly Mina', page: 'https://www.pexels.com/photo/cups-with-boba-tea-12666797/' },
  { file: 'bowl-1', kind: 'bowl', photographer: 'Ahmad No More', page: 'https://www.pexels.com/photo/jeera-rice-in-bowl-7593253/' },
  { file: 'bowl-2', kind: 'bowl', photographer: 'SpotwizardLee', page: 'https://www.pexels.com/photo/close-up-photo-of-food-in-bowl-9110581/' },
  { file: 'bowl-3', kind: 'bowl', photographer: 'Gans Art', page: 'https://www.pexels.com/photo/food-in-a-bowl-7024389/' },
  { file: 'bowl-4', kind: 'bowl', photographer: 'Nunun Dy', page: 'https://www.pexels.com/photo/traditional-indonesian-laksa-with-shrimp-36359896/' },
  { file: 'bowl-5', kind: 'bowl', photographer: 'Shameel mukkath', page: 'https://www.pexels.com/photo/calamari-on-bowl-with-parsley-garnish-11160096/' },
  { file: 'bowl-6', kind: 'bowl', photographer: 'makafood', page: 'https://www.pexels.com/photo/a-white-rice-on-a-stainless-bowl-8956718/' },
  { file: 'bowl-7', kind: 'bowl', photographer: 'Valeria Boltneva', page: 'https://www.pexels.com/photo/gourmet-burrata-with-tomato-sauce-dish-29380175/' },
  { file: 'bowl-8', kind: 'bowl', photographer: 'Nguyen Truong Khang', page: 'https://www.pexels.com/photo/36126348/' },
  { file: 'plate-1', kind: 'plate', photographer: 'Novkov Visuals', page: 'https://www.pexels.com/photo/delicious-italian-pasta-caprese-on-white-plate-34636452/' },
  { file: 'plate-2', kind: 'plate', photographer: 'Jordan Rushton', page: 'https://www.pexels.com/photo/cooked-food-on-white-ceramic-plate-13289926/' },
  { file: 'plate-3', kind: 'plate', photographer: 'Shameel mukkath', page: 'https://www.pexels.com/photo/close-up-shot-of-fresh-vegetable-salad-on-ceramic-plate-14774565/' },
  { file: 'plate-4', kind: 'plate', photographer: 'Alexander Mass', page: 'https://www.pexels.com/photo/grilled-steak-on-rustic-plate-with-sauce-39836888/' },
  { file: 'plate-5', kind: 'plate', photographer: 'Szymon Shields', page: 'https://www.pexels.com/photo/gourmet-plated-food-on-elegant-table-setting-30469692/' },
  { file: 'plate-6', kind: 'plate', photographer: 'Szymon Shields', page: 'https://www.pexels.com/photo/elegant-fine-dining-dish-with-rich-broth-37400027/' },
  { file: 'plate-7', kind: 'plate', photographer: 'Nano Erdozain', page: 'https://www.pexels.com/photo/gourmet-steak-dish-with-edible-flower-garnish-29138854/' },
  { file: 'plate-8', kind: 'plate', photographer: 'Change C.C', page: 'https://www.pexels.com/photo/elegant-fine-dining-table-setting-with-gourmet-dishes-36694451/' },
  { file: 'plate-9', kind: 'plate', photographer: 'Airam Dato-on', page: 'https://www.pexels.com/photo/delicious-filipino-lumpia-with-dipping-sauce-33712072/' },
  { file: 'plate-10', kind: 'plate', photographer: 'Mark John Hilario', page: 'https://www.pexels.com/photo/sizzling-sisig-with-steamed-rice-on-hotplate-30355484/' },
  { file: 'plate-11', kind: 'plate', photographer: 'Giovanna Kamimura', page: 'https://www.pexels.com/photo/spicy-tofu-and-ground-pork-bowl-with-vegetables-31962200/' },
  { file: 'plate-12', kind: 'plate', photographer: 'Elmer Domingo', page: 'https://www.pexels.com/photo/delicious-filipino-tapsilog-breakfast-bowl-36566222/' },
  { file: 'plate-13', kind: 'plate', photographer: 'Eyes2Soul Eyes2Soul', page: 'https://www.pexels.com/photo/pan-seared-scallops-with-grilled-fish-on-plate-29075862/' },
  { file: 'plate-14', kind: 'plate', photographer: 'Max Griss', page: 'https://www.pexels.com/photo/photo-of-risotto-on-a-black-and-white-plate-6406460/' },
  { file: 'plate-15', kind: 'plate', photographer: 'Natalia S', page: 'https://www.pexels.com/photo/grilled-lamb-chops-with-side-dishes-outdoors-32263525/' },
  { file: 'pastry-1', kind: 'pastry', photographer: 'Abdulrhman Alkady', page: 'https://www.pexels.com/photo/close-up-photo-of-croissant-3892469/' },
  { file: 'pastry-2', kind: 'pastry', photographer: 'Andréa Devillier', page: 'https://www.pexels.com/photo/colorful-sprinkled-donuts-with-pink-background-35081225/' },
  { file: 'pastry-3', kind: 'pastry', photographer: 'Andrea Perez', page: 'https://www.pexels.com/photo/delicious-chocolate-chip-muffins-on-plate-30387798/' },
  { file: 'pastry-4', kind: 'pastry', photographer: 'Kevin Early', page: 'https://www.pexels.com/photo/freshly-baked-bread-rolls-in-basket-36086698/' },
  { file: 'pastry-5', kind: 'pastry', photographer: 'Lucie Liz', page: 'https://www.pexels.com/photo/powdered-sugar-coated-bread-on-plate-3256809/' },
  { file: 'pastry-6', kind: 'pastry', photographer: 'Maurício Mascaro', page: 'https://www.pexels.com/photo/a-plate-of-chocolate-chip-cookies-8081573/' },
  { file: 'slice-1', kind: 'slice', photographer: 'Elli', page: 'https://www.pexels.com/photo/slice-cake-1854652/' },
  { file: 'slice-2', kind: 'slice', photographer: 'Jonathan Reynaga', page: 'https://www.pexels.com/photo/cheesecake-with-a-juicy-glaze-17429510/' },
  { file: 'slice-3', kind: 'slice', photographer: 'Arian Fernandez', page: 'https://www.pexels.com/photo/a-piece-of-chocolate-cake-with-mint-on-top-26838690/' },
  { file: 'slice-4', kind: 'slice', photographer: 'Spencer Davis', page: 'https://www.pexels.com/photo/delicious-ice-cream-on-plate-with-apple-pie-4340676/' },
  { file: 'slice-5', kind: 'slice', photographer: 'Change C.C', page: 'https://www.pexels.com/photo/gourmet-dessert-plate-with-rich-chocolate-sauce-28561583/' },
  { file: 'slice-6', kind: 'slice', photographer: 'Ayub Abdul Rahman', page: 'https://www.pexels.com/photo/pudding-caramel-on-ceramic-plate-14665242/' },
  { file: 'slice-7', kind: 'slice', photographer: 'Kerri Sam', page: 'https://www.pexels.com/photo/delicious-homemade-banana-bread-slices-on-wooden-board-33739660/' },
  { file: 'burger-1', kind: 'burger', photographer: 'Israel Albornoz', page: 'https://www.pexels.com/photo/close-up-of-a-hamburger-on-black-background-12034622/' },
  { file: 'burger-2', kind: 'burger', photographer: 'Vinícius Caricatte', page: 'https://www.pexels.com/photo/close-up-shot-of-beef-burgers-8162589/' },
  { file: 'burger-3', kind: 'burger', photographer: 'Nano Erdozain', page: 'https://www.pexels.com/photo/sandwiches-on-plate-19202829/' },
  { file: 'burger-4', kind: 'burger', photographer: 'Ali Dashti', page: 'https://www.pexels.com/photo/french-fries-in-a-box-on-a-pink-background-27758755/' },
  { file: 'cocktail-1', kind: 'cocktail', photographer: 'Marilena Baltzaki', page: 'https://www.pexels.com/photo/glass-of-espresso-martini-15082369/' },
  { file: 'cocktail-2', kind: 'cocktail', photographer: 'Szymon Shields', page: 'https://www.pexels.com/photo/vibrant-cocktail-with-grilled-garnish-in-tokyo-bar-36189466/' },
  { file: 'cocktail-3', kind: 'cocktail', photographer: 'Hameen Reynolds', page: 'https://www.pexels.com/photo/refreshing-mojito-by-the-poolside-32206893/' },
  { file: 'cocktail-4', kind: 'cocktail', photographer: 'Olia Nayda', page: 'https://www.pexels.com/photo/close-up-photo-of-beer-in-a-drinking-glass-10818336/' },
  { file: 'cocktail-5', kind: 'cocktail', photographer: 'Marion Batteur', page: 'https://www.pexels.com/photo/pouring-white-wine-into-a-glass-with-dark-background-30279443/' },
  { file: 'cocktail-6', kind: 'cocktail', photographer: 'Bastian Riccardi', page: 'https://www.pexels.com/photo/wineglass-of-fine-red-wine-on-black-background-6058230/' },
]

const pathOf = (picture: SamplePicture) => `/sample/${picture.file}.jpg`
const PATHS: ReadonlySet<string> = new Set(SAMPLE_PICTURES.map(pathOf))

/** The address to draw when `value` is exactly the path of one of the sample photos, otherwise null. */
export function samplePicture(value: unknown): string | null {
  return typeof value === 'string' && PATHS.has(value) ? value : null
}

/** The path of a sample photo by its file name. A name that is not in the list is a mistake in the data and throws. */
export function samplePicturePath(file: string): string {
  const path = `/sample/${file}.jpg`
  if (!PATHS.has(path)) throw new RangeError(`no sample photo "${file}"`)
  return path
}

/**
 * The path of the `n`th (from 0) sample photo of a kind, going round when there are fewer photos than items, so the items of
 * one category do not all show the same picture while the library has more than one.
 */
export function samplePictureFor(kind: SampleKind, n: number): string {
  const ofKind = SAMPLE_PICTURES.filter((picture) => picture.kind === kind)
  const picture = ofKind[((n % ofKind.length) + ofKind.length) % ofKind.length] ?? SAMPLE_PICTURES[0]
  return pathOf(picture as SamplePicture)
}
