# ARCHITECTURE.md

Architecture and security design for the NFC menu platform. Product flow lives in `PROJECT_FLOW.md`. Working rules live in `CLAUDE.md`.

Status: **frontend first**. Backend and infrastructure sections are the target design, built later.

## 1. Goals and Quality Attributes

| Attribute | Target |
|---|---|
| Scalable | 50 clients now, thousands later, one codebase, no per-client forks |
| Fast | Public menu loads fast on weak mobile data. Target under 100 KB JS for the public page (gzip), LCP under 2.5 s on mid-range phone over 4G |
| Maintainable | Clear layers, shared components, typed contracts, small files |
| Secure | Standard level at MVP, Intermediate before real customers, Advanced for owner accounts (section 7) |
| Easy to update | Config and data driven. A new business type means a new preset, not new code |
| No bottlenecks | Static and cached reads for the public path, writes isolated from reads (section 8) |

## 2. System Overview

```
 NFC card / QR
      |
      v
 Phone browser --HTTPS--> CDN / Edge (WAF, rate limit, cache)
                              |
              +---------------+----------------+
              v                                v
   Static app (React SPA)              API (auth, CRUD, upload)
   public menu  /m/:slug               owner + admin endpoints
              |                                |
              +------ reads cached JSON <------+
                                               v
                                         Database + object storage
```

Four surfaces, one codebase:
- **Platform landing** `/`: anonymous marketing page with pricing and the "Get now" card order form (section 7.8). The owner sign-up and log-in modal opens over any page from the address (`?auth=signup`, `?auth=login`).
- **Public menu** `/m/:slug`: anonymous, read-only, cached, lightest bundle.
- **Owner dashboard** `/dashboard/*`: authenticated. A sidebar (a tab bar on phones) with five pages: Overview (status, setup checklist, plan, sample visitor numbers), Menu (items and add-ons), Design (business details, branding and the look, with a live preview), Share (publish, link, QR code, NFC guide) and Account (plan, billing, profile). A new owner first meets the setup wizard at `/dashboard/setup` (name, business types, link). Section 7.10.
- **Admin** `/admin/*`: platform staff only, strongest controls. That is the target: today there is no sign-in, the pages show sample data, and anyone who opens the address sees them. Admin sign-in with MFA must exist before a real orders endpoint feeds them (sections 7.7 and 7.8).

Each surface is a separate lazy-loaded route group so the public bundle never carries dashboard or admin code.

## 3. Frontend Architecture (current work)

### 3.1 Layers

```
src/
  app/            app shell, router, providers, error boundary
  features/
    landing/      platform landing page (pricing, card bundles, "Get now" order form)
    menu/         public menu page /m/:slug (the renderer is shared/menu)
    auth/         sign-up and log-in modal
    dashboard/    the owner's area: setup wizard, shell, Overview, Menu (items, add-ons, product editor), Design, Share, Account
    admin/        Overview, Orders, Customers, Pricing (sample data until the backend exists)
    dev/          development-only pages (/__styles, /__look), left out of production builds
  entities/       domain types and pure logic (Business, Menu, Product, Variant, Modifier, Theme, Order, Account, Pricing)
  shared/
    ui/           design-system components: the app shell (sidebar, tab bar), Button, Switch, Tabs, ConfirmDialog, fields, charts, icons, skeletons
    menu/         MenuView: the one renderer of a business's menu (Design preview, owner preview, public page): cards, titles, headers, line art, pictures, fonts
    theme/        tokens and the light and dark themes
    lib/          pure utils (checks, validation, text, lines, urls, format, money, dates)
    hooks/        generic hooks
    session/      the signed-in owner (provider, useSession, sign-in links)
  data/           data layer: interface + adapters (mock now, real API later)
  presets/        business type presets as plain data, and the merge for hybrids
  test/           test harnesses and fixtures (never imported by the app)
  config/         env access, all user-facing copy (the owner dashboard's words in their own module, so the public pages do not download them), feature flags, constants
```

Dependency rule (one direction only):
`app` -> `features` -> `entities` + `shared` + `data`.
`shared` and `entities` import nothing from `features`. Features never import each other; they share through `shared` or `entities`.
`presets` (plain data) imports `entities` and `shared`, and `data` and the dashboard use it. `config` imports only entity types and pure helpers from `shared/lib`. `test` holds harnesses and fixtures that only tests import. The slug rules live in `entities/business`.

### 3.2 Principles

- **Data driven UI.** The menu is rendered from a `Business` (theme and details) and its `Menu` (categories, products, add-on groups). No business-specific code anywhere.
- **Design tokens.** Colors, radii, font families and shadows are CSS variables; font sizes and spacing are still plain values in the stylesheets. A business theme is just a set of token values applied at the root. This is what makes the background, colors and fonts customizable.
- **Presets are data.** `presets/*.ts` are plain objects. Hybrid = a pure `mergePresets()` function.
- **Reuse.** One `ProductCard` that draws the card kind of the menu's look, one `Modal` and `ConfirmDialog`, one `ChipToggle` for tags. The add-on picker and the product detail sheet come with the public page. No per-type copies.
- **Validate at the edge.** Every external value (API response, URL param, form input, stored value) is checked by a validator before use: hand-written, taking `unknown` and giving back the clean value or the refused fields (`shared/lib/checks.ts`, `entities/**/validate*.ts`). The types are written once, in `entities`. There is no schema library.
- **State.** Server data through the small `useResource` hook (load, retry, replace) and, in the owner's area, one `DashboardProvider` context. There is no query cache. Local UI state stays local. Global client state only for session and theme. No giant store.
- **Routing.** Route-level code splitting. Public route first, nothing else loaded.
- **Performance.** Image sizes and `srcset`, lazy loading below the fold, font subset with `font-display: swap`, skeletons, no layout shift, virtualized lists only if a menu is very large. Not built yet: `srcset` and a skeleton for the public page (`NEXT_STEPS.md` section 3).
- **Accessibility.** Semantic HTML, focus states, contrast checks on the generated theme (reject unreadable color pairs), reduced-motion support.
- **Mobile-first.** 360px baseline, safe-area insets, no hover-only interactions, tap targets at least 44px.
- **Error handling.** One error boundary at the root today (a boundary per route is planned), a friendly 404 and a calm "not available" page, never show raw errors or stack traces. There is no offline state yet. A session read that fails counts as signed out, so a page never stays blank.
- **Work in progress.** A form that is sending cannot be dismissed (`Modal busy`, `useModalBusy`). The Design page asks before it is left with unsaved changes (`useLeaveGuard`). The dialogs of the Menu page do not ask yet (`NEXT_STEPS.md` section 3).

### 3.3 Data layer contract (the seam between frontend and backend)

