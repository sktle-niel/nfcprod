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

// Package price in integer centavos.
export const packagePrice = 179900

// Placeholder until sign-up exists (Phase 2).
export const CTA_HREF = '/dashboard'

// Review-card bundles. Prices and savings are integer centavos.
export const bundles = [
  { id: 'one', price: 58000, save: null, best: false },
  { id: 'two', price: 78000, save: 38000, best: false },
  { id: 'three', price: 139900, save: 77900, best: true },
] as const
