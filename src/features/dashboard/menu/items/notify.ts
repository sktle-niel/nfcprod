/** One control or several in order of preference, each named by its `data-focus` value. The first that is on gets the focus. */
export type Focus = string | readonly string[]

/**
 * Tells the owner what just happened (read out by the page's status region) and says which control gets the focus
 * next. A control is named by its `data-focus` value, because the one that had the focus may be gone.
 */
export type Notify = (message: string, focus?: Focus) => void

/** Where the focus goes after a control is used, for the controls that move or vanish. */
export const focusKeys = {
  addCategory: 'add-category',
  addItem: (categoryId: string) => `add-item-${categoryId}`,
  edit: (productId: string) => `edit-${productId}`,
  rename: (categoryId: string) => `rename-${categoryId}`,
  /** The search box: where the focus lands when the control it was meant for is not on the page any more. */
  search: 'search',
} as const
