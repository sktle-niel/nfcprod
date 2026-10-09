## Summary
<!-- One or two sentences: what this PR does and for whom. -->

## Changes
<!-- Bullet list of the notable changes, grouped by area. -->
-

## Why
<!-- The problem or decision behind the change. Link the decision log entry if there is one. -->

## How to test
<!-- Exact steps. Include the commands and the pages or viewports to check. -->
1. `npm install`
2. `npm run verify`
3. `npm run dev`, then open the page and check:

## Screenshots
<!-- For UI changes: light and dark, mobile (about 390px) and desktop. Remove this section if there is no UI change. -->

## Security and checks
- [ ] `npm run verify` passes (typecheck, lint, tests, secret scan, audit)
- [ ] No secrets, keys, tokens or `.env` files in the diff
- [ ] User input is validated and nothing user-provided is rendered as raw HTML or CSS
- [ ] New dependencies are justified (reason below) and `npm audit` is clean
- [ ] Docs updated (`ARCHITECTURE.md`, `PROJECT_FLOW.md` decision log) if a decision changed

## Notes for the reviewer
<!-- Known limits, follow-ups, things not verified, open questions. -->
