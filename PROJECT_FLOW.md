# NFC Menu Platform — Project Flow

Living document. Update the checkboxes and the decision log as the project moves.

## 1. Idea

Tap an NFC card on a phone and the browser opens that business's digital menu. No app install.
Each client (business owner) gets their own fully customizable menu site: background, colors, products, prices, sizes, add-ons.

- **Customer side:** tap card, menu page opens, browse items (price, size, add-ons).
- **Owner side:** create account, pick business type, get recommended settings, then customize everything.
- **Goal:** a multi-tenant platform. 50+ clients, each with their own menu and look, all on one codebase.

## 2. Target Market

Any business with a menu listing:

| Segment | Examples |
|---|---|
| Coffee / drinks | Coffee shop, milk tea, juice bar, bar |
| Casual dining | Carinderia, fast casual, bakery, dessert shop |
| Fine dining | Restaurant with courses, tasting menu, reservations |
| Hybrid | Cafe + meals, resto-bar, bakery-cafe |
| Small to large | Single branch up to multi-branch |

## 3. Core Flows

### 3.1 Customer flow (public)

1. Customer taps the NFC card (or scans the QR fallback).
2. Phone opens `https://<domain>/m/<business-slug>`.
3. Menu loads with the owner's theme (colors, background, logo).
4. Customer browses categories, opens an item, and sees size, price and add-ons.
5. (Later) Call waiter, order, or reservation, depending on the business type.

### 3.2 Owner flow (dashboard)

1. Sign up / log in.
2. **Onboarding:** "What kind of business is this?" Pick one or more (see section 4).
3. The system applies a **preset** (default categories, layout, theme, features).
4. Owner customizes: branding, theme, categories, products, sizes, add-ons.
5. Live preview, then publish.
6. Get the menu link and QR code. Write the link to the NFC card (NDEF URL record).

### 3.2b Reseller flow (NFC card sellers)

Card sellers promote the platform and help set up their customers. The owner always owns the account.

1. Reseller gets a partner account (created by us).
2. Reseller starts a client setup. The system creates an **invite / claim link** for the business owner.
3. Owner opens the link, signs up with their own email, and becomes the owner of the business.
4. Reseller may assist during setup and sees only basic status of their referred clients (no passwords, no private data).
5. Reseller writes or hands over the NFC card with the owner's menu link.

Scope: **menu showing and landing page only.** No payments, no ordering, no customer accounts.

### 3.3 Admin flow (us)

1. See all clients, their status, and their subscription.
2. Manage presets and templates.
3. Support tools (impersonate for support, deactivate a client).

## 4. Business-Type Presets

On account creation, the owner picks a type. Each type applies recommended settings, and all of them stay editable.

| Preset | Default categories | Default layout | Default features |
|---|---|---|---|
| Coffee Shop | Hot, Iced, Blended, Pastries | Grid with photos | Sizes (S/M/L), add-ons (shots, syrups, milk) |
| Milk Tea / Drinks | Classics, Fruit Teas, Specials | Grid | Sizes, sugar/ice level, add-ons (pearls, jelly) |
| Casual Dining | Appetizers, Mains, Sides, Drinks, Desserts | List with photos | Variants, add-ons, best sellers |
| Fine Dining | Starters, Mains, Desserts, Wine, Tasting Menu | Elegant list, minimal photos | Courses, pairings, descriptions, reservation link |
| Bakery / Dessert | Breads, Cakes, Pastries, Drinks | Grid | Per-piece or whole pricing, pre-order |
| Bar / Resto-bar | Cocktails, Beer, Wine, Pulutan | List | Glass or bottle pricing |
| **Hybrid** | Combines presets | Combines presets | Merge categories and features |

**Hybrid rule:** the owner can select more than one type (for example Coffee Shop + Casual Dining). The presets merge, so they get the drinks setup (sizes and add-ons) plus the meals setup. Duplicates are removed and the owner picks the layout per category.

## 5. Customization Scope (per client)

- **Branding:** logo, business name, tagline, social links, contact, hours, location.
- **Theme:** primary and secondary colors, background (color, gradient, image), font, button style, light or dark.
- **Layout:** grid or list, with or without photos, category tabs or sticky nav.
- **Products:** name, description, photo, price, availability (sold out toggle), tags (spicy, vegan, best seller).
- **Variants / sizes:** S/M/L or custom, each with its own price.
- **Add-ons (modifier groups):** required or optional, min and max selection, price per option.
- **Categories:** order, visibility, per-category layout.
- **Extras (later):** promos and banners, multiple branches, multi-language, currency.

## 6. Data Model (draft)

```
User            id, email, ...
Business        id, ownerId, slug, name, types[], theme, settings, plan, status
Category        id, businessId, name, order, layout, visible
Product         id, businessId, categoryId, name, description, image, basePrice, available, tags[], order
Variant         id, productId, label (S/M/L), price
ModifierGroup   id, businessId, name, required, min, max
ModifierOption  id, groupId, label, price
ProductModifier productId <-> modifierGroupId   (reuse groups across products)
Preset          id, type, defaultCategories, defaultTheme, defaultFeatures
```

Each business only sees its own data (row-level security on `businessId`).

## 7. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript | Scaffolded in this repo |
| Routing | React Router | `/m/:slug` public, `/dashboard/*` owner, `/admin/*` us |
| Styling | CSS variables for the theme | Theme tokens set per business at runtime |
| Backend / DB / Auth / Storage | To decide (see section 10) | Needs auth, DB, image storage |
| Hosting | To decide | Fast loading on mobile data is key |
| NFC | NDEF URL record | Plain link on the card, no app needed |

