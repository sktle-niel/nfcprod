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

1. Sign up / log in ("Get your card", "Get started" and "Get now" all lead here). A 7-day free trial starts, with 2 free NFC website cards waiting for a plan.
2. Account page: trial days left, choose Monthly or Annual, pay on the hosted checkout. The free cards ship once the plan is paid. When the trial or a plan ends, the menu is paused, not deleted.
3. **Onboarding:** "What kind of business is this?" Pick one or more (see section 4).
4. The system applies a **preset** (default categories, a ready-made menu style, features).
5. Owner customizes: branding, theme, categories, products, sizes, add-ons.
6. Live preview, then publish.
7. Get the menu link and QR code. Write the link to the NFC card (NDEF URL record).

Where it lives: the setup wizard (`/dashboard/setup`) covers steps 3 and 4, and the sidebar covers the rest: Overview (status, checklist, plan), Menu (step 5, products), Design (step 5, branding and theme, with the live preview of step 6), Share (steps 6 and 7) and Account (step 2).

### 3.2b Reseller flow (NFC card sellers)

Card sellers promote the platform and help set up their customers. The owner always owns the account.

1. Reseller gets a partner account (created by us).
2. Reseller starts a client setup. The system creates an **invite / claim link** for the business owner.
3. Owner opens the link, signs up with their own email, and becomes the owner of the business.
4. Reseller may assist during setup and sees only basic status of their referred clients (no passwords, no private data).
5. Reseller writes or hands over the NFC card with the owner's menu link.

Scope: **menu showing and landing page only.** No ordering in the menu, no customer accounts. Owners pay for their own plan through a hosted checkout.

### 3.3 Admin flow (us)

1. See all clients, their status, and their subscription.
2. Manage presets and templates.
3. Support tools (impersonate for support, deactivate a client).
4. Orders and customers: see everyone who ordered, call them, and move each order from New to Confirmed to Delivered (or Cancelled).

## 4. Business-Type Presets

On account creation, the owner picks a type. Each type applies recommended settings, and all of them stay editable.

| Preset | Default categories | Default look (menu style) | Default features |
|---|---|---|---|
| Coffee Shop | Hot, Iced, Blended, Pastries | Atelier: dark, script header, outlined cards with cut-out photos | Sizes (S/M/L), add-ons (shots, syrups, milk) |
| Milk Tea / Drinks | Classics, Fruit Teas, Specials | Fresh: light, leaves, round photos on tiles | Sizes, sugar/ice level, add-ons (pearls, jelly) |
| Casual Dining | Appetizers, Mains, Sides, Drinks, Desserts | Diner: dark, bold stripes, a plate with a price badge | Variants, add-ons, best sellers |
| Fine Dining | Starters, Mains, Desserts, Wine, Tasting Menu | Gourmet: dark green and gold, framed header, an elegant numbered list | Courses, pairings, descriptions, reservation link |
| Bakery / Dessert | Breads, Cakes, Pastries, Drinks | Blush: light pink, script header, arched photos | Per-piece or whole pricing, pre-order |
| Bar / Resto-bar | Cocktails, Beer, Wine, Pulutan | Noir: black and gold, a list with leader dots | Glass or bottle pricing |
| **Hybrid** | Combines presets | The first type's style | Merge categories and features |

**Hybrid rule:** the owner can select more than one type (for example Coffee Shop + Casual Dining). The presets merge, so they get the drinks setup (sizes and add-ons) plus the meals setup. Duplicates are removed and the owner picks the layout per category.

## 5. Customization Scope (per client)

