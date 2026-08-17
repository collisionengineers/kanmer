# Post-implementation report — SKILL-013

*The reviewer's brief. What changed, why, and what to check on merged `main`.*

Branch `skill-013-hard-rules-and-fix-gate`, four commits, rebased onto
`origin/main` at `3e9ee2c`.

## What shipped

Two halves in one PR, at the operator's decision (Q1, declined split).

### 1. The gate change — `fix` gains `enter-review` (ADR-0014)

| File | Change | Why |
|---|---|---|
| `packages/core/src/profiles.ts` | `DEFAULT_PROFILES.fix` gains `enter-review: ["post-implementation-report", questions-resolved]` | Reaches **new boards only** |
| `packages/core/src/board.ts` | New `injectFixEnterReview()`, run inside `resolveProfiles` **before** the `questions-resolved` pass | Reaches **every existing board** — a board written by setup or migration carries its own frozen `profiles:` block, so `board.profiles ?? DEFAULT_PROFILES` never falls through again. This is the SKILL-012 gap, applied a second time |
| `packages/core/src/profile-matrix.test.ts` *(new)* | The four-profile move matrix, asked of the real engine, with a snapshot | Makes the answer measured rather than a table someone maintains |
| `packages/core/src/board.test.ts` | Six tests for the new injection | Reach, ordering, operator override, vacuous boundary, other profiles untouched, missing-`fix` board |
| `packages/core/src/store.test.ts`, `packages/mcp-server/src/smoke.mjs` | Collapse assertions move 2 gates → 3 | Expected fallout: the default profile **is** `fix` |

**The two injections are kept separate on purpose**, and the code says so at
length. They obey opposite rules: `questions-resolved` may only touch boundaries
a profile already declares (ADR-0011's second limit, whose point is that no
gated-boundary count changes); this one adds a boundary `fix` does not declare.
A single generalised "inject a requirement" helper would erase that difference.

### 2. The prose

**AGENTS block** (`scripts/agents-block.mjs` + the fenced copy in
`kanmer-setup/SKILL.md`, byte-identical). Deleted the per-profile requirement
list — an R1 violation that omitted `fix`, the default profile, and omitted
`questions-resolved` entirely. Added four invariants no tool reports:
`questions-resolved` and the literal `## Parked (explicitly deferred)`; that
gates constrain `move_item` and nothing else; that creation is ungated; that
`board.yml`'s `profiles:` is not the effective set.

**Skill prose**, in the roster's existing wording rather than a third phrasing:

| Skill | Gained |
|---|---|
| `kanmer-closeout` | Board-worktree rule at the git half, **plus a 12th edge-case row** for `.worktrees/kanmer`. Highest blast radius: it runs `worktree remove`, `prune`, `branch -d/-D`, `push --delete`, `rm -rf` |
| `kanmer-verify` | Board-worktree caveat on step 2 — the roster's only checkout of `main` |
| `kanmer-execute` | Board-worktree rule beside `worktree add`; one-gated-boundary at its `move_item` |
| `kanmer-auto` | Board-worktree rule at the parallel-lane section; per-profile claim at `:35` replaced with a `reachable` pointer |
| `kanmer-review` | Board-worktree rule at Gather; one-gated-boundary at its `move_item verifying` |
| `kanmer-research` | One-gated-boundary; per-profile claim at `:14` replaced |
| `kanmer-groom` | One-gated-boundary, with the note that `update_item status` runs the same check |
| `kanmer-tickets` | One-gated-boundary + gates-constrain-`move_item` + creation-ungated; two per-profile claims replaced |
| `kanmer-plan` | The measurably false `chore` claim at `:11-12` replaced |
| `kanmer-docs`, `kanmer-report` | **No change** — measured, not assumed |

### 3. The three-copy problem, which was a live bug

`apps/gui/src/main/agentsBlock.ts` held a **stale v2** body — seven stages,
`impact.md`, a deleted skill — and `connect.ts` imports it, so Connect wrote that
over the current block in every repo it touched. It did so to this repo during
this run.