```ts
interface PublicMenuRepository {      // src/data/publicRepository.ts, built (read-only, nobody signed in)
  get(slug: string): Promise<PublicMenu | null>             // public, cacheable; null = no menu at that link
}
interface OwnerRepository {           // src/data/ownerRepository.ts, built
  getBusiness(): Promise<Business | null>
  createBusiness(input: NewBusinessInput): Promise<{ business: Business; menu: Menu }>
  saveBusiness(patch: BusinessPatch): Promise<Business>
  checkSlug(slug: string): Promise<SlugStatus>
  changeSlug(slug: string): Promise<Business>
  setPublished(published: boolean): Promise<Business>
  getMenu(): Promise<Menu>
  saveProduct(input: ProductInput): Promise<Menu>   // and the same for categories and add-on groups, moves, deletes
  uploadImage(file: File): Promise<string>
  insights(): Promise<Insights>
}
```

- The owner's calls never name an account or a business: the server knows the owner from the session. Every change comes back as the new whole `Menu` or `Business`, so a page puts the answer in place and does not drift from the server. The page numbers its calls (one counter for the menu, one for the business) and drops a reply that is older than one it already applied, which is right when the server runs calls in the order it got them. If the real server may run them in parallel, the adapter needs a queue or a refetch when the last call settles. A refusal is an `OwnerError` with a code and, for a bad input, the refused fields. The pages turn codes into words and never show a raw message.
- Today: `OwnerRepository` has a mock adapter (`src/data/owner.ts`) that keeps each owner's business and menu in the tab's memory, gone on reload (the dashboard says so). The public `PublicMenuRepository` has a mock adapter (`src/data/publicMenu.ts`) that answers for five sample businesses built from the presets (`publicSamples.ts`: Cafe Luna, Kapehan ni Ana, La Bella, Bean There, Tea Hub); an unknown or invalid link gets no menu. An owner's own menu lives only in their tab in demo mode, so they see it through the preview page (`/dashboard/preview`). `OrderRepository` (`src/data/orders.ts`) has a mock adapter, and an `http` adapter that is used when `VITE_ORDERS_ENDPOINT` is an `https:` URL (or localhost). `AdminOrderRepository` (`src/data/adminOrders.ts`), `AuthRepository` (`src/data/auth.ts`), `PricingRepository` (`src/data/pricing.ts`) and `BillingRepository` (`src/data/billing.ts`) are mock only.
- Later: `http` adapters call the real API. The UI does not change.
- Components never call `fetch` directly.
- The "Get now" form gets its province, city and barangay lists from a second repository, `LocationRepository` (`src/data/locations.ts`). See section 7.8.
- The delivery pin on that form uses a third seam, `ReverseGeocoder` (`src/data/geocoder.ts`): it turns a spot into a hint about the address, and a name into a spot (OpenStreetMap Nominatim today). `resolveAddress` (`src/data/resolveAddress.ts`) then matches the hint to the `LocationRepository` lists. See section 7.8.

### 3.4 Theme engine and menu styles

```
Business.theme (validated)  ->  toCssVars() + lookOf()  ->  <div style="--menu-accent: ..." data-menu-card="poster" ...>   (src/entities/theme, src/shared/menu)
```

- **A look is a style plus choices.** A *style* is a named bundle of independent choices. The theme stores the result of the pick, not the name alone, so an owner can change any one choice after picking a style, and an older theme still reads (a missing key takes its default). The choices: the card kind (row, leader, tile, badge, outline, soft, plate, poster), the picture shape (rounded, circle, arch, cutout), the section titles (plain, bullets, script, ribbon, ornament, rule, stripe), the header (plain, awning, poster, script, frame), the line art behind the page (none, coffee, leaves, dining, bakery, bar, sparkles), the page backdrop (plain, paper, dots, stripes and glow, painted by the menu's own CSS, plus thirteen textures drawn from the palette by `backdrop.ts`: grain, plaster, marble, linen, weave, terrazzo, waves, arches, deco, gingham, check, topo and bloom; or the owner's own page photo under a veil of the page color at Faint, Soft or Strong, laid to fill the screen, fit inside it or stretch to it, and placed at the center, top, bottom, left or right — the veil's worst share feeds the same contrast math as the textures, and the photo's address goes only through the picture checks), a spotlight for the best seller, one of eight font pairings, the button corner, the layout (grid or list) and light or dark. The colors are the accent `primary`, the text `secondary`, the page `background` and a card color `surface` (automatic when null).
- **Thirteen ready-made styles** (`src/entities/theme/styles.ts`: `STYLES` and `styleTheme(id, mode)`): Classic, Roast, Atelier, Sunny, Editorial, Cocoa, Retro, Gourmet, Fresh, Blush, Diner, Noir and Catalog. Each has a palette for light and one for dark, the kinds of business it suits and the mode it was made for. The business-type presets start from one of them in its own mode (coffee: Atelier, milk tea: Fresh, casual dining: Diner, fine dining: Gourmet, bakery: Blush, bar: Noir; a hybrid takes its first type). The Design page shows them as a gallery with a small live picture of the owner's own menu in each.
- **One renderer, painted from variables.** `MenuView` paints only from the `--menu-*` variables: `--menu-bg`, `--menu-text`, `--menu-accent`, `--menu-surface`, `--menu-on-surface`, `--menu-line`, `--menu-card-line`, `--menu-muted`, `--menu-card-muted`, `--menu-fill`, `--menu-on-fill`, `--menu-font`, `--menu-display`, `--menu-script`, `--menu-radius` and, for a drawn texture or the veiled page photo, `--menu-backdrop-image`; never the app's own tokens, so a customer's theme does not depend on the app's light or dark mode. The accent is drawn as shapes only (bars, outlines, patterns), never as text; text on a filled shape uses `--menu-fill` and `--menu-on-fill`, and `fillOf` nudges the fill until that pair reads at 4.5:1. How a card, a title, the header and the line art are drawn comes from `useLook()` (a context `MenuView` sets); those components never read the theme themselves.
- **The page photo is one screen tall.** `MenuView` draws it on a layer of its own under the content (`aria-hidden`), sticky at the top of the box that scrolls (the page, or the preview frame), so it stays put while the menu scrolls and is drawn at the size of the screen instead of being stretched over the whole length of the menu. The frame around the menu gives two hints: `--frame-screen`, the height of the screen (the preview frame's inside; `100vh` when none is given, which phones count with their toolbars hidden), and `--frame-bleed`, how far the photo may reach past the menu (the public page's gutters around the 720 px column). The public page clips what goes past it with `overflow: clip`, never `hidden`, which would make a scroll box and unstick the photo and the category row. The fit and the position reach the CSS as two more list values (`data-menu-backdrop-fit`, `data-menu-backdrop-position`). On a screen wider than 1.5 times the photo's own width (`PHOTO_UPSCALE_MAX`, `usePhotoBackdrop`), the menu paints the texture of the style the look started from instead (plain for Classic), and the photo comes back on a narrower screen. The photo's size is read by loading it, never from its pixels, so this needs no CORS. Only the width counts, so the Design preview and a phone agree: under "Fill the screen" a landscape photo on a tall screen is still enlarged by its height.
- **Every product has a picture slot.** A card draws the owner's picture (`ProductPhoto`), or, when the item has none, a flat line illustration chosen from the words of the item and the kind of business (cup, iced drink, boba, bowl, plate, pastry, cake slice, burger, cocktail; `placeholders.ts`). The name is read before the category, and a plural or a compound ("burgers", "cheeseburger") counts. The cut-out shape suits only a picture with see-through parts: `ProductPhoto` reads the pixels on a small canvas and frames an all-opaque photo with rounded corners instead (a picture it may not read counts as opaque, so the real storage's CORS must allow reading). A picture goes only through `pictureSrc` (section 7.10).
- **Sized by its own width.** The renderer uses container queries, never viewport media queries, so one menu fits a phone, a small preview frame and a desktop column. The root says how many columns its card kind takes (`data-menu-columns`: one, many or wide).
- **Fonts load on demand.** Urbanist and Instrument Serif come with the app. The other pairings (Playfair Display, DM Serif Display, Anton, Fredoka, Pacifico) are self-hosted `@fontsource` packages, imported by `useMenuFonts` only for a menu that uses them, so the landing page and the other menus download none of them. The script face (Pacifico) is also loaded for a script title or header.
- **Safety:** colors are `#rrggbb` and rebuilt from the parsed value; every other choice is one value of a fixed list, and an unknown value falls back to the default, even from a theme that skipped `validateTheme`. Nothing a person typed reaches CSS or HTML: the `data-menu-*` attributes only ever hold our own list values.
- **Contrast guard:** `themeIssues` warns in the Design page when the text on the page is under 4.5:1 or the accent is under 3:1, and offers a one-tap fix. Card and muted colors are derived so that their text stays at 4.5:1.
- **Tests that keep it honest:** every style in both modes is tested for contrast (the text on the page at 4.5:1, the accent at 3:1, a dark mode has a dark page). `src/shared/menu/menuStyleRules.test.ts` reads every menu stylesheet and refuses a color literal, a variable that does not exist, text in the accent, and a text color on a ground it was not made for. Vitest does not load CSS, so the rules that matter (columns, strikes, patterns) are read from disk with `src/test/css.ts`.
- **Developer pages (development server only):** `/__styles` draws every style on a sample menu (`?style=`, `?mode=`, any single choice, `?width=360`), and `/__look` draws the Design page's Look tab with no sign-in.