- **Branding:** logo, business name, tagline, social links, phone, hours, address (as text).
- **Theme:** built: the owner's own background photo on the menu (the `picture` backdrop below); thirteen ready-made menu styles to start from (Classic, Roast, Atelier, Sunny, Editorial, Cocoa, Retro, Gourmet, Fresh, Blush, Diner, Noir, Catalog), each in light and dark, and every part of a style can be changed on its own: the card kind (eight), the picture shape (four), the section titles (seven), the header (five), the line art (seven sets), the page backdrop (nineteen: five classic, thirteen drawn textures, and the owner's own page photo under a Faint, Soft or Strong veil, laid to fill the screen, fit inside or stretch, placed at the center or an edge, and shown as the style's texture on a screen wider than the photo can fill), a spotlight for the best seller, a font pairing (eight), the button corner, the four colors (accent, text, page, card) and light or dark. Later: gradient and image backgrounds, the owner's own fonts.
- **Layout:** grid or list, for the card kinds that sit side by side (row, tile and badge cards; the others are always one column, and the poster goes to two columns on a wide screen); every product has a picture, or a drawn illustration while it has none; the category nav is built. A layout per category comes later.
- **Products:** name, description, photo, price, availability (sold out toggle), tags (spicy, vegan, best seller).
- **Variants / sizes:** S/M/L or custom, each with its own price.
- **Add-ons (modifier groups):** required or optional, min and max selection, price per option.
- **Categories:** order and visibility (built); per-category layout later.
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

The frontend types that exist today (`src/entities`) are simpler: a Business has `slug`, `name`, `tagline`, `types`, `logo`, `phone`, `address`, `hours`, `social`, `theme` and `published` (one per owner); a Product has `price`, `variants`, `tags`, `available`, `image` and `groupIds`; the order of a list is the array order; the ids that tie rows to a business and an owner arrive with the backend. ARCHITECTURE section 4 has the built shapes.

Each business only sees its own data (row-level security on `businessId`).

## 7. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript | Scaffolded in this repo |
| Routing | React Router | `/m/:slug` public, `/dashboard/*` owner, `/admin/*` us |
| Styling | CSS Modules + CSS variable tokens | Theme tokens set per business at runtime (`src/shared/theme/tokens.css`) |
| Backend / DB / Auth / Storage | Supabase (Postgres, Auth, Storage, row-level security) | Decided, not built yet. Free plan for development, paid plan before the first real client |
| Delivery map | MapLibre GL with the OpenFreeMap light style, Nominatim for lookups | Lazy chunk, only when the customer opens the map. See the decision log of 2026-10-20 |
| QR codes | `uqr`, in the browser | Pinned to 0.1.3, only its encoder is used. See the decision log of 2026-10-21 |
| Hosting | To decide | Fast loading on mobile data is key |
| NFC | NDEF URL record | Plain link on the card, no app needed |

## 8. Roadmap

### Phase 0 — Setup
- [x] React + Vite + TypeScript scaffold
- [x] Tooling: strict TypeScript, lint, tests, `npm run verify`, secret scan, git hooks, `.env.example`
- [x] Folder structure, lazy routes (`/`, `/m/:slug`, `/dashboard/*`, `/admin/*`), error and 404 pages, base styles
- [x] Choose the backend: Supabase (free plan for now)

### Phase 1 — Public menu (MVP)
- [x] `/m/:slug` page that reads a business's data (five sample businesses on a mock repository until the backend exists), and the owner's preview of their own menu at `/dashboard/preview`
- [x] Theme engine (CSS variables from `theme` data): `toCssVars`, the contrast guard, `MenuView`, now on `/m/:slug` and in the preview
- [x] Menu styles: thirteen ready-made looks, a picture (or a drawn illustration) on every card, eight card kinds, titles, headers, line art, backdrops and eight font pairings (ARCHITECTURE section 3.4)
- [ ] Category nav, product cards, product detail (sizes, add-ons, price). Half built in the shared `MenuView`: the nav, the cards, the sizes and a note about add-ons. The detail view and the add-on picker are not.
- [ ] Mobile-first layout, fast load, works on slow data
- [x] Mock data for sample businesses: five (a coffee shop, casual dining, fine dining, a retro café and a milk tea shop)

