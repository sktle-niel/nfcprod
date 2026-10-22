import type { BusinessType, SocialLinks } from '@/entities/business/business'
import type { ProductTag } from '@/entities/menu/menu'
import type { Mode, StyleId } from '@/entities/theme/theme'

/** One item of a sample menu. Prices are whole pesos here; the builder turns them into centavos. No pictures: the menu draws an illustration. */
export type SampleItem = {
  name: string
  description: string
  price: number
  tags?: ProductTag[]
  /** True marks the item sold out. */
  soldOut?: boolean
  /** Gets the sizes of its preset (each size up costs 20 pesos more). Ignored when the preset has none. */
  sized?: boolean
  /** Offers every add-on group of the menu. */
  addOns?: boolean
}

/** A made-up business of the demo, built from the presets of `types`. `items` are by category name of those presets. */
export type SampleBusiness = {
  slug: string
  name: string
  tagline: string
  types: BusinessType[]
  style: StyleId
  mode: Mode
  phone: string
  address: string
  hours: string
  social?: Partial<SocialLinks>
  items: Record<string, SampleItem[]>
}

const WEEK = 'Mon to Fri 7:00 AM to 8:00 PM\nSat and Sun 8:00 AM to 9:00 PM'

/**
 * The five businesses the demo treats as taken links (DEMO_TAKEN_SLUGS in owner.ts), so a visitor can open them. Names, numbers
 * and addresses are made up. Each has a best seller, a New item and one sold-out item, so every part of the menu shows.
 */
