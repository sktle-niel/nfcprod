import { accountCopy } from './account'

/** Words of the Overview page. */
export const overviewCopy = {
  title: 'Overview',
  planError: 'Could not load your plan.',
  /** Said by a status line while the plan loads (again, after Retry). */
  planLoading: 'Loading your plan',
  status: {
    live: {
      title: 'Your menu is live',
      body: 'Customers can open it at this link, or by tapping your NFC card.',
    },
    draft: {
      title: 'Your menu is a draft',
      body: 'Nobody can see it yet. Publish it from the Share page when you are ready.',
      action: 'Publish your menu',
    },
    paused: {
      title: 'Your menu is paused',
      body: 'Your free trial or plan has ended. Your menu is paused, not deleted. Choose a plan to turn it back on.',
      // A menu that was never published has nothing to turn back on: the plan comes first, then publishing.
      bodyDraft: 'Your free trial or plan has ended. Choose a plan first, then publish your menu.',
      action: 'Choose a plan',
    },
  },
  checklist: {
    title: 'Setup checklist',
    progress: 'Setup progress',
    progressText: '{done} of {total} steps done',
    allDone: 'All set. Your menu is ready for customers.',
    done: 'Done',
    todo: 'Not done yet',
    steps: {
      items: 'Add your first menu item',
      details: 'Add your phone, address or hours',
      logo: 'Upload your logo',
      publish: 'Publish your menu',
      plan: 'Choose a plan',
    },
  },
  plan: {
    title: 'Plan',
    trial: { one: 'Free trial: 1 day left', many: 'Free trial: {n} days left' },
    trialBody: 'Ends on {date}. Choose a plan to keep your menu live.',
    active: '{plan} plan',
    activeBody: 'Renews on {date}.',
    trialEnded: 'Free trial ended',
    trialEndedBody: 'Your menu is paused. Choose a plan to turn it back on.',
    lapsed: '{plan} plan ended',
    lapsedBody: 'Your menu is paused. Choose a plan to turn it back on.',
    // For a menu that was never published: there is nothing to turn back on.
    endedDraftBody: 'Choose a plan first, then publish your menu.',
    names: accountCopy.plans.names,
    start: 'Choose a plan',
    manage: 'View plan',
  },
  freeCards: {
    title: { one: accountCopy.freeCards.titleOne, many: accountCopy.freeCards.title },
    waiting: accountCopy.freeCards.waiting,
    ready: accountCopy.freeCards.ready,
    sent: accountCopy.freeCards.sent,
  },
  visitors: {
    title: 'Visitors',
    range: 'Last 14 days',
    demo: 'Sample data',
    views: 'Menu views',
    taps: 'Card taps',
    daily: 'Menu views per day',
    top: 'Most viewed items',
    loading: 'Loading the visitor numbers',
    error: 'Could not load the visitor numbers.',
    empty: 'Add items to your menu and the visitor numbers show up here.',
  },
  quick: {
    title: 'Quick actions',
    addItem: 'Add an item',
    look: 'Edit your look',
    share: 'Share your menu',
  },
} as const