### Phase 2 — Auth and onboarding
- [x] Sign up and log in modal: Google or email and password (demo auth in memory until Supabase Auth is connected)
- [x] Onboarding: business type selection (multi-select), as the setup wizard at `/dashboard/setup`
- [x] Apply presets (categories, theme, add-ons, optional example items), with the hybrid merge
- [x] Slug picker and availability check (against the demo data until the backend exists)

### Phase 3 — Owner dashboard
- [x] Branding and theme editor with live preview (Design page: the style gallery, then colors, cards, headings and extras)
- [x] Category CRUD and reorder (Menu page, Items tab)
- [x] Product CRUD with image upload (pictures stay in this tab in demo mode)
- [x] Variants and add-on groups editor (sizes in the item editor, Add-ons tab)
- [x] Availability toggle (sold out)
- [x] Publish, link and QR code (Share page)

### Phase 4 — NFC and delivery
- [x] QR code generator (fallback for the card), in the browser, downloadable as SVG or PNG
- [x] NFC writing guide for the owner (Android and iPhone), on the Share page
- [ ] Short, stable URLs. A card can't be changed easily, so the link must never break. (The app asks before a link changes; the redirect table needs the backend.)
- [ ] Custom domain per client (optional)

### Phase 5 — Platform features
- [ ] Reseller (partner) accounts and invite / claim links
- [x] Admin area at `/admin`: Overview, Orders, Customers, Pricing (sample data until the backend and admin sign-in exist)
- [ ] Rest of the admin flow (section 3.3): clients and subscriptions, presets and templates, support tools
- [ ] Analytics: taps, views, popular items (the Overview shows labeled sample numbers; real events need the backend)
- [ ] Multi-branch, multi-language
- [ ] Optional later: reservation link, call-waiter (no payments, no ordering)

## 9. Key Decisions

- **Stable URLs:** the NFC card holds the URL forever. Slug changes need redirects before real clients. Today the app asks before a link changes, says that written cards stop working, and keeps every old link reserved for its business.
- **Performance:** customers are on mobile data. Keep the public page light and lazy-load images.
- **Presets are starting points only.** Everything stays editable.
- **One codebase, many tenants.** No per-client forks.
- **Offline / caching:** the menu should still load if the connection is weak (cache last version).

## 10. Open Questions

