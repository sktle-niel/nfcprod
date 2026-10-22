/** Where a typed menu link stands, in words. The setup wizard and the Share page's change-link form both show these. */
export const linkStatusCopy = {
  status: {
    empty: 'Enter a link name.',
    invalid: 'Use 3 to 40 lowercase letters, numbers and hyphens. A hyphen cannot start, end or repeat.',
    reserved: 'That word is kept for us. Try another.',
    checking: 'Checking if this link is free.',
    available: 'This link is free.',
    yours: 'This is your current link.',
    taken: 'That link is already taken. Try another.',
    failed: 'We could not check this link. Check your connection and try again.',
  },
  /** The button after a failed check. */
  recheck: 'Check again',
} as const
