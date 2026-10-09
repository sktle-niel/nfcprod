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

Three surfaces, one codebase:
- **Public menu** `/m/:slug`: anonymous, read-only, cached, lightest bundle.
- **Owner dashboard** `/dashboard/*`: authenticated, edits one business.
- **Admin** `/admin/*`: platform staff only, strongest controls.

Each surface is a separate lazy-loaded route group so the public bundle never carries dashboard or admin code.

## 3. Frontend Architecture (current work)

### 3.1 Layers

```
src/
  app/            app shell, router, providers, error boundary
  features/
    menu/         public menu (categories, product, variant and add-on picker)
    auth/         login, signup, session
    onboarding/   business type selection, preset apply
    dashboard/    editors (branding, theme, categories, products, modifiers)
    admin/        later
  entities/       domain types and pure logic (Business, Product, Variant, Modifier, Theme)
  shared/
    ui/           design-system components (Button, Card, Sheet, Input, Tabs, Skeleton ...)
    theme/        tokens, theme provider, theme-to-CSS-variables
    lib/          pure utils (money, slug, a11y, validation schemas)
    hooks/        generic hooks
  data/           data layer: interface + adapters (mock now, real API later)
  presets/        business type presets as plain data
  config/         env access, feature flags, constants
```

Dependency rule (one direction only):
`app` -> `features` -> `entities` + `shared` + `data`.
`shared` and `entities` import nothing from `features`. Features never import each other; they share through `shared` or `entities`.

### 3.2 Principles

- **Data driven UI.** The menu is rendered from a `Business` object (theme, layout, categories, products). No business-specific code anywhere.
- **Design tokens.** Every color, radius, font, spacing and shadow is a CSS variable. A business theme is just a set of token values applied at the root. This is what makes the background, colors and fonts customizable.
- **Presets are data.** `presets/*.ts` are plain objects. Hybrid = a pure `mergePresets()` function.
- **Reuse.** One `ProductCard` with layout variants, one `ModifierGroup` picker, one `Sheet`. No per-type copies.
- **Validate at the edge.** Every external value (API response, URL param, form input, stored value) is parsed by a schema before use. Types come from the schemas, one source of truth.
- **State.** Server data through a query cache (fetch, cache, retry, dedupe). Local UI state stays local. Global client state only for session and theme. No giant store.
- **Routing.** Route-level code splitting. Public route first, nothing else loaded.
- **Performance.** Image sizes and `srcset`, lazy loading below the fold, font subset with `font-display: swap`, skeletons, no layout shift, virtualized lists only if a menu is very large.
- **Accessibility.** Semantic HTML, focus states, contrast checks on the generated theme (reject unreadable color pairs), reduced-motion support.
- **Mobile-first.** 360px baseline, safe-area insets, no hover-only interactions, tap targets at least 44px.
- **Error handling.** Error boundary per route, friendly offline and 404 states, never show raw errors or stack traces.

### 3.3 Data layer contract (the seam between frontend and backend)

```ts
interface MenuRepository {
  getBusinessBySlug(slug: string): Promise<Business>        // public, cacheable
}
interface OwnerRepository {
  getMyBusiness(): Promise<Business>
  updateTheme(patch: ThemePatch): Promise<void>
  upsertProduct(p: ProductInput): Promise<Product>
  // ...
}
```

- Today: `mock` adapter returns sample businesses (coffee, fine dining, hybrid).
- Later: `http` adapter calls the real API. The UI does not change.
- Components never call `fetch` directly.

### 3.4 Theme engine

```
Business.theme (validated)  ->  toCssVars()  ->  <div style="--color-primary: ...">
```

- Theme fields: colors, background (color, gradient, image), font family (from an allow-list), radius, density, light or dark.
- Safety: colors validated against a strict pattern, fonts from an allow-list, background image URLs only from our storage origin. User values are never injected as raw CSS or HTML.
- Contrast guard: if text and background contrast fails WCAG AA, auto-adjust the text color or warn in the editor.

## 4. Domain Model

```
User 1--* Business 1--* Category 1--* Product 1--* Variant
                   Business 1--* ModifierGroup 1--* ModifierOption
                   Product *--* ModifierGroup
Business: id, ownerId, slug, name, types[], theme, settings, plan, status, version
Preset:   type, defaultCategories, defaultTheme, defaultFeatures
```

Rules:
- Money stored as integer minor units plus currency code. Never floats.
- `Business.version` increments on every publish. It is used for cache busting and optimistic concurrency.
- Draft and published copies are separate, so owners edit safely and publish in one atomic step.
- Slugs: lowercase, a-z 0-9 and hyphen, reserved-word blocklist, unique, with a redirect table so the link on an NFC card never breaks.
- Every tenant row carries `businessId`. All queries filter by it.

## 5. Backend Architecture (target, not built yet)