1. ~~Backend~~ Decided: Supabase. ~~Currency~~ PHP. ~~Reseller payment~~ outside the app.
2. Domain (brand name is now NFC Menu). Needed before the first card is printed, because the URL is permanent. Set `VITE_PUBLIC_ORIGIN` to it, so every menu link starts with it and not with the address the dashboard happens to be open on.
3. ~~Languages~~ Decided: English only for now.
4. ~~Currency~~ Decided: PHP.
5. Reseller terms: do resellers earn per client, and how is that tracked outside the app?
6. Do we need a hidden abuse ceiling on products per business (no plan limits for now)?
7. Terms of Service and Privacy Policy text (owner emails and customer delivery details are collected).
8. Where do "Get now" orders go (Supabase table, email, Messenger)? How long are delivery details kept, the delivery pin included?
9. The place lists come from a free community API with 2022 data (no Maguindanao split, no new municipalities). Keep it, or host our own copy of the latest PSA data before launch?
10. The delivery map uses the public OpenFreeMap style and tiles and the public Nominatim service: free, no SLA, and Nominatim is for light use only. Keep them for the first customers, then move to our own host or a paid provider before real traffic? Should a service be switchable without a redeploy (today both addresses are build-time env values)?
11. The Overview shows sample visitor numbers. Where do real taps and views come from (the append-only events store of ARCHITECTURE section 6), and how long do we keep them?
12. Where do owners' pictures live (the storage origin that `img-src` names), and who pays for it? Until then an upload stays in the browser.
13. May one owner have more than one business (a branch each)? Today the app allows one.
14. How many times may a business change its menu link, and for how long is an old link kept for it? Every old link stays reserved so a card can never open someone else's menu, which means a business that keeps changing its link holds many names. The mock has no cap; the server needs one before launch.

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
| 2026-10-09 | "Get now" order form on the card bundles collects delivery details (name, mobile, province, city, barangay, street, landmark). Runs in demo mode until an endpoint is set | Orders need a delivery address; see ARCHITECTURE section 7.8 for privacy and abuse rules |
| 2026-10-09 | (superseded) Brand name undecided | Use a placeholder name in code and config until decided |
| 2026-10-13 | Admin area at `/admin` with a sidebar (a tab bar on phones), in the same colors and tokens as the public site. Overview: headline numbers for the last 7, 30 or 90 days. Orders: filters, a list and the order beside it, status New / Confirmed / Delivered / Cancelled. Customers: made from the orders. Lists show ten to a page, and every page shows skeletons while the orders load. Built on `AdminOrderRepository`; shows sample data until the backend and admin sign-in exist | Owner needs to see who ordered and work through the orders. A real adapter must wait for admin sign-in (ARCHITECTURE sections 7.7 and 7.8) |
| 2026-10-15 | Province, city and barangay in the "Get now" form are chosen from the free public PSGC API (`psgc.gitlab.io`), not typed. If a list cannot be loaded or a place is missing, the three fields turn into text boxes. Sitio and purok go in the street field. "City of Cebu" is shown as "Cebu City" | A complete address that is spelled the same way every time, remote places included. The API is a free community service with 2022 data, so typing stays as the safety net (ARCHITECTURE section 7.8) |
| 2026-10-16 | Review cards sell one at a time at ₱499. The "Any 2 cards" and "All 3 cards" bundles are no longer sold or accepted; old orders keep their bundle | Owner decision |
| 2026-10-17 | One product, "NFC card", at ₱499 each. The order form takes a quantity for every chosen card (Facebook, Instagram, Google review), 1 to 20 of each per order. Orders hold items (platform and quantity) instead of a bundle; the admin groups them by size (1, 2, 3+ cards) | Owner request. The cap of 20 per platform is a default against abuse; raise it on request |
| 2026-10-17 | NFC + Website package becomes a subscription: ₱479 a month, or ₱3,999 a year (about ₱333 a month, 30% less than 12 months; under ₱4,000 to win yearly sign-ups). The pricing card opens on 1 year and sits beside the ₱499 NFC card | Owner decision |
| 2026-10-17 | Owners need an account before the dashboard: sign up or log in with Google, or with email and password (the email is the username). "Get started" opens the sign-up modal (a modal, not a separate page) when nobody is logged in, then goes on to the dashboard; card orders through "Get now" stay without an account | Owner request. Email is needed for verification and password reset anyway; guest card orders keep the ₱499 purchase quick |
| 2026-10-19 | Pricing shows three cards side by side: NFC card, NFC + Website monthly, NFC + Website annual (with the "Save 30%" mark). The monthly / yearly switch is gone. Every card keeps its badge, name, price, text, list and button on shared rows, so prices and buttons line up | Owner request: each plan easy to compare at a glance |
| 2026-10-19 | NFC card price drops from ₱499 to ₱379 each. Old orders keep the total they were placed at | Owner decision |
| 2026-10-19 | Prices are set by the admin at `/admin/pricing` (NFC card, NFC + Website monthly and annual), not in code. The landing page and the order form read them; the Save mark and "You save" note follow from the monthly and annual prices. Kept in memory until a backend and admin sign-in exist | Owner request: change prices without a code change |
| 2026-10-19 | The "Get now" form needs a pin on a map (Leaflet, OpenStreetMap tiles). The pin fills province, city, barangay and a street hint from a Nominatim lookup, matched to the PSGC lists (city first, because the lookup often has no province; a barangay only when exactly one fits). The owner chose a **required** pin, with a "find a place" search (on submit only), public OpenStreetMap servers for now, and a Google Maps link plus coordinates for the rider in the admin. If the map itself cannot load, the order may go without a pin, so a free outside service never blocks an order | Riders need the exact door, and a pin also saves the customer typing. The probe of 45 real points showed the lookup rarely names the province, hence city first (ARCHITECTURE section 7.8) |
| 2026-10-19 | The admin can give each offer a percent discount (0 to 90%) and edit what it includes (up to 8 check-mark items). The landing page shows the regular price struck through, the price to pay and a "% off" mark; card orders total at the discounted price. No end date on discounts yet | Owner request: run promos and change the offer text without a code change |
| 2026-10-19 | Every purchase needs an owner account: "Get your card" and "Get now" open sign-up or log-in first (supersedes the 2026-10-17 guest card orders). A new account gets a 7-day free trial and 2 free NFC cards for the menu website, sent once a plan is paid. The account page (now `/dashboard/account`, see 2026-10-21) shows the trial, lets the owner pick Monthly or Annual and pay. After the trial or a paid period the menu is paused, not deleted | Owner request. Free cards only after payment, so trials cost nothing to hand out |
| 2026-10-19 | Plans are paid online through a hosted checkout (PayMongo planned); only the provider's signed webhook turns a plan on (supersedes "No payments" of 2026-10-09 for owner plans; the menu still takes no orders or payments) | Owner decision. Hosted checkout keeps card data off our servers (PCI SAQ A). Mock until the backend exists (ARCHITECTURE 7.9) |
| 2026-10-20 | The delivery pin map moves from Leaflet with OpenStreetMap tiles to MapLibre GL with the light "Positron" style from OpenFreeMap (supersedes that part of 2026-10-19; the required pin, the lookup and the search stand), for the Philippines only: it starts on the whole country, stays inside the country and a few degrees around it, and its search is limited to the Philippines. It stays light when the site is dark. The address lookup and the search stay on Nominatim. The style address is `VITE_MAP_STYLE` (empty means the public OpenFreeMap style) | Owner request: the light look of mapcn, an open-source MapLibre map kit (github.com/AnmolSaini16/mapcn). We use MapLibre and the same open Positron look directly, not mapcn itself, which is built on Tailwind and shadcn/ui, and this project uses neither. We do not use CARTO's own Positron addresses because CARTO now asks for an API key, so its keyless addresses are not a safe default for a commercial product. OpenFreeMap serves the same OpenMapTiles look free, with no key and no sign-up, but with no SLA (open question 10). Trade-offs: a much heavier lazy load (about 435 KB gzip with its CSS and worker file, against about 52 KB) and WebGL is needed; without it the order goes on without a pin, as when any map fails to load (ARCHITECTURE section 7.8) |
| 2026-10-21 | The owner dashboard has five pages in a sidebar (a tab bar on phones): Overview, Menu (Items and Add-ons tabs), Design (Details and Look tabs, with a live preview), Share (publish, link, QR code, NFC guide) and Account (plan, billing, profile). A new owner starts in a setup wizard at `/dashboard/setup` (name, business types, link, optional example items). The account page works before the wizard, so the trial and the plan are never behind it | Five items share the row of the phone tab bar and fit at 360 px (a sixth would be too tight). The pages follow the owner flow of section 3.2 and the Phase 2 and 3 roadmap |
| 2026-10-21 | The dashboard runs on a mock `OwnerRepository` that keeps each owner's business and menu in the tab's memory (gone on reload), behind the interface in `src/data/ownerRepository.ts`. The shell says "Demo: resets on reload", and the Overview labels its visitor numbers "Sample data" | Frontend first (CLAUDE.md section 9): the real adapter replaces the mock later and the pages do not change |
| 2026-10-21 | (extended by the menu styles entry below) A menu's look is three colors, a font from an allow-list, a button corner, a layout and light or dark cards, turned into `--menu-*` CSS variables by a pure function. A contrast guard warns under 4.5:1 for text and 3:1 for the accent, and offers a fix | Nothing a person types reaches CSS, and a customer's theme does not depend on the app's own light or dark mode. Gradient and image backgrounds come later |
| 2026-10-21 | QR codes are drawn in the browser with the small `uqr` package (MIT, no dependencies, pinned to 0.1.3), using only its encoder; the SVG is built as React elements | Error-correction coding is too long to write and test ourselves, and no outside QR service may see our links. One small dependency with a reason (CLAUDE.md section 4) |
| 2026-10-21 | Changing a menu link asks first and says that written cards and printed QR codes stop working. Pictures are JPEG, PNG or WebP only (checked from their first bytes), at most 4 MB, never SVG | We cannot rewrite a card, and a picture is the one file an owner uploads |
| 2026-10-21 | The admin's generic pieces (shell, page header, panel, skeleton, stat tile, charts, avatar, icons) moved to `src/shared/ui` and are shared with the owner dashboard | Features may not import each other, and the owner area needs the same frame |
| 2026-10-21 | (superseded, see the public page entry below) The public page `/m/:slug` stays a stub for now. The shared `MenuView` renders a business's menu in the Design preview and will serve the public page | Phase 1 needs the public menu repository first |
| 2026-10-21 | One owner has one business for now (a second setup is refused). Multi-branch stays on the "later" list | The setup wizard and the mock repository stay simple; the data model keeps room for several (section 6) |
| 2026-10-21 | A menu is live only when the owner published it AND the trial or plan is running (`menuState`, `isMenuLive`). Every page reads that one rule | Two pages had said "Live" for a draft. Paused means paused, never deleted |
| 2026-10-21 | Menu links start with a configured public address (`VITE_PUBLIC_ORIGIN`), not the address of the page, and the Share page warns when the page is open on another address | A card keeps its link forever; one written from a preview or a platform address would break |
| 2026-10-21 | Every link a business had stays reserved for it. Redirects from old links to the new one come with the backend | Without that, a freed link would open another business's menu from an old card |
| 2026-10-21 | The business types are chosen in the setup wizard and cannot be changed afterwards. They only seed the suggested categories, add-ons, sizes and look | Changing them later would have to decide what happens to the owner's own items. The setup wizard says so before it creates the business |
| 2026-10-21 | When "Retry" removes itself (a failed plan, visitors or business load), focus goes to the title of the page or panel, an always-present status line says it is loading, and the whole-dashboard failure view has a title, Retry and Log out | A keyboard or screen-reader user must not be left on the page body after the control they pressed is gone |
| 2026-10-21 | A dialog whose call is in flight cannot be dismissed: Cancel, the corner button, Escape and the backdrop are off while it is busy (`Modal busy`, `useModalBusy`) | Dismissing it would look like "keep it" while the delete, save or link change still lands |
| 2026-10-21 | The words about an ended trial or plan depend on the menu state (no menu, draft, paused); the "you opened this page at another address" note is information, shown once on the link panel | A draft was told it would "turn back on", and the note warned about a card that was already right |
| 2026-10-21 | The accent color is drawn only as shapes (the bar beside category names, the line under the category links, label outlines, the focus ring), never as text color; placeholder text has its own token `--color-placeholder` (4.5:1) | Text in the accent could not promise 4.5:1; `--color-muted` is for decoration |
| 2026-10-21 | Menu styles: a style is a named bundle of independent choices (card kind, picture shape, section titles, header, line art, page backdrop, best-seller spotlight, font pairing, button corner, layout, light or dark, and four colors) stored in the theme. Thirteen ready-made styles, each in light and dark, and the business-type presets start from one of them | Owner request: fully customizable menus, a picture on every card, a choice of styles like their six references (a poster, cards, badges, an editorial post, soft minimal, a retro list) and styles that fit dining and product menus. Storing the choices, not just the name, keeps every one editable after the pick, and an older theme still reads |
| 2026-10-21 | Every product shows its picture, or a drawn illustration (inline SVG, nine kinds, picked from the words of the item and the kind of business) while it has none | Owner request. The menu looks finished from the first minute, and a placeholder makes no image request |
| 2026-10-21 | The styles are our own drawings and names. The six reference images and a read-only look at Pinterest gave ideas (mood, structure, how a block is arranged); nothing was copied or traced | Owner's instruction: originals only, no copyright or trade-dress risk |
| 2026-10-21 | Fonts for the styles are five self-hosted `@fontsource` packages (Playfair Display, DM Serif Display, Anton, Fredoka, Pacifico), loaded on demand by the menu that uses them. The landing page and the other menus download none | The looks need real display faces; loading on demand and self-hosting keep the public page light and the CSP (`font-src 'self'`) unchanged |
| 2026-10-21 | The public page `/m/:slug` is built on a mock `PublicMenuRepository` with five sample businesses (supersedes "stays a stub"). An unknown link shows a calm "not available" page, an invalid one the app 404. In demo mode an owner sees their own menu at `/dashboard/preview` (same tab), because their data lives only in their tab | Phase 1 can be tried end to end, and the real adapter replaces the mock later without touching the page |
| 2026-10-21 | `/__styles` (every style on a sample menu) and `/__look` (the Design page's Look tab, with no sign-in) are developer pages that exist in development builds only | Look at every style and control in a real browser without signing in; nothing of them ships |
| 2026-10-22 | The cut-out picture shape frames an all-opaque picture with rounded corners automatically (its pixels are read on a small canvas; one that cannot be read counts as opaque). The Design page's phone preview hides its scrollbar but still scrolls | The owner's first real upload was a rectangular poster that floated over the card and its price chips; the hint alone did not prevent it |
| 2026-10-22 | The page backdrop grows a nineteenth kind: the owner's own photo, uploaded like every picture (bytes sniffed, 4 MB, never SVG) and drawn under a flat veil of the page color at Faint, Soft or Strong (10, 16 or 23% of the photo showing; Strong stays at the boldest texture's ceiling, marble). The veil's share feeds the same worst-ground contrast math as the drawn textures, the editor warns when the owner's text color cannot take the chosen strength, and the renderer shows only an address the picture storage rules allow (`pictureSrc`), with `toCssVars` refusing anything that could not sit inside `url("...")` | Owner request: their own background image on the menu website. A photo under a declared veil keeps the readability promise the styles already make |
| 2026-10-21 | The page backdrops grow from five to eighteen: plain, paper, dots, stripes and glow stay painted by the menu's CSS, and thirteen textures (grain, plaster, marble, linen, weave, terrazzo, waves, arches, deco, gingham, check, topo, bloom) are drawn from the palette by `backdrop.ts` and travel as one CSS variable (`--menu-backdrop-image`), blended with the page color under declared ink and accent ceilings so text contrast never drops | Four ready-made styles lean on a texture (Roast grain, Atelier plaster, Gourmet marble, Noir deco), and a palette-drawn texture works with any owner colors |
| 2026-10-29 | In the Design preview, a tap on a category chip scrolls the preview to that category, as on the phone. The chips stay plain words there (no link, no tab stop), and the page around the preview does not move | Owner request: a tap on a chip should go to its category. The public page already did; the preview did nothing |
| 2026-10-29 | The owner's page photo gets a fit (Fill the screen, Fit inside, Stretch) and a position (Center, Top, Bottom, Left, Right), kept with the photo when another style is tried. It is drawn one screen tall on a layer under the content that stays put while the menu scrolls and reaches the edges of a wide screen. On a screen wider than 1.5 times the photo's own width (a wide tablet, a desktop), the menu shows the texture of its style instead (plain for Classic), and the photo comes back on a narrower screen | Owner request: place the photo well on phones and tablets, and never show it blown up past what it can fill. Drawn at the size of the screen, the photo is no longer stretched over the whole length of the menu. Only the width is checked, so the Design preview and a phone agree; a landscape photo under "Fill the screen" on a tall screen is still enlarged by its height (ARCHITECTURE section 3.4) |
