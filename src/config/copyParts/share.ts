import { accountCopy } from './account'
import { linkStatusCopy } from './linkStatus'

/** Words of the Share page. */
export const shareCopy = {
  title: 'Share',
  publish: {
    title: 'Publish',
    label: 'Publish your menu',
    draft: 'Your menu is a draft. Nobody can see it yet. When you publish it, anyone with your link can see your business name, logo, items, phone, address, hours and links.',
    live: 'Your menu is live. Anyone with your link, QR code or NFC card can see your business name, logo, items, phone, address, hours and links.',
    paused: 'Your trial or plan ended, so your menu is paused. Nothing was deleted: it comes back when you choose a plan.',
    endedDraft: 'Your trial or plan ended. Your menu stays hidden, even when published, until you choose a plan.',
    account: 'Choose a plan',
    nowPublished: 'Your menu is published.',
    nowPaused: 'Your menu is published, but paused until you choose a plan.',
    nowHidden: 'Your menu is a draft again.',
  },
  link: {
    title: 'Your menu link',
    label: 'Menu link',
    copy: 'Copy link',
    copied: 'Link copied.',
    copyFailed: 'We could not copy the link. Select it and copy it by hand.',
    open: 'Open menu',
    newTab: '(opens in a new tab)',
    notLive: 'This link shows nothing until you publish your menu.',
    paused: 'This link shows nothing until you choose a plan.',
    pausedDraft: 'This link shows nothing until you choose a plan and publish your menu.',
    /** `{here}` is the address the page is open on, `{address}` the one every menu link starts with. Information, not a warning. */
    elsewhere: 'You opened this page at {here}. Your menu link, QR code and card link use your menu address, {address}.',
    change: 'Change link',
    changed: 'Link changed. Write it to your cards again and replace any printed QR code.',
  },
  /** The owner's view of their own menu at /dashboard/preview. */
  preview: {
    title: 'Menu preview',
    /** The name of the bar above the menu. */
    bar: 'Menu preview bar',
    back: 'Back to dashboard',
    /** The menu is a draft: only the owner can see it. */
    note: 'Preview: this is how customers see your menu. Only you can see it until you publish it.',
    /** The trial or plan ended: the menu is hidden from customers whether or not it was published. */
    notePaused: 'Preview: this is how customers see your menu. It is paused, so only you can see it until you choose a plan.',
  },
  change: {
    label: 'New link name',
    hint: 'It goes after /m/. Short and easy to say works best.',
    preview: 'Your new link: {url}',
    submit: 'Save link',
    cancel: 'Cancel',
    recheck: linkStatusCopy.recheck,
    status: linkStatusCopy.status,
    confirm: {
      title: 'Change your link?',
      body: 'Your menu will open at {url}. Cards you already wrote with {old} stop working until you write them again with the new link, and printed QR codes stop working too.',
      confirm: 'Change the link',
      cancel: 'Keep the old link',
      close: 'Close',
    },
  },
  qr: {
    title: 'QR code',
    label: 'QR code of {url}',
    body: 'Customers scan this with their phone camera to open your menu. Print it on a table card or a sticker. Download the PNG for screens and sharing, and the SVG for print, because it stays sharp at any size.',
    svg: 'Download SVG',
    png: 'Download PNG',
    downloaded: 'Your QR code is downloading.',
    failed: 'We could not make the picture. Try again.',
    tooLong: 'This link is too long to make a QR code.',
  },
  nfc: {
    title: 'Write your link to an NFC card',
    intro: 'Write the menu link below on the card with a free NFC writer app, for example NFC Tools.',
    linkLabel: 'Link to write',
    android: {
      title: 'On Android',
      steps: [
        'Turn on NFC in your phone settings.',
        'Open your NFC writer app and choose Write.',
        'Add a record, choose URL or link, and paste your menu link.',
        'Tap Write, then hold the card against the back of your phone until the app says it is done.',
      ],
    },
    iphone: {
      title: 'On iPhone',
      steps: [
        'Use a recent iPhone. NFC is always on.',
        'Open your NFC writer app and choose Write.',
        'Add a record, choose URL or link, and paste your menu link.',
        'Tap Write, then hold the top of your iPhone against the card until the app says it is done.',
      ],
    },
    testTitle: 'Test the card',
    test: 'Publish your menu first. Then tap the card on a phone. Your menu should open at once. Do not lock the card until it works, because a locked card cannot be changed.',
  },
  cards: {
    title: accountCopy.freeCards.title,
    titleOne: accountCopy.freeCards.titleOne,
    waiting: accountCopy.freeCards.waiting,
    ready: accountCopy.freeCards.ready,
    sent: accountCopy.freeCards.sent,
    heading: 'Your NFC cards',
    loading: 'Loading your cards',
    order: 'Order more cards',
  },
} as const
