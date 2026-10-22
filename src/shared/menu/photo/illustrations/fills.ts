/** The soft fill of an illustration: the drawing's own color, faint. Spread it on a shape that also keeps its outline. */
export const SOFT = { fill: 'currentColor', fillOpacity: 0.22 } as const
/** A stronger soft fill, for the small parts that carry the shape (pearls, an olive, a patty). */
export const DEEP = { fill: 'currentColor', fillOpacity: 0.35 } as const
