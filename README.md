# NFC Menu

Tap an NFC card, and a business's digital menu opens in the phone browser. No app to install.

Built for cafés, restaurants and other businesses with a menu. Each owner gets a customizable menu site (colors, background, products, sizes, add-ons) and an NFC card that opens it. Review and social cards (Google, Facebook, Instagram) are sold alongside.

**Status:** frontend first. The platform landing page is built (pricing, scroll-driven hero, light and dark theme). The public menu page, theme engine, owner dashboard and backend come next.

## Stack

- React 19, TypeScript (strict), Vite
- React Router, CSS Modules with design tokens
- Vitest and Testing Library
- Backend planned: Supabase (see `ARCHITECTURE.md`)

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run verify     # typecheck, lint, tests, secret scan, npm audit
npm run build
```

Copy `.env.example` to `.env.local` for local values. Never commit real secrets; only `VITE_` values reach the browser and none of them may be a secret.

## Project docs

| File | What it covers |
|---|---|
| `PROJECT_FLOW.md` | Product idea, user flows, roadmap, decision log |
| `ARCHITECTURE.md` | Layers, data model, security design, backup and recovery |
| `MARKETING.md` | Go-to-market plan, offer ladder, sales process |
| `CLAUDE.md` | Working rules for AI-assisted development (tokens, models, security, git) |

## Structure

```
src/
  app/        shell and routes
  features/   landing, menu, dashboard, admin, auth, onboarding
  entities/   domain types and pure logic
  shared/     ui, theme tokens, hooks, utilities
  data/       data layer (mock now, API later)
  presets/    business-type presets
  config/     env access and all user-facing copy
```

## Contributing

Work on a branch, never directly on `main`. Use Conventional Commits and fill in the pull request template. The git hooks run `npm run verify` and a secret scan before each commit and push. See `CLAUDE.md` section 8 for the full workflow.
