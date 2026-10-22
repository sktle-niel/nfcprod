/**
 * Words of the product editor dialog (Menu page, tab "Items"). The words of the tags are the menu's own
 * (`copy.menu.view.tags`). `{n}`, `{max}`, `{name}` and `{sizes}` are replaced where they are used.
 */
export const productEditorCopy = {
  addTitle: 'Add an item',
  editTitle: 'Edit an item',
  close: 'Close',
  name: 'Name',
  namePlaceholder: 'For example, Spanish Latte',
  description: 'Description',
  descriptionHint: 'Optional. One or two lines about the item.',
  /** `{n}` characters used, `{max}` the most allowed. */
  counter: '{n} of {max} characters',
  category: 'Category',
  categoryPlaceholder: 'Choose a category',
  noCategories: 'You have no categories yet. Add a category first, then you can put items in it.',
  mode: {
    label: 'How is it priced?',
    single: 'One price',
    sizes: 'Sizes',
  },
  price: 'Price (₱)',
  pricePlaceholder: '120',
  priceHint: 'For example 120 or 99.50.',
  sizes: {
    legend: 'Sizes',
    hint: 'Each size has its own price. The menu shows the lowest one as "From".',
    namePlaceholder: 'Size name',
    pricePlaceholder: 'Price',
    /** `{n}` is the row number. */
    nameLabel: 'Name of size {n}',
    priceLabel: 'Price of size {n} (₱)',
    /** `{name}` is the size name, or its number when it has none. */
    remove: 'Remove size {name}',
    add: 'Add a size',
    /** `{sizes}` is the list from the business type, for example "S, M, L". */
    quick: 'Add {sizes}',
    /** `{max}` is the most sizes an item can have. */
    full: 'An item can have {max} sizes at most.',
  },
  tags: { legend: 'Labels', hint: 'Small badges next to the item on your menu.' },
  photo: {
    label: 'Photo',
    alt: 'Photo of the item',
    choose: 'Choose a photo',
    replace: 'Replace photo',
    remove: 'Remove photo',
    empty: 'No photo yet',
    hint: 'JPEG, PNG or WebP, up to 4 MB.',
  },
  addons: {
    legend: 'Add-ons',
    hint: 'Choose the add-on groups customers can pick from for this item.',
    none: 'You have no add-on groups yet. Save this item, make a group in the Add-ons tab, then edit the item to choose it.',
  },
  available: { label: 'Available', description: 'Turn this off when the item is sold out. It stays on the menu, marked.' },
  save: 'Save item',
  cancel: 'Cancel',
  /** Field errors that say more than the shared ones, by field and error code. */
  errors: {
    name: { required: 'Give the item a name.', tooLong: 'That name is too long.' },
    description: { tooLong: 'That description is too long.' },
    categoryId: { required: 'Choose a category.', invalid: 'Choose a category from the list.' },
    price: {
      required: 'Enter a price.',
      invalid: 'Enter a price in pesos, for example 120 or 99.50.',
      range: 'That price is too high.',
    },
    variants: {
      none: 'Add at least one size, or switch to One price.',
      required: 'Give every size a name and a price.',
      tooShort: 'Give every size a name.',
      invalid: 'Check the prices. Use pesos, for example 120 or 99.50.',
      range: 'A price is too high.',
      tooLong: 'A size name is too long.',
      duplicate: 'Two sizes have the same name.',
      tooMany: 'There are too many sizes.',
    },
    groupIds: { invalid: 'One of the add-on groups is gone. Reload the page and try again.' },
    image: { invalid: 'We cannot use that picture. Choose another one.' },
  },
} as const