## 4. Domain Model

```
User 1--* Business 1--* Category 1--* Product 1--* Variant
                   Business 1--* ModifierGroup 1--* ModifierOption
                   Product *--* ModifierGroup
Built today (src/entities):
Business: id, slug, name, tagline, types[], logo, phone, address, hours, social, theme, published   (one business per owner)
Category: id, name, visible            (the order of the array is the order on the page)
Product:  id, categoryId, name, description, price, variants[], tags[], available, image, groupIds[]
ModifierGroup: id, name, required, min, max, options[]
Preset:   type, categories, theme, groups, sizes, samples
Order:    reference, items[] (platform, quantity), delivery details, status, total, createdAt
Target (database): Business also has ownerId, settings, plan, status, version; every row has businessId.
```

Rules:
- Money stored as integer minor units plus currency code. Never floats.
- `Business.version` increments on every publish. It is used for cache busting and optimistic concurrency.
- Target: draft and published copies are separate, so owners edit safely and publish in one atomic step. Today there is one copy and a `published` switch; an edit shows on the public link when it is saved. The menu is live when it is published AND the trial or plan is running (`isMenuLive`).
- Slugs: lowercase, a-z 0-9 and hyphen, reserved-word blocklist, unique, with a redirect table so the link on an NFC card never breaks. Today (no server) there are no redirects: the app asks before a link changes and says that written cards and printed QR codes stop working, and every link a business had stays reserved for it, so it can never open another business's menu.
- Every tenant row carries `businessId`. All queries filter by it.
- `Order` is platform data, not tenant data: a card sale from the landing page, so it has no `businessId`. Its delivery details are personal data and follow section 7.8. Status goes New, then Confirmed, then Delivered, or Cancelled.

## 5. Backend Architecture (target, not built yet)

