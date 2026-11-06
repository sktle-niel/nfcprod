/** The parts of the Look tab, shown one at a time under the Light or dark choice. */
export const LOOK_PARTS = ['colors', 'extras'] as const
export type LookPart = (typeof LOOK_PARTS)[number]
