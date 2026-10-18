/** Picks the copy for one or for many and fills in {n}: 3 with { one: '1 card', many: '{n} cards' } gives "3 cards". */
export function plural(count: number, forms: { readonly one: string; readonly many: string }): string {
  return (count === 1 ? forms.one : forms.many).replace('{n}', String(count))
}