- **Style:** a simple stateless API (REST or RPC), validated at the boundary, thin handlers, logic in services, data access in repositories.
- **Auth:** managed provider or hardened in-house. Passwords hashed with a modern slow hash (Argon2id or bcrypt). Short-lived access token plus rotating refresh token in an HttpOnly, Secure, SameSite cookie. Owners sign in with Google or with email and password (Supabase Auth); the email is the username. Supabase JS keeps the session in localStorage by default, which section 7.3 forbids, so the session must use cookies (Supabase's cookie-based server sessions or a small server in front). Until then `AuthRepository` (`src/data/auth.ts`) is a mock: accounts live in the tab's memory, passwords only as salted hashes, nothing in storage.
- **Tenancy:** row-level security on `businessId`. The owner id comes from the session, never from the request body.
- **Storage:** object storage for images. Uploads go through signed URLs with type and size limits. The server re-checks type by content (magic bytes), re-encodes images, and strips metadata.
- **Publish pipeline:** on publish, build one denormalized, versioned JSON snapshot of the menu, store it, and push it to the CDN. The public page reads only this snapshot, never the live tables.
- **Jobs:** background queue for image processing, snapshot builds, emails, and audit shipping. Request handlers stay fast.
- **Config:** secrets in a secret manager, loaded at runtime. Separate dev, staging, prod.

## 6. Database Design Principles

- Relational database, normalized, foreign keys, and constraints enforced in the DB (not only in code).
- UUID primary keys. `created_at`, `updated_at`, soft delete where recovery matters.
- Indexes only for real queries: `(business_id)`, `(business_id, category_id, sort_order)`, unique `(slug)`.
- Migrations only, versioned and reviewed. No manual schema edits in prod.
- Separate DB roles: `app_rw` (runtime), `migrator` (schema), `readonly` (analytics/support). Runtime role cannot drop or alter.
- No raw string-built SQL. Parameterized queries or the ORM/query builder only.
- Row-level security as the backstop for tenant isolation.
- Analytics events (taps, views) go to a separate append-only store so they cannot slow the menu or bloat the main DB.

## 7. Security Architecture

### 7.1 Target level per area

Levels use the general scale (Basic, Standard, Intermediate, Advanced, High, Enterprise). Do what the stage needs; do not over-build early.

| Area | MVP (frontend + mock) | Launch (real clients) | Growth (50+ clients, paying) | Later / if needed |
|---|---|---|---|---|
| App security | Basic + start of Standard | Intermediate | Advanced for owner and admin | High |
| Database | Level 1 | Level 3 | Level 4 | Level 5, then 6 on demand |
| Infrastructure | HTTPS, security headers | CDN, WAF, rate limits | Central monitoring | Zero-trust, DR drills |

Enterprise-grade items (zero-trust, advanced threat detection, full DR) are optional until there is revenue and scale. They are listed so the design does not block them.

### 7.2 Threat to control map

Layer: **F** frontend, **B** backend, **D** database, **I** infrastructure.

| Threat | Main controls | Layer |
|---|---|---|
| SQL injection | Parameterized queries only, ORM, least-privilege DB user, validate input | B D |
| XSS | React escaping by default, no `dangerouslySetInnerHTML` with user data, strict CSP (no inline scripts), sanitize rich text if ever allowed, `Trusted Types` where possible | F I |
| CSRF | SameSite cookies, CSRF token or custom header on state-changing calls, check `Origin` | F B |
| Brute force / credential stuffing / password spraying | Per-IP and per-account rate limit, progressive delay, lockout with safe unlock, breached-password check, MFA, bot challenge on repeated failure | B I |
| DoS / DDoS | CDN absorbs traffic, static cached public menu, edge rate limits, request size and time limits, autoscaling, WAF rules, origin hidden behind CDN | I B |
| MITM | HTTPS only, HSTS with preload, TLS 1.2+, no mixed content | I |
| Phishing | Strict email domain auth (SPF, DKIM, DMARC), clear sender, MFA, no credentials in links, warn on new-device login | I B |
| Session hijacking / fixation | HttpOnly, Secure, SameSite cookies, rotate session id on login and privilege change, short lifetime, revoke on logout, device list | B |
| Broken auth | Proven auth library or provider, hashed passwords, email verification, safe reset flow with single-use expiring tokens | B |
| Broken access control / privilege escalation / IDOR | Server-side authorization on every endpoint, RBAC, owner id from session, tenant filter plus row-level security, deny by default, tests for cross-tenant access | B D |
| Directory traversal / LFI / RFI | Never build file paths from user input, storage by generated id, no server-side include of user paths | B |
| RCE / insecure deserialization / XXE | No `eval`, no unsafe deserialization, JSON only with schema validation, disable XML external entities (avoid XML), patched runtimes | B |
| SSRF | No user-supplied URL fetched by the server, or strict allow-list, block private IP ranges, egress filtering | B I |
| Clickjacking | `frame-ancestors 'none'` in CSP and `X-Frame-Options: DENY` (public menu embedding off by default) | I |
| DNS spoofing / hijacking | Registrar lock, DNSSEC, 2FA on registrar and DNS, CAA records, monitor records | I |
| HTTP request smuggling / host header injection | Managed CDN and proxy, consistent HTTP parsing, host allow-list, ignore client `X-Forwarded-Host` unless trusted | I B |
| Cache poisoning | Cache key includes only intended inputs, ignore unkeyed headers, static snapshots, correct `Vary` | I |
| Open redirect | Redirect only to allow-listed relative paths, never to a raw `next=` URL | F B |
| API abuse / API key theft | Auth on all non-public routes, per-user and per-IP quotas, schema validation, pagination caps, no secrets in the frontend, short-lived scoped tokens, rotate keys | B I |
| File upload / web shell / malware | Type and size allow-list, check magic bytes, re-encode images, random file names, separate origin for uploads, never executable, serve with `nosniff`, optional malware scan | B I |
| Supply chain | Lockfile committed, `npm audit` in verify, pin versions, minimal dependencies, review new packages, no install scripts from unknown packages, SBOM later | F I |
| Zero-day | Fast patching, dependency update routine, WAF virtual patching, defense in depth, monitoring | I |
| Business logic abuse | Server-side validation of limits (items per plan, price range, slug rules), idempotent writes, rate limit on signup and publish | B |
| Account takeover | MFA, new-device alerts, secure recovery, session revoke-all, rate limits, breached-password check | B |
| Defacement | Tenant isolation, least privilege, immutable build artifacts, CDN-served read-only snapshots, audit log, backups | B I D |
| Database exfiltration | Least privilege, encrypted connections, encryption at rest, no public DB endpoint, row-level security, query limits, activity logs, backups | D I |
| Server misconfiguration | Infrastructure as code, hardened defaults, no debug in prod, no verbose errors, security headers, config scanning | I |

### 7.3 Frontend security checklist (enforce now)

- [ ] No `dangerouslySetInnerHTML`, `eval`, `new Function`, `document.write`, or inline event handlers.
- [ ] All external data validated before use (API, URL params, forms): hand-written validators that take `unknown`.
- [ ] User-provided URLs (links, images) accepted only with `https:` and, for images, our storage origin. Reject `javascript:` and `data:` schemes. (Demo only: an upload comes back as a base64 `data:` image, accepted only when its first bytes are a real JPEG, PNG or WebP. It asks the network for nothing, and the real server never produces one. An https picture is shown or kept only when it is on the storage origin, `VITE_STORAGE_ORIGIN`; with none set, no https picture is shown. The menu renderer and the mock repository both apply this, `isTrustedPicture` in `src/config/pictures.ts`, and the real server must enforce the same rule on its side.)
- [ ] Links with `target="_blank"` use `rel="noopener noreferrer"`.
- [ ] Theme and text values never become raw CSS or HTML.
- [ ] No tokens or secrets in code or `localStorage`. Session lives in HttpOnly cookies.
- [ ] Only `VITE_`-prefixed values reach the bundle, and none of them is a secret.
- [ ] Output encoding on all rendered user text (default in React; keep it that way).
- [ ] Client-side validation is for UX only. The server always re-validates.
- [ ] Error messages never expose internals.
- [ ] Dependencies minimal, lockfile committed, `npm audit` clean.

### 7.4 Security headers (set at CDN or host)

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
                         img-src 'self' https://<storage-origin> data:; font-src 'self';
                         connect-src 'self' https://<api-origin> https://psgc.gitlab.io https://nominatim.openstreetmap.org
                                     https://tiles.openfreemap.org;
                         worker-src 'self'; frame-ancestors 'none';
                         base-uri 'self'; form-action 'self'; object-src 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Cross-Origin-Opener-Policy: same-origin
```

(`style-src 'unsafe-inline'` is a known trade-off for runtime theme variables; revisit with nonces or a style-sheet approach. MapLibre also sets styles from JavaScript, which that rule already allows.)

`geolocation=(self)` lets our own page ask for the customer's position, and only when they press "Use my current location" on the delivery map.

The map and geocoder origins above are the public OpenFreeMap and Nominatim ones. If `VITE_MAP_STYLE` or `VITE_GEOCODER_API` point elsewhere, change `connect-src` to match, and add every other origin that the style names for its tiles, sprites and glyphs. The map fetches the style, tiles, glyphs and sprites with script, so they fall under `connect-src`, not `img-src`. MapLibre 6.11 decodes images with `createImageBitmap` and uses a `blob:` image only in a browser that lacks it, so add `blob:` to `img-src` only if a real browser check shows it is needed.

`worker-src 'self'` is for the map's worker, a file from our own origin (no `blob:`). Send the header on that file too: a worker follows the policy of its own response, not the page's.

Keep `Referrer-Policy` at `strict-origin-when-cross-origin` or looser: the map and the lookup send our origin, and only the origin, as the Referer (`referrerPolicy: 'strict-origin'`), and Nominatim's policy asks for a valid one.

### 7.5 Rate limits and tokens

| Endpoint | Limit (starting point) | Key |
|---|---|---|
| Public menu snapshot | Very high, served from CDN cache | IP (edge) |
| Login | 5 per 15 min per account, 20 per 15 min per IP, progressive delay | account + IP |
| Signup | 3 per hour per IP | IP |
| Password reset / email verify | 3 per hour per account | account + IP |
| Owner write APIs | 60 per min per user | user |
| Image upload | 20 per hour per user, **4 MB max per picture** (a product image or the logo), one image per product | user |
| Invite / claim link | Single use, expires (for example 7 days), 10 created per day per reseller | reseller |
| Admin APIs | Strict, IP allow-list optional, MFA required | user |

Token policy:
- Access token 10 to 15 min. Refresh token rotating, single use, stored hashed, revoked on reuse (theft detection).
- Reset, verify and invite tokens: random, single use, hashed at rest, expire in minutes to hours.
- Never put tokens in URLs or logs.
- Return `429` with `Retry-After` when limited. Same error text for unknown user and wrong password.

### 7.6 Audit, monitoring, response (Advanced and up)

- Audit log (append-only): login, logout, failed login, password change, MFA change, publish, role change, deletes, admin actions. Includes actor, tenant, time, IP, request id. No secrets or full PII in logs.
- Centralized logs and alerts on spikes in failed logins, 4xx and 5xx, rate-limit hits, and admin actions.
- Backups: automated, encrypted, restore tested on a schedule. Point-in-time recovery when the DB provider supports it.
- Incident response: a short runbook (detect, contain, rotate secrets, restore, notify, review). Penetration test before wide launch.

### 7.7 Roles (RBAC)

| Role | Can |
|---|---|
| `customer` (anonymous) | Read published menu |
| `owner` | Edit own business only |
| `reseller` | Create invite / claim links, see status of referred clients. Cannot read or edit business content after the owner claims it, cannot see credentials |
| `staff` (later) | Limited edits on own business (availability, products) |
| `admin` | Platform tools, MFA required, every action audited |

### 7.8 Orders and personal data ("Get now" form)

The review card offer has a "Get now" form. It collects: the chosen cards and how many of each, full name, PH mobile number, a pin on the map, province, city, barangay, street, and a landmark with the exact location. This is personal data (Data Privacy Act), so it follows these rules.

- **Purpose limit:** used only to confirm, deliver and set up the order. The form says so and needs an explicit consent checkbox.
- **Client checks are for speed only.** The server repeats every check (`src/entities/order/validate.ts` is the reference): length limits, character allow-list, PH mobile format, the card lines (each platform once, a whole quantity from 1 to 20, `MAX_QUANTITY`).
- **The server decides the price** from the items: number of cards times the card price it keeps itself (₱379 each to start). The form never sends a price.
- **Offers are set by the admin** at `/admin/pricing` through `PricingRepository` (`src/data/pricing.ts`): for the NFC card, the monthly and the annual package, a regular price in whole pesos (₱1 to ₱100,000), a percent discount (0 to 90, rounded to the peso), and up to 8 included items (2 to 80 characters, plain text, shown with check marks). A year may not cost more than 12 months at regular prices. Rules in `src/entities/pricing/pricing.ts`. Customers pay the discounted price, and the order form totals with it. The landing page and the order form read them from the same repository. In demo mode they live in the tab's memory and reset on reload. A real adapter needs admin sign-in with MFA, the server repeats the checks, writes an audit entry for each change, and charges new orders from its own copy. Orders already placed keep their total.
- **Place lists:** province, city and barangay are chosen from lists, not typed. `LocationRepository` (`src/data/locations.ts`) reads the free public PSGC API (`https://psgc.gitlab.io/api`: static JSON, CORS open, no key), or the origin in `VITE_LOCATIONS_API`. That origin must be in CSP `connect-src`. A request carries only a PSGC code: no cookies, no referrer, nothing the customer typed. The host still sees the visitor's IP and which place was opened. Every response is checked before use: codes must be digits (they end up in a URL path), names are cleaned until they pass the same place rule as the server (`PLACE_NAME` in `validate.ts`), lists have a size cap, and a request times out after 12 seconds.
- **Limits of that data:** it dates from August 2022 (81 provinces, so Maguindanao is not split yet) and stops at the barangay, so sitio and purok go in the street field. Metro Manila has no provinces, so the adapter adds it as a province and reads its cities from the region. Two cities are listed under no province (City of Isabela, City of Cotabato); the adapter adds them to Basilan and Maguindanao. "City of Cebu" is written "Cebu City".
- **Delivery pin (required):** the customer places a pin on a map so the rider can find the door. `validateOrder` (`src/entities/order/validate.ts`) wants real numbers inside a loose box around the Philippines (`isInPhilippines`, `src/entities/location/pin.ts`) and rounds them to 5 decimals (about 1 m). The one way out is a map that could not load for this customer (the script fails, the browser has no WebGL, the style cannot be read, which counts at once, or the tiles never arrive: four failed requests, or 15 seconds with nothing drawn): the map panel then adds a hidden `mapUnavailable` field that only `validateOrder` reads in the browser, and the order may go without a pin, so a free outside service never blocks an order. `mapUnavailable` is not part of `Order`. The pin travels with the order as `pin: { lat, lng }`, and when it is missing the server sees an order with no `pin` and cannot tell an outage from a skipped pin. So the server must accept an order without a pin (the admin shows "No pin", and the rider can confirm the address by phone) and must check a pin only when it is present: real numbers, plain decimals only, inside the box. A keyboard or screen-reader customer places the pin with "Pin the center of the map" or "Use my current location", because a marker cannot be dragged with the keyboard. A search only moves the map to the place; "Pin the center of the map" then places the pin there.
- **Map and lookup services:** MapLibre GL loads only when the customer presses "Open the map" (its own lazy chunk: with maplibre-gl 6.11.2 it builds to about 280 KB gzip of script (1.03 MB raw) plus 11 KB gzip of CSS, and the worker file is another 145 KB gzip (509 KB raw), fetched when the map starts, so about 435 KB gzip in all, where the Leaflet it replaced was about 52 KB). The map comes from the public OpenFreeMap "Positron" style (`VITE_MAP_STYLE`); the style, tiles, glyphs and sprites are all on `tiles.openfreemap.org`. The address lookup and the "find a place" search come from Nominatim (`VITE_GEOCODER_API`; the search runs on submit only, never as autocomplete). Nothing is requested before the map opens. Both default to the public servers: free, no key, no SLA, and Nominatim is for light use only. Nominatim's policy: at most 1 request per second (`src/data/geocoder.ts` queues calls 1.1 s apart, drops stale ones, caches answers, and after a busy answer (429, 403 or 5xx) makes no request at all for 30 s, so the form shows its "lookup is busy" message and keeps the pin), and a valid Referer: every map and lookup request sends `referrerPolicy: 'strict-origin'`, so the Referer is our origin and never a path. OpenFreeMap asks for its credit to be shown: `MAP_CREDITS` (`src/config/map.ts`) is drawn by React in the bottom-right corner of the map, always visible, as fixed text and links that open in a new tab with `rel="noopener noreferrer"`. MapLibre's own attribution control is off, because it writes text that arrives with the style into the page as HTML, and nothing from outside is ever rendered as HTML. **What they learn:** OpenFreeMap sees the visitor's IP address and the area on screen (from the tiles it is asked for); Nominatim sees the IP address and the pin or the search text. Both see our origin as the Referer. The form says so in one sentence next to the map (`copy.order.map.privacy`). Coordinates are personal data: same purpose limit and retention as the delivery details, deleted with the order, never in logs, analytics or error reports. Both addresses are build-time env values, so changing a service takes a redeploy (open question 10 in `PROJECT_FLOW.md`). The style must be a plain https address (no spaces, no braces, no user name or password; a query string for a provider key is fine) and the geocoder must be https. A value that does not fit is ignored, with a console warning that never prints the value, and the public service is used instead. Move to our own style and tile host or a paid provider before real traffic, and change `MAP_CREDITS` (`src/config/map.ts`) and the privacy sentence (`copy.order.map.privacy`), which name OpenFreeMap and OpenStreetMap, together with it.
- **Map limits and look:** the map is held to the Philippines. It starts on the whole country (`MAP_START`), cannot zoom out past zoom 5, and cannot be moved outside the `PH_BOUNDS` box plus six degrees on each side (the library keeps the view inside those bounds, so a tighter box would zoom the start view in and cut the country off); the search asks Nominatim for `countrycodes=ph` only. It is light only: one style and no dark variant, so it stays light when the site is dark. Its zoom buttons and its credit follow the site theme, and the credit sits on a mostly opaque chip in the theme's surface color so that it stays readable on the light map in both themes (a test works out the contrast from the real tokens). It is drawn with WebGL, and a browser without it is treated like any map that cannot load: the order goes on without a pin. **Zoom numbers:** the app counts zoom the OpenStreetMap way, in 256-px tiles (`MAP_START.zoom`, `MIN_PIN_ZOOM`, the zoom limits, the zooms used after a search or a location fix, and every test). MapLibre counts 512-px tiles, so for the same view its number is one lower. The map renderer converts in one place, and nothing outside it has to know.
- **From pin to address:** `resolveAddress` (`src/data/resolveAddress.ts`) matches the lookup to the PSGC lists and never guesses. The lookup often has no province (in a probe of 45 places across the country it had one for 19, and never for Metro Manila or most independent cities), so the city is found first from the full list `LocationRepository.allCities()` (one request of about 390 KB, only for the first pin that names a city, with no pin data in it), and the province is the city's. Cities that share a name are told apart by the province, then city versus municipality, then region. The barangay is filled only when exactly one barangay fits; two fits, or none, leave it empty for the customer to choose. In that probe: city and province for 44 of 45 places, and a barangay for 29, a tie for 12, none for 3 (the barangay sits under `village`, `suburb`, `quarter`, `neighbourhood`, `city_block` or `hamlet`, and often under several at once). Text from the map is cleaned and never trusted. Province, city and barangay are only compared with the lists, so the customer sees our own PSGC names. The road and house number are the exception: they are cleaned to the street rules and suggested in the street box, and the server treats that street like any typed text. Search results are listed by their map label, as plain text. A pin fills the street box only when it is empty or still holds the pin's own earlier suggestion, so it never overwrites what the customer typed.
- **Typing is the way out.** If a list cannot be loaded, or the place is missing, the three fields turn into text boxes (what was chosen stays), so an order is never blocked. The server cannot tell a chosen name from a typed one: it validates the text like any other input and must not assume it matches the PSGC. A real backend that wants clean places has to check them against its own copy of the PSGC.
- **Abuse controls:** hidden trap field (silent drop), rate limit per IP and per phone number (for example 3 orders per hour per IP), request size cap, bot challenge when abused, 429 with `Retry-After`.
- **Transport:** HTTPS endpoint only (`VITE_ORDERS_ENDPOINT`), no cookies, no referrer, add the endpoint to CSP `connect-src`.
- **Storage:** encrypted at rest, row-level security, readable only by the owner and assigned staff, not copied into logs, analytics or error reports. Keep the personal fields apart from the order row so they can be deleted on their own.
- **Retention:** delete delivery details after fulfilment plus a short support window (decide the number of days). Support access to the data is audited.
- **Admin path:** the admin reads every order and changes its status through `AdminOrderRepository` (`src/data/adminOrders.ts`). It shows sample data, kept in memory, until a backend exists. An order's pin shows as coordinates and an "Open pin in Google Maps" link (a new tab with `rel="noopener noreferrer"`). For now the repository returns every order and the lists are cut into pages in the browser; with real data the repository has to filter, count and page on the server. A real adapter needs admin sign-in with MFA, row-level security, and an audit entry for each read and each status change.
- **Privacy notice:** a short notice and a link to the Privacy Policy must exist before launch (still to write). It must say that the pin, the words they search for, the visitor's IP address and the area they look at go to the map and lookup services (OpenFreeMap and OpenStreetMap's Nominatim today), and that the admin's "Open pin in Google Maps" link shares the coordinates with Google when it is opened.
- **Today:** no backend is connected. Without an endpoint the form runs in demo mode and says nothing was sent.

