# NFC Menu

Tap an NFC card, and a business's digital menu opens in the phone browser. No app to install.

Built for cafés, restaurants and other businesses with a menu. Each owner gets a customizable menu site (colors, background, products, sizes, add-ons) and an NFC card that opens it. Review and social cards (Google, Facebook, Instagram) are sold alongside.

**Status:** frontend first. Built so far: the platform landing page (pricing, scroll-driven hero, light and dark theme), the "Get now" order form with the delivery pin (demo mode until an orders endpoint is set), owner sign-up and log-in (demo accounts in memory until Supabase Auth is connected), the owner dashboard at `/dashboard` (a setup wizard, then Overview, Menu, Design, Share and Account, on a demo repository that lives in the tab's memory), the public menu page at `/m/:slug` (five sample businesses; thirteen ready-made menu styles with a picture on every card, each part changeable on the Design page), and the admin area at `/admin` (Overview, Orders, Customers, Pricing) on sample data. The backend comes next.

## Stack

- React 19, TypeScript (strict), Vite
- React Router, CSS Modules with design tokens
- Vitest and Testing Library
- Backend planned: Supabase (see `ARCHITECTURE.md`)

## Getting started

Needs Node 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run verify     # typecheck, lint, tests, secret scan, npm audit (about 7 to 16 minutes)
npm run build
```

Copy `.env.example` to `.env.local` for local values. Never commit real secrets; only `VITE_` values reach the browser and none of them may be a secret.

With the dev server running, `/__styles` shows every menu style on a sample menu (add `?style=gourmet&mode=dark`, or any single choice, to narrow it) and `/__look` shows the Design page's Look tab with no sign-in. Neither exists in a production build. Sample menus to open: `/m/cafe-luna`, `/m/kapehan-ni-ana`, `/m/la-bella`, `/m/bean-there`, `/m/tea-hub`.

## Project docs

| File | What it covers |
|---|---|
| `PROJECT_FLOW.md` | Product idea, user flows, roadmap, decision log |
| `ARCHITECTURE.md` | Layers, data model, security design, backup and recovery |
| `MARKETING.md` | Go-to-market plan, offer ladder, sales process |
| `NEXT_STEPS.md` | Where the work stands: what comes next, what is not started, known issues, setting up a machine |
| `CLAUDE.md` | Working rules for AI-assisted development (tokens, models, security, git) |

## Structure

```
src/
  app/        shell and routes
  features/   landing, menu, dashboard, admin, auth
  entities/   domain types and pure logic
  shared/     ui, theme tokens, hooks, utilities
  data/       data layer (mock now, API later)
  presets/    business-type presets
  config/     env access and all user-facing copy
```

## Contributing

Work on a branch, never directly on `main`. Use Conventional Commits and fill in the pull request template. The git hooks run `npm run verify` and a secret scan before each commit and push. See `CLAUDE.md` section 8 for the full workflow.
