import type { Business } from '@/entities/business/business'
import type { Menu } from '@/entities/menu/menu'
import { DEFAULT_THEME } from '@/entities/theme/theme'

/*
 * Sample data for the owner dashboard's tests (the data layer and the dashboard pages). Every call builds fresh objects,
 * so a test may change what it gets. Every value is one the editors would store as it is (src/data/owner.test.ts checks).
 *
 * sampleBusiness(): "Kape Kanto" (id `biz-kape-kanto`, slug `kape-kanto`), a coffee shop in Cebu City with the coffee
 * look. It has a tagline, a phone, an address, two lines of hours, a Facebook and an Instagram link. No logo, and not
 * published yet (a draft).
 *
 * sampleMenu(): two visible categories, Hot (`cat-hot`) and Iced (`cat-iced`), and one optional add-on group, Milk
 * (`grp-milk`: Oat milk ₱45 or Soy milk ₱35, at most one). Four products, kept together by category:
 * - Hot: Americano (`prd-americano`, S/M/L ₱120/₱140/₱160, no tags), Spanish Latte (`prd-latte`, S/M/L ₱165/₱185/₱205,
 *   best seller, a photo, offers Milk).
 * - Iced: Iced Caramel Macchiato (`prd-macchiato`, M/L ₱175/₱195, new, SOLD OUT, offers Milk), Cold Brew
 *   (`prd-cold-brew`, one price ₱150, vegan).
 *
 * sampleImageFile(): a File whose first bytes are a real PNG, JPEG or WebP signature, of any size, with any name and type.
 */

export function sampleBusiness(overrides: Partial<Business> = {}): Business {
  return {
    id: 'biz-kape-kanto',
    slug: 'kape-kanto',
    name: 'Kape Kanto',
    tagline: 'Coffee and pastries on the corner',
    types: ['coffee'],
    logo: null,
    phone: '+63 917 555 0142',
    address: '12 Mabini Street, Lahug, Cebu City',
    hours: 'Mon to Fri, 7 am to 9 pm\nSat and Sun, 8 am to 10 pm',
    social: {
      facebook: 'https://facebook.com/kapekanto',
      instagram: 'https://instagram.com/kapekanto',
      tiktok: '',
      website: '',
    },
    theme: {
      ...DEFAULT_THEME,
      primary: '#8b5a2b',
      secondary: '#2b1d14',
      background: '#f8f3ec',
      font: 'urbanist',
      buttonStyle: 'rounded',
      layout: 'grid',
      mode: 'light',
    },
    published: false,
    ...overrides,
  }
}

/** Sizes with ids made from the product's id: `var-americano-s` and so on. */
function sizes(product: string, prices: Record<string, number>) {
  return Object.entries(prices).map(([label, price]) => ({ id: `var-${product}-${label.toLowerCase()}`, label, price }))
}

export function sampleMenu(overrides: Partial<Menu> = {}): Menu {
  return {
    categories: [
      { id: 'cat-hot', name: 'Hot', visible: true },
      { id: 'cat-iced', name: 'Iced', visible: true },
    ],
    products: [
      {
        id: 'prd-americano',
        categoryId: 'cat-hot',
        name: 'Americano',
        description: 'A double shot of espresso with hot water.',
        price: 12000,
        variants: sizes('americano', { S: 12000, M: 14000, L: 16000 }),
        tags: [],
        available: true,
        image: null,
        groupIds: [],
      },
      {
        id: 'prd-latte',
        categoryId: 'cat-hot',
        name: 'Spanish Latte',
        description: 'Espresso and steamed milk, sweetened with condensed milk.',
        price: 16500,
        variants: sizes('latte', { S: 16500, M: 18500, L: 20500 }),
        tags: ['bestSeller'],
        available: true,
        image: 'https://images.example.com/spanish-latte.jpg',
        groupIds: ['grp-milk'],
      },
      {
        id: 'prd-macchiato',
        categoryId: 'cat-iced',
        name: 'Iced Caramel Macchiato',
        description: 'Vanilla milk over ice, topped with espresso and caramel.',
        price: 17500,
        variants: sizes('macchiato', { M: 17500, L: 19500 }),
        tags: ['new'],
        available: false,
        image: null,
        groupIds: ['grp-milk'],
      },
      {
        id: 'prd-cold-brew',
        categoryId: 'cat-iced',
        name: 'Cold Brew',
        description: 'Coffee steeped cold overnight, served black over ice.',
        price: 15000,
        variants: [],
        tags: ['vegan'],
        available: true,
        image: null,
        groupIds: [],
      },
    ],
    groups: [
      {
        id: 'grp-milk',
        name: 'Milk',
        required: false,
        min: 0,
        max: 1,
        options: [
          { id: 'opt-oat', label: 'Oat milk', price: 4500 },
          { id: 'opt-soy', label: 'Soy milk', price: 3500 },
        ],
      },
    ],
    ...overrides,
  }
}

// The first bytes of each kind of picture, as the files of a phone or a camera start.
const SIGNATURES = {
  // The PNG signature, then the start of its first chunk (IHDR).
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52],
  // Start of image, then a JFIF APP0 segment.
  jpeg: [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01],
  // "RIFF", the size of the rest, "WEBP", then a "VP8 " chunk.
  webp: [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20],
} as const

export type SampleImageKind = keyof typeof SIGNATURES

/**
 * A picture file: the real signature of `kind`, then zeros up to `size` bytes (64 by default). The name and the declared
 * type are the honest ones unless a test passes others, to show that neither is trusted.
 */
export function sampleImageFile(
  kind: SampleImageKind = 'png',
  { name = `photo.${kind === 'jpeg' ? 'jpg' : kind}`, type = `image/${kind}`, size = 64 }: { name?: string; type?: string; size?: number } = {},
): File {
  const head = Uint8Array.from(SIGNATURES[kind])
  return new File([head, new Uint8Array(Math.max(0, size - head.length))], name, { type })
}
