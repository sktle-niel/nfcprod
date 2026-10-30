# NEXT_STEPS.md — Where the Work Stands

Working notes for picking the project up again, on this machine or another. Product flow, roadmap and decisions live in `PROJECT_FLOW.md`, the design in `ARCHITECTURE.md`, the working rules in `CLAUDE.md`. Update this file when a step here is done or a new one comes up.

Last updated: 2026-10-30.

## 1. State

- `main` holds everything up to PR #24. The queue in section 3 says what comes next.
- Frontend only. Every repository is a mock: the demo data lives in the tab's memory and resets on reload. The one exception is the card order form, which posts to `VITE_ORDERS_ENDPOINT` when it is set.

## 2. Done lately (2026-10-22 to 2026-10-30)

- PR #20: the owner's own page photo as a menu backdrop, under a Faint, Soft or Strong veil.
- PR #21: undici 8.12.3 (a test-only package, through jsdom), so `npm audit` passes again.
- PR #22: the page photo's fit (Fill the screen, Fit inside, Stretch) and position (center or an edge). It is drawn one screen tall and stays put while the menu scrolls; on a screen wider than 1.5 times the photo, the style's texture shows instead. Also, a tap on a category chip in the Design preview scrolls the preview to that category.
- PR #23: the dashboard page harness waits up to 5 s for its data and the test timeout is 30 s (section 5).
- PR #24: this file, and the README and ARCHITECTURE notes that go with it.
- 2026-10-30: the docs were checked against the code. What the check found is in the queue in section 3 and in section 4.

## 3. Next

Queue, decided 2026-10-30. Each item is its own small pull request, in this order:

