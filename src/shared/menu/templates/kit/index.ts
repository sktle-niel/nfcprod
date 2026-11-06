// The shared pieces of the page templates. A template imports from here and from nothing of another template.
//
// Website structure: `VisitSection` (with `hasVisit` to decide on its nav link), `directionsHref`. Words for the top navigation are in
// copy.menu.view.template.siteNav.
// Motion: `useReveal` for a section's entrance; `motion` for the page-load entrance and press feedback; the --tpl-ease and
// --tpl-duration-* values, listed in motion.module.css, for a template's own transitions.
// Scrolling: `scrollToSection`, `scrollPreviewTo`, `centerItem`, `calmMotion`, in place of a template's own scroll file.
export { calmMotion } from './calmMotion'
export { centerItem, scrollPreviewTo, scrollToSection } from './anchorScroll'
export { default as motion } from './motion.module.css'
export { useReveal } from './useReveal'
export { VisitSection, type VisitClassNames } from './VisitSection'
export { Icon, type IconName } from './icons'
export { MenuPhoto } from './MenuPhoto'
export { hasDetails, optionExtra } from './details'
export { ProductDetails } from './ProductDetails'
export { useMenuSearch } from './useMenuSearch'
export { useScrollSpy } from './useScrollSpy'
export { dialHref, directionsHref, hasVisit, socialLinks } from '../../contact'
export { MenuFooter } from '../../MenuFooter'
export { HeaderLogo } from '../../headers/HeaderLogo'
