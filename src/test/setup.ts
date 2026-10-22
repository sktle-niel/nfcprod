import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// findBy and waitFor give up after 1 s by default. A lazy route that is loaded for the first time in a test file is
// transformed on the spot, which takes several seconds on a busy machine. A wait that passes returns at once, so only a
// failing test pays for the long limit.
configure({ asyncUtilTimeout: 10_000 })

// jsdom has no matchMedia. Report "reduced motion" so animation helpers stay off in tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom does not implement the modal dialog methods, nor what a modal does to the page behind it: everything outside the
// dialog is inert, so it cannot take focus. Both are modelled here, so a test cannot focus something a browser would refuse.
const modals: HTMLDialogElement[] = []
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
    modals.push(this)
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    const index = modals.indexOf(this)
    if (index >= 0) modals.splice(index, 1)
    this.dispatchEvent(new Event('close'))
  }
}

const focus = HTMLElement.prototype.focus
HTMLElement.prototype.focus = function focusUnlessInert(this: HTMLElement, options?: FocusOptions) {
  const top = modals.findLast((dialog) => dialog.isConnected && dialog.hasAttribute('open'))
  if (top && !top.contains(this)) return
  focus.call(this, options)
}
