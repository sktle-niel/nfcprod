import type { BusinessType } from '@/entities/business/business'
import { linkStatusCopy } from './linkStatus'

type TypeWords = { label: string; description: string }

/** What the owner reads when they pick the kinds of business they run. The categories each type brings come from the presets. */
const types: Record<BusinessType, TypeWords> = {
  coffee: { label: 'Coffee shop', description: 'Espresso, brews and pastries, often in sizes.' },
  milkTea: { label: 'Milk tea shop', description: 'Teas, milk teas and fruit drinks with sizes and add-ons.' },
  casualDining: { label: 'Casual dining', description: 'Restaurants, grills and cafés with mains to share.' },
  fineDining: { label: 'Fine dining', description: 'Courses, a tasting menu and a wine list.' },
  bakery: { label: 'Bakery', description: 'Breads, pastries and cakes sold by the piece.' },
  bar: { label: 'Bar', description: 'Cocktails, beer and wine, with bites on the side.' },
}

/** Words of the setup wizard, the first-run page of the owner dashboard. */
export const setupCopy = {
  title: 'Set up your menu',
  intro: 'Four quick steps and your menu is ready to fill.',
  logOut: 'Log out',
  /** `{n}` is the step, `{total}` the number of steps. */
  progress: 'Step {n} of {total}',
  back: 'Back',
  next: 'Next',
  types,
  steps: {
    name: {
      heading: 'What is your business called?',
      hint: 'Your customers see this name at the top of your menu.',
      label: 'Business name',
      placeholder: 'Kape Kanto',
      required: 'Enter your business name.',
    },
    types: {
      heading: 'What kind of business is it?',
      hint: 'Pick all that fit. We start your menu with the matching categories and look. You can edit those later, but you cannot change the types.',
      legend: 'Business types',
      required: 'Pick at least one kind of business.',
      /** `{categories}` is the list of categories the type starts the menu with. */
      gets: 'You get: {categories}',
    },
    link: {
      heading: 'Choose your menu link',
      hint: 'This is the link on your NFC cards and QR code. Short and easy to say works best.',
      label: 'Link name',
      /** `{url}` is the full link. */
      preview: 'Your menu will be at {url}',
      careful: 'Choose with care: cards written with a link stop working if you change it later.',
      status: linkStatusCopy.status,
      recheck: linkStatusCopy.recheck,
    },
    review: {
      heading: 'Ready to create your menu?',
      hint: 'Check these, then create it. You can change the name later. The business types cannot be changed after this, and a new link stops cards you already wrote.',
      name: 'Business name',
      types: 'Business types',
      link: 'Menu link',
      change: 'Change',
      changeNames: { name: 'Change the business name', types: 'Change the business types', link: 'Change the menu link' },
      samples: {
        label: 'Add a few example items',
        /** `{n}` is how many items. */
        hint: { one: 'We add {n} example item to edit or delete, so your menu does not start empty.', many: 'We add {n} example items to edit or delete, so your menu does not start empty.' },
      },
      create: 'Create my menu',
      creating: 'Creating your menu',
    },
  },
} as const