export const SAMPLE_BUSINESSES: readonly SampleBusiness[] = [
  {
    slug: 'cafe-luna',
    name: 'Cafe Luna',
    tagline: 'Small-batch coffee, brewed slow.',
    types: ['coffee'],
    style: 'atelier',
    mode: 'dark',
    phone: '0917 555 0142',
    address: '12 Rizal Avenue, Poblacion, Tagaytay',
    hours: WEEK,
    social: { website: 'https://example.com/cafe-luna' },
    items: {
      Hot: [
        { name: 'Americano', description: 'A double shot of espresso with hot water.', price: 120, sized: true },
        { name: 'Spanish Latte', description: 'Espresso and steamed milk, sweetened with condensed milk.', price: 165, tags: ['bestSeller'], sized: true, addOns: true },
        { name: 'Flat White', description: 'Two ristretto shots under velvety microfoam.', price: 150, sized: true, addOns: true },
        { name: 'Cortado', description: 'Equal parts espresso and warm milk, short and strong.', price: 140, tags: ['new'] },
      ],
      Iced: [
        { name: 'Iced Spanish Latte', description: 'Our best seller over ice, creamy and cold.', price: 175, sized: true, addOns: true },
        { name: 'Iced Americano', description: 'Espresso poured over ice and cold water.', price: 130, sized: true },
        { name: 'Coconut Cold Brew', description: 'Twelve-hour cold brew with coconut cream.', price: 170, sized: true },
      ],
      Blended: [
        { name: 'Mocha Frappe', description: 'Espresso, dark chocolate and ice, blended smooth.', price: 190, sized: true, addOns: true },
        { name: 'Caramel Crumble', description: 'Caramel, cookie crumble and espresso, topped with cream.', price: 195, sized: true, soldOut: true },
      ],
      Pastries: [
        { name: 'Butter Croissant', description: 'Flaky layers, baked every morning.', price: 95 },
        { name: 'Basque Cheesecake', description: 'Burnt on top, creamy in the middle.', price: 150 },
        { name: 'Banana Bread', description: 'Moist, with walnuts and brown sugar.', price: 90 },
      ],
    },
  },
  {
    slug: 'kapehan-ni-ana',
    name: 'Kapehan ni Ana',
    tagline: 'Home cooking, hot rice, cold drinks.',
    types: ['casualDining'],
    style: 'diner',
    mode: 'dark',
    phone: '0918 555 0177',
    address: '48 Mabini Street, Barangay San Roque, Lipa',
    hours: 'Every day 10:00 AM to 10:00 PM',
    items: {
      Appetizers: [
        { name: 'Lumpiang Shanghai', description: 'Crispy pork rolls with sweet chili dip, ten pieces.', price: 140, tags: ['bestSeller'] },
        { name: 'Calamari Rings', description: 'Golden fried squid with garlic vinegar dip.', price: 190 },
        { name: 'Tokwa at Baboy', description: 'Fried tofu and pork with soy-vinegar sauce.', price: 150, tags: ['spicy'] },
      ],
      Mains: [
        { name: 'Chicken Inasal', description: 'Grilled in lemongrass and annatto oil, with garlic rice.', price: 185, tags: ['bestSeller'] },
        { name: 'Sizzling Sisig', description: 'Chopped pork with onion and chili on a hot plate.', price: 210, tags: ['spicy'] },
        { name: 'Beef Tapa', description: 'Sweet and salty marinated beef, egg and rice.', price: 195 },
        { name: 'Sinigang na Baboy', description: 'Pork in sour tamarind broth with vegetables.', price: 230 },
        { name: 'Ginataang Gulay', description: 'Squash, string beans and eggplant in coconut milk.', price: 160, tags: ['vegan'] },
        { name: 'Bicol Express', description: 'Pork simmered in coconut milk with long green chili.', price: 220, tags: ['spicy'] },
      ],
      Sides: [
        { name: 'Garlic Rice', description: 'Rice fried with toasted garlic.', price: 45 },
        { name: 'Plain Rice', description: 'Steamed rice, unlimited refill at lunch.', price: 35 },
        { name: 'Atchara', description: 'Pickled green papaya.', price: 40, tags: ['vegan'] },
      ],
      Drinks: [
        { name: 'Calamansi Juice', description: 'Fresh calamansi, lightly sweet.', price: 65 },
        { name: "Sago't Gulaman", description: 'Brown sugar syrup with pearls and jelly.', price: 60, tags: ['new'] },
        { name: 'House Iced Tea', description: 'Black tea with lemon, free refill.', price: 55 },
      ],
      Desserts: [
        { name: 'Halo-halo', description: 'Shaved ice, sweet beans, leche flan and ube ice cream.', price: 120, soldOut: true },
        { name: 'Leche Flan', description: 'Creamy caramel custard.', price: 90 },
      ],
    },
  },
  {
    slug: 'la-bella',
    name: 'La Bella',
    tagline: 'Seasonal Italian, cooked with patience.',
    types: ['fineDining'],
    style: 'gourmet',
    mode: 'dark',
    phone: '0919 555 0108',
    address: 'Ground Floor, The Garden Court, Ayala Avenue, Makati',
    hours: 'Tue to Sun, dinner 5:30 PM to 10:30 PM\nMonday closed',
    social: { website: 'https://example.com/la-bella' },
    items: {
      Starters: [
        { name: 'Burrata and Heirloom Tomato', description: 'Fresh burrata, basil oil and aged balsamic.', price: 420, tags: ['vegetarian'] },
        { name: 'Seared Scallops', description: 'Hokkaido scallops, cauliflower puree and brown butter.', price: 520, tags: ['new'] },
        { name: 'Beef Carpaccio', description: 'Thin-sliced tenderloin, arugula, parmesan and capers.', price: 480 },
      ],
      Mains: [
        { name: 'Braised Short Rib', description: 'Eight hours in red wine, with potato mousseline.', price: 1180, tags: ['bestSeller'] },
        { name: 'Pan-roasted Sea Bass', description: 'Lemon beurre blanc, fennel and green beans.', price: 980 },
        { name: 'Wild Mushroom Risotto', description: 'Carnaroli rice, porcini and shaved truffle.', price: 760, tags: ['vegetarian'] },
        { name: 'Rack of Lamb', description: 'Herb crust, rosemary jus and roasted root vegetables.', price: 1350, soldOut: true },
      ],
      Desserts: [
        { name: 'Tiramisu', description: 'Mascarpone, espresso-soaked savoiardi and cocoa.', price: 380 },
        { name: 'Dark Chocolate Fondant', description: 'Warm center, served with vanilla gelato.', price: 420 },
      ],
      Wine: [
        { name: 'Chianti Classico, glass', description: 'Tuscany, red. Cherry, leather and soft tannins.', price: 450 },
        { name: 'Pinot Grigio, glass', description: 'Veneto, white. Crisp, pear and citrus.', price: 420 },
      ],
      'Tasting Menu': [
        { name: 'Five-course Tasting', description: 'The chef selects five courses from the season.', price: 2800 },
        { name: 'Tasting with Wine Pairing', description: 'The five courses, each with a matched glass.', price: 4200 },
      ],
    },
  },
  {
    slug: 'bean-there',
    name: 'Bean There',
    tagline: 'Roasted in town since 1998.',
    types: ['coffee'],
    style: 'retro',
    mode: 'dark',
    phone: '0920 555 0163',
    address: '5 Session Road, Baguio City',
    hours: 'Every day 6:30 AM to 9:00 PM',
    items: {
      Hot: [
        { name: 'Black Coffee', description: 'Brewed to order from our house blend.', price: 90, sized: true },
        { name: 'Cappuccino', description: 'Espresso, steamed milk and a thick cap of foam.', price: 140, sized: true, addOns: true },
        { name: 'Mocha', description: 'Espresso, dark chocolate and steamed milk.', price: 160, sized: true, addOns: true },
        { name: 'Flat White', description: 'Two ristretto shots and silky milk, no foam.', price: 150, sized: true },
      ],
      Iced: [
        { name: 'Iced Latte', description: 'Espresso over cold milk and ice.', price: 150, sized: true, addOns: true },
        { name: 'Iced Matcha Latte', description: 'Ceremonial matcha, milk and a little honey.', price: 170, tags: ['new'], sized: true },
        { name: 'Cold Brew', description: 'Steeped for sixteen hours, served black.', price: 140, sized: true },
      ],
      Blended: [
        { name: 'Java Chip', description: 'Espresso, chocolate chips and ice, blended thick.', price: 185, tags: ['bestSeller'], sized: true },
        { name: 'Vanilla Cream Frappe', description: 'Vanilla, milk and ice, no coffee.', price: 165, sized: true },
      ],
      Pastries: [
        { name: 'Cinnamon Roll', description: 'Warm, with cream cheese glaze.', price: 110 },
        { name: 'Banana Bread', description: 'Baked this morning.', price: 95, soldOut: true },
        { name: 'Chocolate Chip Cookie', description: 'Crisp edges, soft middle, sea salt on top.', price: 70 },
      ],
    },
  },
  {
    slug: 'tea-hub',
    name: 'Tea Hub',
    tagline: 'Fresh tea, fresh fruit, every cup.',
    types: ['milkTea'],
    style: 'fresh',
    mode: 'light',
    phone: '0927 555 0191',
    address: 'Stall 14, Sunrise Food Park, Katipunan Avenue, Quezon City',
    hours: 'Every day 11:00 AM to 10:00 PM',
    social: { website: 'https://example.com/tea-hub' },
    items: {
      Classics: [
        { name: 'Classic Milk Tea', description: 'Black tea and fresh milk with brown sugar pearls.', price: 95, tags: ['bestSeller'], sized: true, addOns: true },
        { name: 'Wintermelon Milk Tea', description: 'Sweet and light, with a cream finish.', price: 100, sized: true, addOns: true },
        { name: 'Okinawa Milk Tea', description: 'Roasted brown sugar and black tea.', price: 115, sized: true, addOns: true },
        { name: 'Hokkaido Milk Tea', description: 'Creamy, with a caramel finish.', price: 110, sized: true, addOns: true },
        { name: 'Taro Milk Tea', description: 'Real taro, smooth and slightly sweet.', price: 110, sized: true, addOns: true },
        { name: 'Thai Milk Tea', description: 'Strong Thai tea with evaporated milk.', price: 100, sized: true, addOns: true },
      ],
      'Fruit Teas': [
        { name: 'Passion Fruit Green Tea', description: 'Jasmine green tea with real passion fruit.', price: 105, sized: true },
        { name: 'Lychee Fruit Tea', description: 'Lychee, jasmine tea and a splash of lime.', price: 110, sized: true },
        { name: 'Mango Pomelo Cooler', description: 'Ripe mango, pomelo pulp and green tea over ice.', price: 120, sized: true },
      ],
      Specials: [
        { name: 'Brown Sugar Boba', description: 'Warm tapioca pearls in cold fresh milk.', price: 125, tags: ['new'], sized: true },
        { name: 'Taro Cheesecake Milk Tea', description: 'Taro milk tea with a cheesecake cream cap.', price: 135, sized: true, soldOut: true },
        { name: 'Matcha Cream Cap', description: 'Ceremonial matcha under a salted cream cap.', price: 130, sized: true },
      ],
    },
  },
]
