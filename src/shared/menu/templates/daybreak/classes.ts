/** The class names that are set, joined: a step of the opening is left out in the preview. */
export const joined = (...names: (string | undefined)[]) => names.filter(Boolean).join(' ')
