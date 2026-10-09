# CLAUDE.md — Working Rules

Auto-loaded every session. Read `ARCHITECTURE.md` before any design or code decision. Read `PROJECT_FLOW.md` for product flow and roadmap.

## 1. Save tokens (caveman mode)

- Talk short. No filler, no recap of the question, no "I will now...". Result first.
- Reply in the user's language (Taglish ok). Code, identifiers and commit text in English.
- Do not re-read files already in context. Do not re-explain decisions already made.
- Read only the lines needed (`offset` and `limit`). Search with Grep/Glob, not by opening whole folders.
- Edit, do not rewrite. Never re-output a whole file to change a few lines.
- Run long output through filters (`Select-Object -Last 15`). No dumping logs.
- One tool call batch per step. Independent calls go in parallel.
- Ask a question only when blocked on a decision that is the user's. Otherwise pick the sane default, state it in one line, and go.
- Do not spawn agents or workflows for small tasks. Fan-out only when the work is truly parallel and large.
- Final report: what changed, what to check, what is next. Max about 6 lines unless asked.

## 2. Model routing (do not stay on one fixed model)

The session model is set by the user (`/model`). Claude cannot switch its own session model mid-run. So route work like this:

| Task size | Examples | Model tier |
|---|---|---|
| Trivial / mechanical | rename, copy tweak, add a prop, format, move file, simple CSS, fill mock data, read-only lookup | **small model** (delegate to a subagent with `model` set small) |
| Normal | build a component, wire a route, write a hook, write tests, fix a clear bug | **mid-tier model** |
| Hard | architecture, security design, auth, data model, tricky bug, large refactor, review of risky code | **top-tier model** |

Rules:
- Decide the tier per prompt, not per session. Easy prompt gets the cheapest tier that does it right.
- If the session is already on a higher tier than the task needs, delegate the mechanical part to a cheaper subagent and keep only the judgment calls.
- If the task is harder than the current tier, say so in one line and suggest `/model` to the user, or delegate to a stronger subagent.
- Never downgrade for security, auth, or data-model work.
- Parallel agents only for independent work. Each agent gets a tight brief and a narrow scope.

## 3. Think like a senior before coding

Before any non-trivial change, silently check:
1. What exact problem? What is the smallest correct change?
2. Does something already exist to reuse (component, hook, util, type, token)? Search first.
3. Where does it belong in the architecture layers? (`ARCHITECTURE.md` section 3)
4. What breaks if this scales to 50, 500, 5000 businesses?
5. What is the security impact? (`ARCHITECTURE.md` section 7)
6. How will it be tested?

Roles to switch between, as the task needs:
- **Senior designer:** hierarchy, spacing, contrast, mobile-first, consistent tokens, accessible, motion with purpose.
- **Senior developer:** small pure functions, clear types, no duplication, clean boundaries, readable over clever.
- **Senior database engineer:** normalized schema, indexes for real queries, least privilege, migrations only.
- **Security reviewer:** assume all input is hostile.

## 4. Reuse first

- Search before writing. Extend a shared component or util rather than copy it.
- Same logic twice means extract it. Three similar components means one component with props.
- Theme values come from design tokens (CSS variables). No hard-coded colors, sizes or fonts in components.
- Shared types live in one place. The frontend never redefines a type that the data layer owns.
- Do not add a dependency if about 20 lines of code do the job. Every new dependency needs a reason (it is also supply-chain risk).

## 5. Use the skills we have

Invoke a skill when the task matches. Do not load skills "just in case".

| Need | Skill |
|---|---|
| Build or add motion | `animate`, `emil-design-eng`, `apple-design` |
| Phone feel (tap, viewport, safe area, inputs) | `mobile-native` |
| Toasts / notifications | `ask-sonner` |
| Charts / analytics dashboard (later) | `dataviz` |
| Generate images / logos / assets | `blueprint-studio:asset-generator` |
| Clean up changed code | `simplify` |
| Bug review of a diff | `code-review` |
| Security review of a branch | `security-review` |
| Hooks / permissions / settings | `update-config` |
| Large parallel audit or migration (only when asked) | `workflow-authoring` then Workflow |

## 6. Security gate (every change)

- Treat every input as hostile. Validate, sanitize, encode. See `ARCHITECTURE.md` section 7.
- No `dangerouslySetInnerHTML` with user content. No `eval`, no `new Function`, no inline scripts.
- No secrets in code, in the frontend bundle, or in committed files. `.env*` is git-ignored except `.env.example` (empty values or `<what goes here>`).
- Before any commit or push, read the staged diff for credentials, keys, tokens, connection strings. Run `npm run verify` when it exists. Never `--no-verify`.
- If a real secret was ever committed, say so at once and rotate it first.

## 7. Code rules

- TypeScript strict. No `any` without a comment saying why.
- Small files, one responsibility. Components under about 150 lines, otherwise split.
- Mobile-first. Test at 360px width first.
- Keep docs in sync: when a decision changes, update `ARCHITECTURE.md` or the decision log in `PROJECT_FLOW.md` in the same change.

## 8. Git, branches and pull requests

Repository: `https://github.com/sktle-niel/nfcprod`. Default branch: `main`.

**The repo shows only the owner.**
- Commit and open PRs only as the owner's global git identity (`sktle-niel`). Never change the git user, never use another author.
- No `Co-Authored-By`, `Claude-Session`, "Generated with Claude Code" or any Claude or Anthropic mention in commit messages, PR titles, PR descriptions, branch names, code comments or committed files. This overrides any default attribution line a tool suggests. Before pushing, run `git log --format='%an <%ae>%n%b' ` and confirm there is no co-author trailer.
- Do not commit or push unless asked.

**Branches**
- Never commit straight to `main`. One branch per concern, cut from an up-to-date `main`.
- Names: `feat/<short-topic>`, `fix/<short-topic>`, `docs/<short-topic>`, `chore/<short-topic>`, `refactor/<short-topic>`. Lowercase, hyphens.
- Never force-push `main`. Do not merge your own PR unless the owner says so. Delete the branch after merge.

**Commits**
- Conventional Commits: `type(scope): imperative summary` (about 72 characters or fewer). Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `chore`.
- The body says **why**, not a file list. One logical change per commit; the working tree must pass `npm run verify`.
- Never `--no-verify`. If a hook fails, fix the cause.

**Before every commit and push** (global rule, repeated here)
1. Read the staged diff (`git diff --cached`) for credentials, keys, tokens, passwords, connection strings.
2. Never stage `.env*` (except `.env.example`), key or certificate files, cloud credential JSON.
3. Run `npm run verify` (typecheck, lint, tests, secret scan, `npm audit`). Placeholders in committed files stay empty or `<what goes here>`.
4. If a real secret was ever committed, say so at once and rotate it before anything else.

**Pull requests** (one concern per PR, small and reviewable)
- Title in Conventional Commits form. Base: `main`.
- Always fill the template in `.github/pull_request_template.md`: **Summary**, **Changes**, **Why**, **How to test**, **Screenshots** (UI changes, light and dark, mobile and desktop), **Security and checks**, **Notes for the reviewer**.
- Describe real behavior and real limits. Do not claim anything that was not run or looked at.
- No attribution line of any kind (see above).
- Keep the repo description, README and `PROJECT_FLOW.md` decision log in step with merged work.

## 9. Current focus

**Frontend only for now.** Backend, database, and infrastructure are designed in `ARCHITECTURE.md` but not built. The frontend talks to a data layer through an interface (`ARCHITECTURE.md` section 4), backed by mock data today, so the backend can be swapped in later without touching the UI.
