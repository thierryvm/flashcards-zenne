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

**Hints are a ladder, not a single cue** (`domain/hints.ts`). Framing says what
kind of answer is expected, the authored cue narrows it, the shape rung says how
many words there are and what some of them start with. Only the middle rung is
written per card; the other two are derived, so new cards get all three for free.
A single cue only helps a learner who almost knows — the framing rung is what an
unfamiliar learner needs first.

**Elaboration is shown back.** The learner's own "pourquoi ?" note reappears on
the next review of that card. Storing it without ever surfacing it again would
be the appearance of elaborative interrogation without its mechanism.

**Leaving a session is always possible.** Each graded card is persisted as it is
answered, so quitting early loses nothing. Never build a flow that traps the
learner until a counter runs out.

**Global key handlers never swallow a control's own keys.** `preventDefault` on
Space or Enter cancels the native activation of whatever button has focus. The
reveal shortcut once did exactly that, making the hint ladder mouse-only and
breaking the exit button at the moment someone wanted to stop — a WCAG 2.1.1
failure that both axe assertions passed, because axe reads markup and not
behaviour. Any global shortcut must bail out on `metaKey`, `ctrlKey`, `altKey`,
on text fields, and on interactive elements. `StudyView.test.tsx` has the
regression suite; it was checked against the old code and fails on it.

**The shape rung must never approach the answer.** `shapeFor` returns null rather
than a hint revealing more than `MAX_SHAPE_LEAK`, and the rung is then not
offered. The ceiling is asserted across the entire deck, not on a sample — an
earlier version exempted small words and returned "Au" for "Au".

**The shape rung says its hint, it does not draw it.** It used to render
`L'·········· ····` in a monospace face: on screen that reads as a broken field,
it wrapped mid-answer, and a screen reader got a separate prose version, so one
rung had two faces that could drift apart. There is one version now — the prose
one — and everyone gets it. A shape that looks like a rendering fault does not
improve by adjusting its letter-spacing.

**An affordance announcement is not content, and may be announced only.** The
new-tab warning on the source link is `sr-only`: a sighted person watches the tab
arrive and loses nothing, a screen-reader user gets no such signal and keeps the
words. That is the opposite call from the hint ladder, on purpose. There, two
versions of the _hint itself_ existed and could drift apart, and the visible one
was unreadable. The test to apply: would a reader be missing part of the subject
matter? Then everyone gets it. Is it about how the interface behaves? Then give
it to whoever cannot otherwise perceive it.

**Do not print a column that can only be zero.** Before the first session,
"Acquises", "En cours" and "À revoir" are twenty-four zeros on the very first
screen anyone sees — the loudest thing on the page and the least informative.
The theme and its card count stay; the rest appears when there is something to
put in it.

**A failure must never render as a healthy empty state.** If IndexedDB cannot be
read or written, say so. An unreadable database once produced a serene dashboard
— nothing due, no retention, an empty week — under "come back later, spacing is
the point". For an owner who does not read code, that is the worst possible
message. `storageHealthy` is what keeps the reassuring copy honest.

**Every card must carry a source.** `CardContent.source` is required, so the
rule lives in the compiler rather than in a review checklist: a card with no
reference does not compile. `culture-generale.test.ts` keeps that enforced with
a `@ts-expect-error` on an unsourced card — the attempt that must fail, kept
permanently instead of run once by hand.

The honest limit, worth repeating because it is easy to overclaim: a source
makes a card **verifiable**, it does not prove the answer. That is a different
order of guarantee from an unchecked claim, not an absolute one.

**`redirects=1` proves the page exists, not that the title is canonical.** The
deck comment claimed both until a reviewer noticed that "Joconde" is a redirect
to "La Joconde". The API follows the redirect and reports success, so the check
passes and the label stays wrong. Same family as reading `permissions` off the
GitHub API, or asserting on `index.css` instead of the compiled stylesheet: the
tool answered a question next to the one being asked.

**The deck was read against its sources once**, on 2026-09-10, by someone who
did not write it: 45 of 48 stood, three were wrong (a source that contradicted
its own card, an unfalsifiable superlative, an incomplete answer). One review by
one reader. Whoever writes cards must not be the one who signs them off — that
is why the check happens off this machine.

`culture-generale.test.ts` also guards the copy. A previous sourced import
arrived with its apostrophes flattened into spaces ("L ete d une annee"), which
reads as broken French in a French-language product; a test now fails on lone
elided articles. It catches flattened apostrophes, not missing accents.

**Everything is local.** No account, no server, no personal data leaves the
device. That is also why v0 needed no privacy review to ship. Sync and accounts
are a later phase and must be designed and approved before any code is written.

## Visual direction

`DESIGN.md` has authority over visual choices and every deviation belongs in the
PR that makes it. Palette, typography, spacing scale, shapes and the four grade
buttons now follow it. Three readings were needed where the document does not
decide, and they are recorded here rather than left to be rediscovered:

- **The grade intensities are 100 / 45 / 20 / outline**, not the literal
  100 / 70 / 45. At 70 % of the dark accent no label colour clears 4.5:1 — 3.34
  with the ink, 4.35 with the paper. The order and the meaning are the
  document's; the numbers are what the contrast floor allows.
- **`line` is the only token below 3:1 and it may only separate.** Anything a
  person can operate — a button edge, a field border — is bounded by `accent` or
  `muted`. A 1.29:1 rule around a text field would be a WCAG 1.4.11 failure.
  Careful with the corollary: "not `line`" is not the same as "`muted`". The
  fourth grade was outlined in `muted`, the colour of "Tableau de bord" and
  "Quitter la séance", so the last step of the scale joined the navigation
  instead of standing next to "Correct". A bare outline is the 0 % step of the
  same ramp and carries the ramp's colour.
- **The fonts are self-hosted, not loaded from Google Fonts.** A third-party
  stylesheet cannot be precached, so an offline-first app would lose its
  typography exactly when it is most needed, and every page view would hand the
  reader's IP address to Google. Only the latin subsets are built: four files.

Its verification step — capture at 390×844 and 1280×800, in both colour
schemes, and _look at the result_ — is not a formality. It is what found the
missing light theme after three code reviews had not.

**Pin the seed before capturing.** `?graine=<n>` fixes the session shuffle for
the run and the header then shows which seed produced the screen. Without it
`buildQueue` is seeded with the clock, every capture lands on a different card,
and a before/after pair compares two different questions. It is a tool, not a
feature: nothing in the interface offers it, and a value that is not a plain
integer is ignored — visibly, since the header line only appears when a seed was
actually understood.

## Accessibility

WCAG 2.2 AA is a starting requirement, not a finish. Two mechanisms enforce it:

- `src/ui/tokens.ts` is the single source of truth for colour, and
  `tokens.test.ts` asserts every contrast pair (4.5:1 for text, 3:1 for UI) in
  both palettes **and** that both palettes survive compilation.
- `src/test/axe.ts` runs axe-core over rendered components.

**Assert on the compiled stylesheet, never on `index.css`.** The token test used
to check that the hex values appeared in the source file. They did — and the
light theme still never reached a browser, because `@theme` nested inside
`@media (prefers-color-scheme: dark)` is not supported by Tailwind v4: the block
is folded into the single root theme, so the dark values overwrote the light
ones. Valid CSS, valid-looking source, no light palette in `dist`. Three review
passes missed it; a screenshot found it in one second. `src/test/stylesheet.ts`
now compiles `index.css` through the real pipeline and the test reads the
output, which is the only artefact anyone is served.

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
