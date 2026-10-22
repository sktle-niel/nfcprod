/** The parts of the Look tab, shown one at a time under the styles. */
export const LOOK_PARTS = ['colors', 'cards', 'headings', 'extras'] as const
export type LookPart = (typeof LOOK_PARTS)[number]
