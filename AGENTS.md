# Repères — working notes

Spaced-repetition flashcards for French general knowledge, built for people who
find memorisation hard. UI copy is French; code, commits and comments are English.

## Commands

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Dev server                            |
| `npm run lint`      | oxlint                                |
| `npm run format`    | Prettier check (use `--write` to fix) |
| `npm run typecheck` | `tsc -b --noEmit`                     |
| `npm test`          | Vitest, single run                    |
| `npm run build`     | Typecheck + production bundle + PWA   |

CI runs all five on every pull request. A red pipeline is not merged, and a
flaky test gets fixed rather than skipped.

## Layout

```
src/
  content/    static seed deck (data only, no logic)
  data/       Dexie database and the content/progress join
  domain/     scheduling, session queue, shared types — no React
  ui/         components, colour tokens
  test/       setup and the axe helper
```

`domain/` holds no React import on purpose: the scheduling rules are the part
worth testing in isolation, and they stay portable if the shell ever changes.

## Decisions worth knowing

**FSRS parameters come from `ts-fsrs`, never from us.** The weight vector is
fitted to real review data; a hand-written approximation would quietly degrade
every schedule. `createScheduler()` accepts overrides for tests only.

**Fuzz is off in v0** (`enable_fuzz: false`) so scheduling is reproducible.
Turn it on once the deck is large enough for review pile-ups to be real.

**Sessions interleave themes.** `buildQueue` round-robins across themes rather
than draining one at a time. Blocked practice feels easier and retains worse.

**Every card must carry a source.** `CardContent.source` is required, so the
rule lives in the compiler rather than in a review checklist: a card with no
reference does not compile. The 48 article titles were validated against the
MediaWiki API (`action=query&redirects=1`).

The honest limit, worth repeating because it is easy to overclaim: a source
makes a card **verifiable**, it does not prove the answer. That is a different
order of guarantee from an unchecked claim, not an absolute one.

`culture-generale.test.ts` also guards the copy. A previous sourced import
arrived with its apostrophes flattened into spaces ("L ete d une annee"), which
reads as broken French in a French-language product; a test now fails on lone
elided articles. It catches flattened apostrophes, not missing accents.

**Everything is local.** No account, no server, no personal data leaves the
device. That is also why v0 needed no privacy review to ship. Sync and accounts
are a later phase and must be designed and approved before any code is written.

## Accessibility

WCAG 2.2 AA is a starting requirement, not a finish. Two mechanisms enforce it:

- `src/ui/tokens.ts` is the single source of truth for colour, and
  `tokens.test.ts` asserts every contrast pair (4.5:1 for text, 3:1 for UI) in
  both palettes **and** that `index.css` still carries the same hex values.
- `src/test/axe.ts` runs axe-core over rendered components.

**Known gap:** axe cannot evaluate colour contrast under jsdom — it needs a real
canvas. Structural checks (labels, roles, names) are covered by axe; contrast is
covered only by the token tests. Rendered contrast should be checked in a real
browser before claiming full conformance.

Also expected of every component: keyboard reachable, visible focus, targets at
least 44 px tall, no meaning carried by colour alone, `prefers-reduced-motion`
honoured, state changes announced through `aria-live`.

## Conventions

- Commits: `type(scope): imperative description`, English
- Branches: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`
- Never push to `main`; open a PR and let CI gate it
- No secrets in the repo; `.env*` is git-ignored from the first commit