### 7.9 Owner accounts, trial and plan payments

Owners need an account for everything they buy: "Get your card" and "Get now" open the sign-up modal first. "Get now" comes back to the home page with the order form open (`/?order=cards`, the only non-owner path `safeNext` allows).

- **Trial:** the server starts a 7-day trial at sign-up (`TRIAL_DAYS`, `src/entities/account/subscription.ts`). The owner's menu website can be live during the trial: it is live once the owner has published it and the trial or plan is running (`isMenuLive`), and a draft is never visible. (In demo mode the trial starts the first time the dashboard loads the account, on any dashboard page, the setup wizard included.)
- **Free cards:** every account carries 2 free NFC cards that open the owner's menu website (`FREE_WEBSITE_CARDS`). They are sent only once a plan is paid, so a trial costs nothing to hand out. One set per account; the server must also limit it per phone number and delivery address, because emails are cheap to make.
- **Plans:** monthly or annual, at the prices the admin sets (section 7.8, discount included). The server reads the price from its own offers, never from the browser.
- **Payments: hosted checkout only (PayMongo, planned).** The browser asks the server to start a checkout, gets back the provider's checkout address and goes there. Card details never touch our pages or servers (PCI SAQ A). Rules:
  - The secret key lives only on the server. Nothing payment-related goes in a `VITE_` value.
  - The browser goes only to an allow-listed checkout host over `https` (`isCheckoutUrl`, `src/data/billing.ts`). Anything else is refused, so a bad response cannot become an open redirect.
  - **Only the provider's signed webhook turns a plan on.** Verify the signature, ignore repeats (idempotency by event id), and check the amount and currency against our own price. The return page after checkout only shows "processing"; it changes nothing.
  - Every plan change gets an audit entry. No card data or full payment payloads in logs.
