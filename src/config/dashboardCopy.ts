import { accountCopy } from './copyParts/account'
import { addonsCopy } from './copyParts/addons'
import { dashboardShellCopy } from './copyParts/dashboardShell'
import { designCopy } from './copyParts/design'
import { itemsCopy } from './copyParts/items'
import { overviewCopy } from './copyParts/overview'
import { productEditorCopy } from './copyParts/productEditor'
import { setupCopy } from './copyParts/setup'
import { shareCopy } from './copyParts/share'

/**
 * Everything the owner's dashboard says, one part for each page, kept apart from `copy` on purpose: the landing page and the
 * public menu load `copy`, and they must not download words that only the dashboard reads.
 */
export const dashboardCopy = {
  shell: dashboardShellCopy,
  overview: overviewCopy,
  items: itemsCopy,
  productEditor: productEditorCopy,
  addons: addonsCopy,
  design: designCopy,
  share: shareCopy,
  account: accountCopy,
  setup: setupCopy,
} as const
