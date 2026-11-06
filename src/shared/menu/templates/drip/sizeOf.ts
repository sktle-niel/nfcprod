/** The size step of a name or a title: it comes down with the length, so a long one wraps in two lines instead of running off a phone. */
export const sizeOf = (name: string) => (name.length <= 12 ? 'l' : name.length <= 22 ? 'm' : 's')