- **After the trial or a paid period:** the menu is paused, never deleted (`isMenuLive`). The public menu shows a "not available" page and the NFC link keeps working, so it comes back as soon as a plan is paid. An open dashboard notices the end by itself (`nextAccessChange`, `useTimeAt`).
- **Today:** `BillingRepository` (`src/data/billing.ts`) is a mock. Each owner's standing lives in the tab's memory, the trial starts the first time the account page asks, and "checkout" turns the plan on at once without taking any payment. The account page says so. There is no checkout return page yet.
- **CSP:** going to the checkout is a navigation, not a fetch, so `connect-src` does not change. `form-action` stays `'self'`.

### 7.10 Owner dashboard: the business, the menu and pictures

What an owner types becomes public on the menu, so it is checked before it is kept.

- **One check, twice.** Every input goes through a validator in `src/entities/**` (`validateNewBusiness`, `validateBusinessPatch`, `validateCategoryInput`, `validateProductInput`, `validateGroupInput`, `validateTheme`). Each takes `unknown`, never throws, never changes its argument, and gives back the clean value or the refused fields. The pages use them for instant feedback, and the repository runs them again. The real server must run the same rules (it cannot trust the browser).
- **Text:** cleaned (control characters out, spaces collapsed), length-limited (`LIMITS`, `BUSINESS_LIMITS`), and rendered as React text only. Nothing is ever put in as markup. Prices are integer centavos.
- **Links:** the owner's social links must be https on the network's own domain (Facebook, Instagram, TikTok; the website may be any https address), with no user name or password (and, for the three networks, no port). They open with `rel="noopener noreferrer"`. The phone becomes a `tel:` link of digits and a leading plus only.
- **Pictures:** JPEG, PNG or WebP, decided from the file's first bytes and never from its name or declared type; at most 4 MB; no SVG. In demo mode an upload comes back as a base64 data URL (`data:` is already in `img-src`); `checkImageAddress` accepts only none, such a data URL whose bytes match its type, or an https link, and refuses `blob:`. The real flow is a signed upload to our storage, where the server re-encodes, resizes and strips metadata (sections 5 and 8), and `img-src` names the storage origin.
- **The look:** see section 3.4. Colors, fonts and corners come from fixed maps, and every other choice (card, picture shape, titles, header, line art, backdrop) is one value of a fixed list; nothing typed reaches CSS. The fonts are self-hosted packages, so `font-src 'self'` stays, and the placeholder illustrations are inline SVG, so they ask for nothing.
- **The link on the cards:** a slug is checked (`isValidSlug`, the blocklist, taken or not) before it is created or changed. Changing it asks first and says plainly that written cards and printed QR codes stop working. The real server keeps a redirect table (section 4) and rate-limits the availability check, because it tells anyone which links are taken.
- **The address on the cards:** menu links start with `VITE_PUBLIC_ORIGIN` (`menuLink()` in `src/features/dashboard/menuLink.ts`), never with the address the dashboard happens to be open on, because a card keeps its link for good. While it is empty (development) the address of the page is used. A production build warns while it is empty (a plugin in `vite.config.ts`). When the page is open on another address, the Share page says so next to the link and the QR code. Before launch: set it to the final domain and redirect every other host (previews, the platform's own address) to it, or a card written from one of them breaks.
- **Where pictures come from:** `VITE_STORAGE_ORIGIN` is the one https origin that serves owners' pictures, and the CSP `img-src` names the same origin. A picture from any other host is neither shown (`pictureSrc` in `src/shared/menu`) nor kept (the mock repository refuses it, as the server must). Until a storage exists the demo keeps uploads as checked `data:` addresses.
- **What becomes public:** a published menu shows the name, tagline, logo, phone, address, hours, social links and the items. The Design page says so next to the fields, and the Share page repeats it before the publish switch. The menu collects nothing from customers.
- **QR code:** drawn in the browser from the menu link with `uqr` (MIT, no dependencies, pinned to 0.1.3; only `encode` is used, and the SVG is built as React elements, never injected as markup). No QR service is called, so no link leaves the browser. The code stays black on white in both themes. Downloads use blob URLs that are freed afterwards.
- **Demo mode:** `OwnerRepository` (`src/data/owner.ts`) keeps each owner's business in the tab's memory. The shell says "Demo: resets on reload", and the Overview's visitor numbers are labeled "Sample data" (seeded from the slug, not measured).
- **Server rules to keep when it exists:** the owner id comes from the session, never from the request; every row carries `businessId` with row-level security; limits and rate limits on uploads, saves and the slug check; an audit entry for publish, link change and plan changes. A link a business had stays reserved for it (a redirect table needs that), so a business that changes its link again and again holds every old name: the server needs a cumulative cap on link changes per business (the number and the window are a product decision, open question 14 in PROJECT_FLOW.md), and the reservations of an account that never paid should be released after a grace period. The mock has no cap.

## 8. Scalability and Bottleneck Avoidance

- **Read path is static.** The public menu is a versioned JSON snapshot on a CDN. A viral tap burst never hits the database.
- **Write path is small and isolated.** Only owners write, rarely. Heavy work (images, snapshot builds) goes to a queue.
- **Stateless API** so it scales horizontally. No in-memory sessions.
- **Avoid N+1 queries.** Fetch with joins or batched queries, add pagination caps everywhere.
- **Cache with versions.** Cache key includes `Business.version`. Publish invalidates by version, not by purge storms.
- **Images:** resized variants, modern formats, CDN, lazy loading. The biggest payload is images, not code.
- **Frontend:** route code splitting, tree shaking, no heavy libraries on the public route, preconnect to API and image origin.
- **Multi-tenant limits:** no product-count limit for now (product decision). Image upload is capped at 4 MB per picture (a product image or the logo). The editors also cap what one menu holds (40 categories, 30 add-on groups, 20 options per group, 8 sizes per item), so a paste gone wrong stops early. Because storage is otherwise unbounded, keep a hidden abuse ceiling (for example a generous max products and total storage per business) enforced server-side, plus rate limits, so one client cannot degrade the rest or run up the bill. Raise the ceiling per business on request.
- **Images:** the 4 MB limit is the upload cap. The server re-encodes to resized WebP/AVIF variants, so what customers download is far smaller.
- **Observability:** request ids, basic metrics (latency, error rate, cache hit rate), so bottlenecks are measured, not guessed.
- **Cost control:** rate limits and quotas also protect the bill.

## 9. Maintainability

- TypeScript strict, types written once in `entities` with their validators next to them.
- Typecheck, oxlint, tests, secret scan and `npm audit` in one `npm run verify`. No formatter yet. The git hooks run it before every commit and every push. The tests run in two workers with a 30 s timeout (`vite.config.ts`), and the dashboard page harness (`src/test/dashboard.tsx`) waits up to 5 s for the data, and `src/test/setup.ts` lets `findBy` and `waitFor` wait up to 10 s, so a machine with little free memory stays steady; the run still takes about 7 to 16 minutes.
- Tests: pure logic unit tests (theme, presets merge, money, slug, validation), component tests for the menu, a few end-to-end flows (tap link, view menu, pick add-on). Security tests: cross-tenant access, rate limit, input rejection.
- Conventional commits, small PRs, changelog for releases.
- Docs updated with the change (`ARCHITECTURE.md`, decision log).
- ADR-style decision log in `PROJECT_FLOW.md`.
- Feature flags for risky or unfinished features.

## 10. Build Order (frontend first)

1. Tooling: strict TS, lint, `verify` script, `.env.example`, `.gitignore` check. No formatter is used (section 9).
2. Folder structure from section 3.1, router, error boundary, providers.
3. Design tokens and theme engine (`toCssVars`, contrast guard). Done.
4. Shared UI kit (Button, Switch, Tabs, Modal and ConfirmDialog, fields, Skeleton, the app shell). Done; Card, Sheet and Toast were not needed.
5. Entities and their validators, and the `OwnerRepository` interface with the mock adapter. Done; the `PublicMenuRepository` came with step 6.
6. Public menu `/m/:slug` for five sample businesses, the owner's preview at `/dashboard/preview`, and the menu styles (section 3.4). Done on the mock `PublicMenuRepository`; the product detail view and the add-on picker are not built.
7. Presets and `mergePresets()`. Done.
8. Auth screens and onboarding (against a mock auth adapter). Done: the sign-up modal and the setup wizard.
9. Owner dashboard editors with live preview. Done, on the mock repository.
10. Security headers config, CSP check, bundle size budget check.
11. Backend, database, and infrastructure phases (separate plan when we start).

## 11. Backup and Recovery Plan

Applies once the real backend exists. Frontend is stateless and rebuilt from git.

### 11.1 What we protect

| Asset | Where | Criticality |
|---|---|---|
| Business, menu, theme data | Database | Critical |
| Product images | Object storage | High (can be re-uploaded, but painful) |
| Owner accounts and emails | Auth / database | Critical |
| Slug redirect table | Database | Critical (permanent NFC links depend on it) |
| Published menu snapshots | Object storage / CDN | Rebuildable from the database |
| Source code and config | Git | High |
| Secrets | Secret manager | Critical (store a recovery copy offline) |
| Domain and DNS | Registrar | Critical (losing the domain breaks every card) |

### 11.2 Targets

| Item | Target |
|---|---|
| RPO (max data loss) | 24 h at launch. 5 min once point-in-time recovery is on |
| RTO (max downtime) | 4 h at launch. 1 h later |
| Public menu during an outage | Keep serving the last cached snapshot from the CDN (read path stays up) |

### 11.3 Backup rules

- **Database:** automated daily full backup plus point-in-time recovery when available. Retain 7 daily, 4 weekly, 3 monthly.
- **Images:** versioning on the bucket, plus a periodic copy to a second region or provider. Deleted objects stay recoverable for 30 days.
- **Encryption:** backups encrypted at rest and in transit. Backup credentials are separate from runtime credentials.
- **Offsite:** at least one copy outside the primary provider and account.
- **Config and infrastructure as code** in git. Secrets list (names only, no values) documented so they can be recreated. A sealed offline recovery copy of master secrets and registrar access.
- **Domain:** registrar lock, 2FA, auto-renew, and a second admin contact. Renewal date on the calendar.
- **Immutability:** delete protection on backups so an attacker or a mistake cannot wipe them.

### 11.4 Restore tests

- Monthly: restore the latest database backup into a scratch environment and run a smoke test (load three sample menus, verify row counts).
- Quarterly: full disaster drill (rebuild from git, restore database and images, repoint DNS) with timing recorded against the RTO.
- A backup that was never restored is treated as not existing.

### 11.5 Recovery runbooks (short)

| Scenario | Steps |
|---|---|
| Bad deploy | Roll back to the previous build (immutable artifacts). Public menu snapshots are unaffected |
| Accidental delete by an owner | Restore from soft delete (30 days). If hard deleted, restore the affected rows from backup into a scratch DB and copy back |
| Database corruption or loss | Stop writes, restore the latest backup or a point in time, rebuild snapshots, reopen writes, review cause |
| Credential or secret leak | Rotate the secret first, revoke sessions and tokens, check the audit log, notify affected owners |
| Account takeover of an owner | Revoke all sessions, force password reset and MFA setup, review the audit log, restore data if changed |
| Storage bucket loss | Restore from versioning or the second copy, rebuild image variants through the queue |
| Provider outage | CDN keeps serving cached menus. Status message on dashboard. Fail over only if a standby exists |
| Domain or DNS problem | Registrar support with the recovery contact. Keep TTLs sensible and DNS records exported |
| Ransomware or defacement | Isolate, rebuild from clean artifacts, restore data from immutable backups, rotate every secret |

### 11.6 Ownership

Until there is a team: the project owner is the single owner of all of the above. Write the contacts and the registrar and provider logins into a sealed offline document. Add a second trusted person for the domain and the master secrets as soon as there are paying clients.

## 12. Decisions Still Open

| Topic | Options | Decide by |
|---|---|---|
| Backend platform | **Decided: Supabase** (Postgres, Auth, Storage, row-level security). Free plan for development. Move to the paid plan before real clients (free plan pauses after a week of inactivity and has no automated backups, which conflicts with section 11). Keep the repository seams (`PublicMenuRepository`, `OwnerRepository` and the others) so the platform can still be swapped | Done |
| Currency | **Decided: Philippine peso only** (stored as integer centavos, `PHP`) | Done |
| Reseller payment | **Decided: outside the app.** The app only tracks which reseller referred which business | Done |
| Server state library | Decided: a small custom hook (`useResource`), no TanStack Query for now | Step 5, done |
| Validation library | Decided: our own validators, no Zod or Valibot | Step 5, done |
| Styling approach | **Decided: CSS Modules + CSS variable tokens** (`src/shared/theme/tokens.css`) | Done |
| Place lists (province, city, barangay) | **Decided: the free public PSGC API** (`psgc.gitlab.io`) behind `LocationRepository`, with typing as the fallback. It is a free community service with 2022 data. Before launch, either keep it or host our own copy of the latest PSA PSGC data and point `VITE_LOCATIONS_API` at it | Done |
| Delivery pin (map and address lookup) | **Decided: required pin on a MapLibre GL map**, light and Philippines only, drawn from the public OpenFreeMap Positron style (`VITE_MAP_STYLE`), with Nominatim for lookup and search (`VITE_GEOCODER_API`). The public servers have no SLA, and Nominatim has a light-use policy. Before real traffic, move to our own style, tile and geocoder host or a paid provider, and decide whether the service must be switchable without a redeploy | Before launch |
| Hosting / CDN | To pick with WAF and rate limits in mind | Before launch |
| Brand name / domain | **Brand decided: NFC Menu** (`env.appName` reads `VITE_APP_NAME`, default NFC Menu). Domain still undecided; once chosen it goes in `VITE_PUBLIC_ORIGIN` and every other host redirects to it | Domain: before the first card is printed |

Decided: no ordering in the menu, no customer accounts. Owners sign up with email and pay for their plan through a hosted checkout (section 7.9). Resellers set up clients through claim links.