1. Docs in step with the code. Done, in review.
2. Guards: the order dialog cannot be closed while it sends; Design asks before it is left with unsaved changes; `SessionProvider` handles a failed session read; the plan state updates when a trial or plan ends while the dashboard is open; a production build warns when `VITE_PUBLIC_ORIGIN` is empty. Done, in review.
3. Repo hygiene: GitHub Actions CI that runs `npm run verify`, Dependabot, a Node pin (`.nvmrc` and `engines`), the empty `.gitkeep` files removed, `MenuFrame` moved to `shared/menu`, and a test for the layer rule of `ARCHITECTURE.md` section 3.1.
4. The product and add-on dialogs ask before they drop typed work. `Modal` needs a way to hold back a dismissal (Escape, the backdrop, the corner button) while a form has changes.
5. The product detail sheet and the add-on picker (the plan below). First ask the owner whether the sidebar-style category list with a filter, asked for on 2026-10-22 and never built, is still wanted.
6. Public page speed and search basics: a bundle size budget check and a decision on the 100 KB target (the public menu route is about 140 KB gzip of JS today), `srcset`, an eager spotlight picture, the mock data out of the public chunk, a meta description, Open Graph tags, `robots.txt` and a sitemap.
7. Marketing builds (`/m/demo`, `?ref=`, a short FAQ, a contact link) and the Privacy Policy and Terms pages (the text is the owner's to supply).
8. The backend (section 4), after the owner settles the open questions of `PROJECT_FLOW.md` section 10: the domain, hosting, where pictures live, and how long delivery details are kept.

### The product detail sheet and the add-on picker

The last open item of Phase 1 (`PROJECT_FLOW.md` section 8). Nothing of it is written yet. The plan:

- **What the customer gets.** A tap on a product card opens a sheet with the picture, the name, the description, the tags, the sizes and the add-on groups. It rises from the bottom on a phone and sits in the middle on a wide screen.
- **Picking.** One size, and add-ons within each group's `min` and `max` (a `required` group says so), with the total price kept up to date. No order button: the menu takes no orders (decision log, 2026-10-09). A sold-out item opens too, with the picking turned off.
- **Address.** The sheet opens through `?item=<product id>`, so the phone's Back closes it. The id is only looked up in the loaded menu, never shown. The app uses no `ScrollRestoration`, so opening the sheet leaves the page where it is.
- **Where.** Only on the pages with links: the public page and the owner's preview page. Never in the Design preview frame.
- **Look.** Painted from the `--menu-*` variables only; `menuStyleRules.test.ts` checks every stylesheet in `src/shared/menu`. It sits on the native `<dialog>`, like `shared/ui/Modal`. Modal's styles use the app's tokens, so share its behaviour (show on mount, Esc, the guard on backdrop presses, the close event) through a hook, not its styles.
- **Pieces.** Pure picking and total logic in `src/entities/menu`, with tests. `ProductSheet` in `src/shared/menu`. A button on the product name, stretched over the card, through one shared card part, for the eight card kinds and the spotlight. `MenuView` takes the open id and the open and close handlers; `MenuFrame` keeps the id in the address.
- **Docs when done.** ARCHITECTURE sections 3.2 and 10 (step 6), PROJECT_FLOW section 8 (Phase 1) and its decision log.

## 4. Later (not started)

- Phase 1: mobile-first and fast on slow data: a bundle size budget check, picture sizes and `srcset`.
- Security headers and the CSP in the host config, with a check (ARCHITECTURE section 10, step 10).
- The backend on Supabase (ARCHITECTURE section 5): auth with cookie sessions, row-level security, storage with signed uploads, the publish snapshot, and real adapters behind the repository interfaces that exist today.
- Phase 4: the redirect table for changed links (needs the backend), and a custom domain per client.
- Phase 5: reseller accounts and claim links, the rest of the admin flow (clients, subscriptions, presets, support tools), real tap and view numbers, several branches and languages, and maybe a reservation link or call-waiter.
- Admin sign-in with MFA and an audit trail, before a real orders endpoint feeds `/admin`. Today those pages have no sign-in and show sample data.
- Owner account basics: password reset, email verification, delete and export of an account (they come with Supabase Auth).
- An offline cache of the last menu (`PROJECT_FLOW.md` section 9 promises it; there is no service worker).
- Per-menu share previews (Open Graph) need the edge or the publish snapshot, so they come with the backend.
- The 2 free NFC cards: no delivery address is collected for them and nothing marks them as sent.
- Marketing build tasks (`MARKETING.md` section 11): a `/m/demo` menu for the tap demo, a `?ref=` code kept through the page, a short FAQ.
- Before launch: the domain (`VITE_PUBLIC_ORIGIN`), hosting and a CDN with a WAF and rate limits, the Privacy Policy and Terms, the PayMongo hosted checkout with signed webhooks, our own map, tile and geocoder hosting or a paid provider, and our own copy of the PSGC data.
- Open questions: `PROJECT_FLOW.md` section 10, items 2 and 5 to 14.

## 5. Known issues

- `npm run verify` runs about 3,500 tests in two workers: about 7 minutes on an idle machine, 11 to 16 minutes with an editor and a browser open on 8 GB. The git hooks run it before every commit and every push.
- With memory short, a test worker can fail to start ("Timeout waiting for worker to respond"), and the longest dashboard tests ran past 15 s, on `main` too. `chore/steady-dashboard-tests` raises the timeout to 30 s and lets the dashboard harness wait up to 5 s for the data. A worker that does not start still fails the run: run it again with more memory free.
- Only the width decides the page photo fallback. Under "Fill the screen", a landscape photo on a tall screen is still enlarged by its height.

## 6. Setting up a machine

1. `git clone https://github.com/sktle-niel/nfcprod.git`, or `git pull` on `main`.
2. Node 22.12 or newer (Vitest 5 needs `^22.12.0 || ^24.0.0`; developed on 24.18).
3. `npm ci`. Its `prepare` script points git at `.githooks`.
4. Copy `.env.example` to `.env.local` only if a value is needed. The demo runs with none.
5. `npm run dev`. Sample menus: `/m/cafe-luna`, `/m/kapehan-ni-ana`, `/m/la-bella`, `/m/bean-there`, `/m/tea-hub`. Style pages: `/__styles`, `/__look`. An owner: `/?auth=signup`, then the setup wizard. The demo data resets on reload, so move between owner pages by links, not by typing addresses.
6. `npm run verify` before the first commit.

## 7. Branch cleanup

Merged branches are already deleted on GitHub. Delete merged local branches with `git branch -d <names>`, for example `feat/menu-backdrop-photo`.
