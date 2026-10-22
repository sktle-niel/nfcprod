import type { BusinessType } from '@/entities/business/business'

/** The flat illustrations a product shows while it has no picture. */
export const PLACEHOLDERS = ['cup', 'iced', 'boba', 'bowl', 'plate', 'pastry', 'slice', 'burger', 'cocktail'] as const
export type PlaceholderKind = (typeof PLACEHOLDERS)[number]

// What a kind of business serves, when nothing in the item's own words says otherwise.
const BY_TYPE: Record<BusinessType, PlaceholderKind> = {
  coffee: 'cup',
  milkTea: 'boba',
  casualDining: 'plate',
  fineDining: 'plate',
  bakery: 'pastry',
  bar: 'cocktail',
}

/** A word of the list, alone or in the plural ("cake", "cakes", "sandwiches"); never the middle of another word ("ice" in "rice"). */
const anyOf = (list: string) => new RegExp(`\\b(?:${list})(?:e?s)?\\b`, 'i')

// The first rule that matches wins, so the more specific kinds come before the broad ones ("ice cream" before "ice", a Filipino
// dish before "hot"). Only the words of the menu are read, never anything else.
const BY_WORDS: readonly [RegExp, PlaceholderKind][] = [
  [anyOf('boba|pearl|milk ?tea|tapioca|taro|brown sugar'), 'boba'],
  [anyOf('ice ?cream|gelato|sundae|sorbet'), 'slice'],
  [anyOf('iced|ice|cold|frapp(?:e|é|uccino)?|blended|shake|smoothie|slush(?:ie)?|juice|lemonade|soda|float|halo-?halo'), 'iced'],
  [anyOf('cocktail|mocktail|mojito|martini|margarita|negroni|whisk(?:e?y)?|wine|beer|spritz|sour|gin|rum|vodka|tequila|sangria'), 'cocktail'],
  [anyOf('cake|pie|tart|cheesecake|brownie|dessert|tiramisu|flan|leche|pudding'), 'slice'],
  [anyOf('croissant|bread|pastry|pastries|bun|donut|doughnut|cookie|muffin|scone|pandesal|ensaymada|loaf|bagel|waffle|pancake|toast|hopia|monay'), 'pastry'],
  [anyOf('\\w*burger|sandwich|fries|nuggets?|hot ?dog|wrap|club|shawarma|taco|panini'), 'burger'],
  [anyOf('soup|bowl|ramen|noodle|pasta|spaghetti|carbonara|lasagna|rice|salad|sinigang|stew|congee|lugaw|pancit|arroz|mami|lomi|goto|champorado|tinola|bulalo|nilaga'), 'bowl'],
  [anyOf('adobo|sisig|lechon|kare-?kare|kaldereta|menudo|tapa|silog|longganisa|bbq|inihaw|grill(?:ed)?|steak|chicken|pork|beef|fish|shrimp|crispy|pata|liempo|bangus|lumpia'), 'plate'],
  [anyOf('coffee|espresso|latte|cappuccino|americano|macchiato|mocha|flat white|cortado|tea|chai|matcha|hot'), 'cup'],
]

const kindOf = (text: string) => BY_WORDS.find(([pattern]) => pattern.test(text))?.[1]

/**
 * The illustration for a product without a picture: from the words of its name when they say what it is, else from its category,
 * else from the first kind of business of the menu, else a plate. The name goes first, so a "Latte" in "Coffee and pastries" is
 * still a cup.
 */
export function placeholderKind(
  words: { product: string; category: string },
  types: readonly BusinessType[] | undefined,
): PlaceholderKind {
  const first = types?.[0]
  return kindOf(words.product) ?? kindOf(words.category) ?? (first === undefined ? 'plate' : BY_TYPE[first])
}
