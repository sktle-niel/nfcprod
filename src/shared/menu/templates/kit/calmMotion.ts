/** True when the person asked for calm motion: scrolls then jump, and nothing makes an entrance. */
export const calmMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
