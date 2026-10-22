/** Words of the owner's shell (sidebar, top strip, loading and error states) and the words every dashboard page shares. */
export const dashboardShellCopy = {
  /** The name of the navigation landmark. */
  menu: 'Dashboard',
  skip: 'Skip to content',
  home: 'Home',
  demo: 'Demo: resets on reload',
  loading: 'Loading your dashboard',
  loadError: 'Could not load your business.',
  /** The page title and h1 when the whole dashboard could not load. */
  failedTitle: 'Your dashboard did not load',
  retry: 'Retry',
  nav: { overview: 'Overview', menu: 'Menu', design: 'Design', share: 'Share', account: 'Account' },
  /** The Menu page around its two tabs. */
  menuPage: { title: 'Menu', tabs: 'Menu sections', items: 'Items', addons: 'Add-ons' },
  /** The signed-in owner, at the bottom of the sidebar. */
  signedIn: { label: 'Signed in as', logOut: 'Log out' },
  /** Why a call to the owner's data failed, by `OwnerError.code`. `unknown` is anything else. */
  errors: {
    invalid: 'Some of what you entered is not valid. Check the fields and try again.',
    slugTaken: 'That link is already taken.',
    notFound: 'We could not find that. Reload the page and try again.',
    signedOut: 'You were signed out. Sign in again to continue.',
    tooLarge: 'That picture is too large. Pictures can be 4 MB at most.',
    unsupported: 'That file is not a picture we can use. Use a JPEG, PNG or WebP picture.',
    network: 'We could not reach the server. Check your connection and try again.',
    unknown: 'Something went wrong. Try again.',
  },
  /** Why a field was refused, by `ErrorCode`. A page may say something more specific for its own fields. */
  fieldErrors: {
    required: 'This is required.',
    tooShort: 'This is too short.',
    tooLong: 'This is too long.',
    invalid: 'This is not valid.',
    range: 'This is outside the allowed range.',
    tooMany: 'There are too many of these.',
    duplicate: 'This is already used.',
  },
} as const