- **Style:** a simple stateless API (REST or RPC), validated at the boundary, thin handlers, logic in services, data access in repositories.
- **Auth:** managed provider or hardened in-house. Passwords hashed with a modern slow hash (Argon2id or bcrypt). Short-lived access token plus rotating refresh token in an HttpOnly, Secure, SameSite cookie.
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
- [ ] All external data parsed by a schema before use (API, URL params, localStorage).
- [ ] User-provided URLs (links, images) accepted only with `https:` and, for images, our storage origin. Reject `javascript:` and `data:` schemes.
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
                         connect-src 'self' https://<api-origin>; frame-ancestors 'none';
                         base-uri 'self'; form-action 'self'; object-src 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
```

(`style-src 'unsafe-inline'` is a known trade-off for runtime theme variables; revisit with nonces or a style-sheet approach.)

### 7.5 Rate limits and tokens

| Endpoint | Limit (starting point) | Key |
|---|---|---|
| Public menu snapshot | Very high, served from CDN cache | IP (edge) |
| Login | 5 per 15 min per account, 20 per 15 min per IP, progressive delay | account + IP |
| Signup | 3 per hour per IP | IP |
| Password reset / email verify | 3 per hour per account | account + IP |
| Owner write APIs | 60 per min per user | user |
| Image upload | 20 per hour per user, **4 MB max per product image**, one image per product | user |
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

## 8. Scalability and Bottleneck Avoidance

- **Read path is static.** The public menu is a versioned JSON snapshot on a CDN. A viral tap burst never hits the database.
- **Write path is small and isolated.** Only owners write, rarely. Heavy work (images, snapshot builds) goes to a queue.
- **Stateless API** so it scales horizontally. No in-memory sessions.
- **Avoid N+1 queries.** Fetch with joins or batched queries, add pagination caps everywhere.
- **Cache with versions.** Cache key includes `Business.version`. Publish invalidates by version, not by purge storms.
- **Images:** resized variants, modern formats, CDN, lazy loading. The biggest payload is images, not code.
- **Frontend:** route code splitting, tree shaking, no heavy libraries on the public route, preconnect to API and image origin.
- **Multi-tenant limits:** no product-count limit for now (product decision). Image upload is capped at 4 MB per product image. Because storage is otherwise unbounded, keep a hidden abuse ceiling (for example a generous max products and total storage per business) enforced server-side, plus rate limits, so one client cannot degrade the rest or run up the bill. Raise the ceiling per business on request.
- **Images:** the 4 MB limit is the upload cap. The server re-encodes to resized WebP/AVIF variants, so what customers download is far smaller.
- **Observability:** request ids, basic metrics (latency, error rate, cache hit rate), so bottlenecks are measured, not guessed.
- **Cost control:** rate limits and quotas also protect the bill.

## 9. Maintainability

- TypeScript strict, schema-derived types, one source of truth.
- ESLint/oxlint + formatter + typecheck + tests in one `npm run verify` (add a secret scan and `npm audit`).
- Tests: pure logic unit tests (theme, presets merge, money, slug, validation), component tests for the menu, a few end-to-end flows (tap link, view menu, pick add-on). Security tests: cross-tenant access, rate limit, input rejection.
- Conventional commits, small PRs, changelog for releases.
- Docs updated with the change (`ARCHITECTURE.md`, decision log).
- ADR-style decision log in `PROJECT_FLOW.md`.
- Feature flags for risky or unfinished features.

## 10. Build Order (frontend first)

1. Tooling: strict TS, lint, formatter, `verify` script, `.env.example`, `.gitignore` check.
2. Folder structure from section 3.1, router, error boundary, providers.
3. Design tokens and theme engine (`toCssVars`, contrast guard).
4. Shared UI kit (Button, Card, Sheet, Tabs, Input, Skeleton, Toast).
5. Entities, schemas, and the `MenuRepository` interface with the mock adapter.
6. Public menu `/m/:slug` for three sample businesses (coffee, fine dining, hybrid).
7. Presets and `mergePresets()`.
8. Auth screens and onboarding (against a mock auth adapter).
9. Owner dashboard editors with live preview.
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
| Backend platform | **Decided: Supabase** (Postgres, Auth, Storage, row-level security). Free plan for development. Move to the paid plan before real clients (free plan pauses after a week of inactivity and has no automated backups, which conflicts with section 11). Keep the `MenuRepository` seam so the platform can still be swapped | Done |
| Currency | **Decided: Philippine peso only** (stored as integer centavos, `PHP`) | Done |
| Reseller payment | **Decided: outside the app.** The app only tracks which reseller referred which business | Done |
| Server state library | TanStack Query vs a small custom hook | Step 5 |
| Validation library | Zod vs Valibot (smaller) | Step 5 |
| Styling approach | **Decided: CSS Modules + CSS variable tokens** (`src/shared/theme/tokens.css`) | Done |
| Hosting / CDN | To pick with WAF and rate limits in mind | Before launch |
| Brand name / domain | Undecided. Use `APP_NAME` config placeholder | Before first card is printed |

Decided: no payments, no ordering, no customer accounts (menu and landing page only). Owners sign up with email. Resellers set up clients through claim links.