The body now lives once, in **`scripts/agents-block-body.mjs`** (pure data, no
imports, no `import.meta`, safe in the CJS Electron main). `agents-block.mjs` and
`agentsBlock.ts` both re-export it. Only the fenced copy in `kanmer-setup/SKILL.md`
is still hand-kept — it is prose and cannot import — and the rail asserts it.

**Verified in the built artifact**, not just the source: the bundled
`apps/gui/out/main/index.js` contains the canonical body and zero occurrences of
the v2 marker.

### 4. The check, committed at last

`scripts/verify-skill-prose.mjs`, wired as `npm run verify:skills` and added to
the release rail. SKILL-014's seven checks ported — its own proof listed "not
committed" as the weakness that let this recur — plus a new check 8.

`scripts/verify-agents-block.mjs` gains three checks (26 → 28): fenced-region
**equality** instead of `includes()`, that this repo's own `AGENTS.md` carries the
current body, and that the GUI imports rather than declares.

### 5. Governing docs

ADR-0014 (new), ADR-0011 amended with the two limits its implementation has,
`board.ts` now cites the ADR instead of being it, FRD-023's stale "R1 is not yet
true" section corrected by strikethrough, release notes carry the upgrade warning.

## Governing docs — how this meets them

| Doc | How |
|---|---|
| **FRD-023 R1** | Improved and now **mechanized**. Zero profile-to-document mappings tree-wide, asserted on the rail. Validated against the pre-change tree: 8 violations there, 0 here |
| **FRD-023 R3** | Each skill changed by one or two sentences. `kanmer-auto:38-41` and `kanmer-review:59-75`, named as models, untouched |
| **FRD-023 R5** | `verify:skills` committed and on the rail |
| **FRD-013** | The block reconciliation writes is now correct, and two of its three copies cannot drift |
| **ADR-0009** | Tier 3 carries mechanism; the tool carries values. That *is* Q2's answer |
| **ADR-0011** | Amended, as the ticket body asks by name. Adds limits the implementation already had; reverses nothing |
| **ADR-0014** | Written here, as a profile change requires |

## Three things the reviewer should push on

1. **My plan predicted the AGENTS block would get *shorter*. It got longer** —
   2209 → 2482 bytes (+273, +47 words). The prediction was never plausible: one
   deletion, four additions. The pre-registered fallback was to drop the
   `board.yml` clause; **I did not take it**, because that clause is the one
   research called the strongest single reason to call `get_doc_gates`, and
   dropping it would still leave the block longer. Instead every addition was
   tightened and re-measured (first draft: +339). The plan is corrected in place
   rather than quietly left wrong. **If you disagree, the `board.yml` clause is
   the line to cut** — that is the decision I made and it is reversible.

2. **I revised check 7 twice after seeing its output**, which is the exact
   failure mode ("a check tuned until it passes") my own plan listed as a risk.
   Both revisions are defensible and both are documented in the file, but they
   deserve scrutiny:
   - I designed an "illustrative example" carve-out and then **deleted it**, because
     when run it exempted precisely the site independently known to be false
     (`kanmer-plan:11-12`). R1 is not about placement; an example kept true by
     hand is a restatement.
   - Line-matching → sentence-matching, because the roster hard-wraps and the same
     claim escaped wrapped that was caught unwrapped.

   **The guard against tuning is that the check is validated against the
   *unfixed* tree**, not only the fixed one. After every revision: 8 violations
   at `origin/main`, 0 here. A check that only passes on the tree it was written
   against proves nothing, so that comparison is the evidence, not the green run.

3. **Check 8 is new and is not in SKILL-014's script.** It asserts the *other*
   half of R1 — that an invariant no tool reports is actually stated where it can
   be acted on. Arguably scope creep. My case: a delete-the-restatements check
   makes prose monotonically shorter and can never notice a rule that is missing,
   and "the board worktree is not yours" being in 1 of 12 skills is precisely the
   defect this ticket was filed about. The `owed` lists are a judgement call and
   are the thing to argue with.