## 8. Roadmap

### Phase 0 — Setup
- [x] React + Vite + TypeScript scaffold
- [x] Tooling: strict TypeScript, lint, tests, `npm run verify`, secret scan, git hooks, `.env.example`
- [x] Folder structure, lazy routes (`/`, `/m/:slug`, `/dashboard/*`, `/admin/*`), error and 404 pages, base styles
- [x] Choose the backend: Supabase (free plan for now)

### Phase 1 — Public menu (MVP)
- [ ] `/m/:slug` page that reads a business's data
- [ ] Theme engine (CSS variables from `theme` data)
- [ ] Category nav, product cards, product detail (sizes, add-ons, price)
- [ ] Mobile-first layout, fast load, works on slow data
- [ ] Mock data for 3 sample businesses (coffee, fine dining, hybrid)

### Phase 2 — Auth and onboarding
- [ ] Sign up and log in
- [ ] Onboarding: business type selection (multi-select)
- [ ] Apply presets (categories, theme, features)
- [ ] Slug picker and availability check

### Phase 3 — Owner dashboard
- [ ] Branding and theme editor with live preview
- [ ] Category CRUD and reorder
- [ ] Product CRUD with image upload
- [ ] Variants and add-on groups editor
- [ ] Availability toggle (sold out)
- [ ] Publish, link and QR code

### Phase 4 — NFC and delivery
- [ ] QR code generator (fallback for the card)
- [ ] NFC writing guide for the owner (NFC Tools / Android / iOS)
- [ ] Short, stable URLs. A card can't be changed easily, so the link must never break.
- [ ] Custom domain per client (optional)

### Phase 5 — Platform features
- [ ] Reseller (partner) accounts and invite / claim links
- [ ] Admin panel
- [ ] Analytics: taps, views, popular items
- [ ] Multi-branch, multi-language
- [ ] Optional later: reservation link, call-waiter (no payments, no ordering)

## 9. Key Decisions

- **Stable URLs:** the NFC card holds the URL forever. Slug changes need redirects.
- **Performance:** customers are on mobile data. Keep the public page light and lazy-load images.
- **Presets are starting points only.** Everything stays editable.
- **One codebase, many tenants.** No per-client forks.
- **Offline / caching:** the menu should still load if the connection is weak (cache last version).

## 10. Open Questions

1. ~~Backend~~ Decided: Supabase. ~~Currency~~ PHP. ~~Reseller payment~~ outside the app.
2. Domain (brand name is now NFC Menu). Needed before the first card is printed, because the URL is permanent.
3. ~~Languages~~ Decided: English only for now.
4. ~~Currency~~ Decided: PHP.
5. Reseller terms: do resellers earn per client, and how is that tracked outside the app?
6. Do we need a hidden abuse ceiling on products per business (no plan limits for now)?
7. Terms of Service and Privacy Policy text (owner emails are collected).

## 11. Decision Log

| Date | Decision | Why |
|---|---|---|
| 2026-10-09 | React + Vite + TypeScript | Chosen by owner, fast to build |
| 2026-10-09 | Presets by business type, with Hybrid merge | Gives recommended settings right after sign-up |
| 2026-10-09 | No payments, no ordering. Menu and landing page only | Smaller scope, smaller security surface, no PCI |
| 2026-10-09 | No customer accounts. Owners sign up with email | Customers only read the public menu |
| 2026-10-09 | NFC cards supplied by the owner of the project. Card sellers act as resellers and set up clients | Distribution through sellers |
| 2026-10-09 | No product-count limit for now. Image upload max 4 MB per product | Keep it simple, protect storage and bandwidth |
| 2026-10-09 | Backend: Supabase | Postgres with row-level security fits the tenant model, predictable costs, free plan for development |
| 2026-10-09 | Supabase free plan for now. Revisit (upgrade) before the first real client, because of the inactivity pause and no automated backups | Owner wants zero cost until launch |
| 2026-10-09 | UI language: English only for now. Keep all text in one place so translations can be added later | Keep scope small |
| 2026-10-09 | Currency: PHP only. Reseller payment outside the app | Simpler scope |
| 2026-10-09 | Styling: CSS Modules + CSS variable tokens. Fonts self-hosted (Urbanist, Instrument Serif) | No runtime CSS-in-JS, strict CSP friendly, light bundle |
| 2026-10-09 | Platform landing page follows the Finix reference (silver sheen, big light headline, serif italic accent, floating phone and cards) | Owner's design reference |
| 2026-10-09 | Landing motion: scroll-driven pinned scene (hero zooms out and fades, "how it works" fades in, phone travels). Pure CSS scroll timelines. Static stacked layout for unsupported browsers and reduced motion | Matches the reference animation without a JS animation library |
| 2026-10-09 | Landing smoothness: eased mouse-wheel scroll (small smooth-scroll library, landing only), no blur or fixed-attachment backgrounds under moving layers, shorter scroll distance | Scroll-driven motion looked steppy and costly to paint |
| 2026-10-09 | Brand name: NFC Menu (logo, light and dark versions, favicon supplied by owner). Domain still undecided | Logo files in src/assets/brand |
| 2026-10-09 | Light and dark theme: tokens on html data-theme, saved choice, follows system by default, circular reveal on toggle | Owner request |
| 2026-10-09 | (superseded) Brand name undecided | Use a placeholder name in code and config until decided |
