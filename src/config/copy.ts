// All user-facing text lives here (English only for now), so translations can be added later.
export const copy = {
  landing: {
    nav: { how: 'How it works', cards: 'Cards', pricing: 'Pricing', cta: 'Get started' },
    hero: {
      line1: 'Your menu, one tap',
      accent: 'away',
      body: 'Customers tap the card. Your menu opens on their phone. No app.',
      cta: 'Get your card',
      secondary: 'How it works',
      phoneLabel: 'Sample menu on a phone',
    },
    how: {
      title: 'Three steps,',
      accent: 'zero apps.',
      steps: [
        { title: 'Tap', body: 'Phone touches the card.' },
        { title: 'Browse', body: 'Your menu opens instantly.' },
        { title: 'Update', body: 'Edit prices and items anytime.' },
      ],
    },
    cards: { title: 'One tap. Any link.', body: 'Menu, socials, reviews, website.' },
    pricing: {
      title: 'Simple pricing',
      badge: 'Custom package',
      name: 'NFC + Website package',
      from: 'Starting at',
      body: 'Perfect for cafés, restaurants & stores.',
      features: [
        'Free setup & guide',
        'Custom website with menu: add, edit, delete items',
        'Free hosting + domain included',
        'Customers browse the menu on their phone',
      ],
      cta: 'Get started',
      bundles: {
        title: 'Turn every customer into a review',
        body: 'Simple tap. More follows, reviews & visibility.',
        best: 'Best value',
        save: 'Save',
        items: {
          one: {
            name: '1 NFC card',
            perks: ['Free setup & guide', 'Choose 1: Facebook, Instagram or Google review'],
          },
          two: {
            name: 'Any 2 cards',
            perks: ['Free setup & guide', 'Choose any 2: Facebook, Instagram or Google review'],
          },
          three: {
            name: 'All 3 cards',
            perks: ['Free setup & guide', 'Facebook + Instagram + Google review'],
          },
        },
      },
    },
    footer: 'All rights reserved.',
  },
  menu: {
    comingSoon: 'Menu coming soon.',
  },
  dashboard: { title: 'Dashboard' },
  admin: { title: 'Admin' },
  notFound: {
    title: 'Page not found',
    body: 'The link may be wrong or the menu may have moved.',
    home: 'Go home',
  },
  error: {
    title: 'Something went wrong',
    body: 'Please try again in a moment.',
    retry: 'Reload',
  },
} as const