## What did NOT happen, and why

- **`npm run plugin:check` could not run.** MCP-007 (merged during this ticket)
  makes it refuse from any linked worktree. Its stated premise — "a worktree has
  no node_modules of its own" — is **not true here**: I used MCP-010's recipe
  (`npm install` inside the worktree), and `@kanmer/core` resolves to
  `.worktrees/skill-013/packages/core`, verified with `realpathSync`. The guard is
  a path test, not a resolution test. Rather than route around it, the bundle's
  provenance is evidenced directly with MCP-010's two tells — **513** embedded
  `../../node_modules`, **zero** `../../../../node_modules`, and the bundle
  contains both `injectFixEnterReview` and CORE-023's staleness code, proving it
  was built from the rebased tree and not from main. `plugin:check` runs on merged
  `main` at verify. Worth a follow-up: the guard could test resolution instead of
  path, which would let a correctly-prepared worktree pass.
- **`link_doc` for ADR-0014** — the file does not exist under the repo root until
  merge. Done at verify.
- **A duplicate-ADR-number rail check** — three lines, and it would have caught
  what I hit. Not added, because it would be **red on arrival**: `origin/main`
  carries two ADR-0013s today. Filed as a follow-up instead.

## Known defect this PR does not fix

`origin/main` has **two** ADR-0013s: `26c8960` renumbered the duplicate ADR-0012
to 0013, and CORE-023 (#54) independently added a second 0013 while in flight. The
duplicate-number bug was fixed and recreated in the same window. I took **0014**
rather than adding a third. Renumbering a just-merged ticket's ADR would break
`refs` on closed tickets, so it needs its own ticket.

## What `kanmer-verify` should run on merged `main`

1. `npm test` — core, GUI, and `test:scripts`.
2. `npm run typecheck` — confirm all four workspaces are named.
3. **`npm run plugin:check`** — the one rail step that could not run here.
4. `npm run verify:agents-block` (28 checks) and `npm run verify:skills`.
5. `npm run smoke:protocol` and `node packages/mcp-server/src/smoke.mjs`.
6. `PRINT_MATRIX=1 npx vitest run src/profile-matrix.test.ts` in `packages/core` —
   the after-table, reproduced on main.
7. **`get_doc_gates` on a real `fix` ticket** (GUI-073) — `enter-review` must
   appear, though `board.yml` on disk says nothing about it. This is the
   existing-board reach, and it is the claim most worth re-checking independently.
8. `git diff` on `AGENTS.md` between the merge base and main — only the block.

## In-flight tickets: audited, nothing stranded

- **GUI-073** (`fix`, implementing, checklist 0/14, no report) — will need a
  post-implementation report before Review. Not a stranding: it has not started,
  and `kanmer-execute` writes that report as a normal step.
- **MCP-011** (`fix`, verifying) — already has its report, and its next move
  (`verifying → done`) does not cross `enter-review`. Unaffected.
- **CORE-023** (`feature`) — unaffected.

## Rail results

| Check | Result |
|---|---|
| `npm test` | **exit 0** — core 240, GUI 257, scripts 41 |
| `npm run typecheck` | **exit 0** — core, mcp-server, ui, gui all named |
| `npm run verify:agents-block` | **28/28** |
| `npm run verify:skills` | **ALL CHECKS PASSED**, and 8 violations on the baseline |
| `npm run smoke:protocol` | **26/26** |
| `node …/smoke.mjs` | **142/142** |
| `npm run check:manual` | pass |
| `npm run build -w @kanmer/gui` | builds; bundled main carries the canonical body |
| `npm run plugin:check` | **deferred to merged main** — see above |

`kanmerGit.test.ts` timed out once under load on the first run (GUI-085, known,
pre-existing); green in isolation with `--testTimeout=30000`, and green in the
final full run.
