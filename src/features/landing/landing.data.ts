import facebook from '@/assets/cards/facebook.webp'
import google from '@/assets/cards/google.webp'
import instagram from '@/assets/cards/instagram.webp'
import website from '@/assets/cards/website.webp'

// Intrinsic sizes of the cut-out card images (prevents layout shift).
const SIZE = { instagram: [642, 501], facebook: [632, 495], google: [625, 465], website: [627, 467] } as const

export const cards = {
  instagram: { src: instagram, width: SIZE.instagram[0], height: SIZE.instagram[1], label: 'Instagram' },
  facebook: { src: facebook, width: SIZE.facebook[0], height: SIZE.facebook[1], label: 'Facebook' },
  google: { src: google, width: SIZE.google[0], height: SIZE.google[1], label: 'Google Reviews' },
  website: { src: website, width: SIZE.website[0], height: SIZE.website[1], label: 'Website' },
} as const

export const showcaseOrder = ['website', 'instagram', 'facebook', 'google'] as const

// Sample menu shown inside the phone mockup. Prices are integer centavos.
export const demoMenu = {
  name: 'Café Luna',
  chips: ['Coffee', 'Pastry', 'Meals'],
  items: [
    { name: 'Iced Latte', note: 'S · M · L', price: 14000, tone: '#c9a27e' },
    { name: 'Spanish Latte', note: '+ add-ons', price: 16500, tone: '#a9794f' },
    { name: 'Butter Croissant', note: 'Fresh daily', price: 9500, tone: '#e2b866' },
    { name: 'Pesto Pasta', note: 'With chicken', price: 24500, tone: '#8aa06a' },
    { name: 'Chicken Rice Bowl', note: 'Best seller', price: 18500, tone: '#d98b5f' },
  ],
} as const

// NFC + Website package in integer centavos, by the month or by the year. The year sits under
// ₱4,000 to win yearly sign-ups: about ₱333 a month, 30% less than 12 months.
export const packagePlans = {
  month: 47900,
  year: 399900,
} as const
export type Billing = keyof typeof packagePlans
export const BILLINGS: readonly Billing[] = ['month', 'year']

// Price of one review card in integer centavos. The server decides what is charged.
export const cardPrice = 49900
