# Phase 1 — Core: document model, gates, stages, traceability

**Goal:** turn the fixed 5-doc pipeline into a **per-area configurable document system with a hierarchy and hard gates**, add repo-`/docs/` references and per-ticket scratch notes, ship the **7-stage** default with a safe backfill migration, add **commits/PRs/deployment** traceability, and **remove `due`**. This is the keystone: it defines the `board.docs` schema and the frontmatter fields every other phase consumes. All new keys are additive/optional and omitted-when-unset, so existing files gain zero noise on rewrite (AGENTS.md §4), and boards without the new `docs:` block synthesise the default pipeline.

**Depends on:** kanmer-upgrades Phase 2 (v2 layout). **Feeds:** Phase 2 (tools), Phase 4 (Documents/gates editor), Phase 8 (skills). **Scope:** `@kanmer/core` only.

## Design decisions

- **D1 — First-stage id = `backlog`, backfilled by *alias*.** Fresh boards start at `backlog`; existing `todo` boards keep `todo` (an alias table `{ backlog: ["todo"] }` counts a canonical stage as present if the board has its id *or* an alias). No item file is ever rewritten and no duplicate start column appears. Position-keyed logic (`statuses[0]`, last stage) is unaffected. Rejected: rename `todo→backlog` (rewrites items, higher risk).
- **D2 — Backfill is explicit, never a side effect of opening a board** (mirrors `init()` never stamping v2 onto v1, `store.ts:139-156`). Exposed as a core function the GUI prompt / an MCP action calls.
- **D3 — Repo-doc reference shape = new `refs: string[]`** of repo-relative POSIX paths (`docs/prd/checkout.md`); kind (prd/frd/adr) inferred from configurable path globs. Rejected: overloading `links:` with path-vs-id ambiguity.
- **D4 — Gate defaults:** ship the pipeline gates **on** in `defaultBoardConfig()` (generalizing today's proof gate — which keeps its before-final-stage boundary, see §1.2). The repo-doc PRD/FRD/ADR requirement is **part of the standard model and ships on**, with the `docs_todo` "new doc to be created" escape (§1.2/§1.4); `kanmer-setup` offers to disable it for repos that decline a `/docs/` tree. The `deployment` config ships **absent** (opt-in), so the field is invisible until a project declares environments (request #16).
- **D5 — Fully customizable; existence-only.** The entire doc model — types, hierarchy (`requires`), and gate rules — is user-editable per board and per area (config here, GUI editor in Phase 4); the defaults are a starting point, not policy. Gates check **file existence only**; content requirements (e.g. the plan's mandatory *Governing docs* section) are enforced by templates and skills (Phase 8), never by core.
- **D6 — Creation is not gated (deliberate).** Gates fire on transitions only; `create_item` at any stage is trusted — imports and backfills of historical/finished work need it. The loophole is documented, not accidental.

## Items

### 1.1 The `docs:` block + `docs.ts` module — L
- **Where:** `types.ts` (schema), new `packages/core/src/docs.ts`, `board.ts` (`defaultBoardConfig`), `index.ts` barrel.
- One new top-level `board.yml` block; `statuses/areas/priorities/idPrefixes` keep their shape:

```yaml
docs:
  repoDocs: { prd: docs/prd/**, frd: docs/frd/**, adr: docs/adr/** }   # ref kind ← path glob
  default:
    types:                                   # ORDER = hierarchy; `requires` = doc-before-doc gate
      - { id: research,       name: Research }
      - { id: impact,         name: Impact }
      - { id: open-questions, name: Open questions }
      - { id: plan,           name: Plan,      requires: [research, impact] }
      - { id: checklist,      name: Checklist, requires: [plan], progress: true }
      - { id: post-implementation-report, name: Post-implementation report }
      - { id: proof,          name: Proof }
    gates:                                   # doc-before-stage hard gates (threshold semantics, §1.2)
      - { needsRepoDoc: [prd, frd, adr], before: { leave: backlog } }   # standard-on (D4); `docs_todo: true` satisfies it
      - { needs: research,  before: { leave: researching } }
      - { needs: impact,    before: { leave: researching } }
      - { needs: plan,      before: { leave: planning } }
      - { needs: checklist, before: { leave: planning } }              # implementation requires a plan (+ checklist)
      - { needs: post-implementation-report, before: { enter: review } }   # the reviewers' brief: what changed + why
      - { needs: proof, before: { enter: done } }   # verification evidence — today's proof-before-final-stage boundary, unchanged
  areas:                                     # sparse per-area overrides; absent area ⇒ inherits default
    pr-review:
      types: [ { id: pr-changes-summary, name: PR changes summary }, { id: pr-comments, name: PR comments },
               { id: pr-comment-disposition, name: Comment disposition }, { id: pr-review, name: PR review } ]
      gates: [ { needs: pr-comment-disposition, before: { leave: review } } ]
```

- Zod additions in `types.ts` (all optional/`default` so old boards load unchanged): `DocTypeSchema {id (lowercase-kebab), name, requires?, progress?}`, `GateRuleSchema {needs? xor needsRepoDoc?, before:{leave? xor enter?}}` (`.refine` the xors), `AreaDocsSchema {types?, gates?}`, `DocsConfigSchema {repoDocs, default, areas}` → `BoardConfigSchema.docs`. A `.refine` on each types list rejects `requires` entries naming unknown doc ids **and `requires` cycles** (`a requires b requires a`); Phase 4's `validateDraft` mirrors both checks.
- `docs.ts` houses `DEFAULT_DOC_TYPES`, `DEFAULT_GATES` (the two arrays above — also the fallback when `docs.default.types` is absent), plus pure resolvers `resolveDocTypes(board, areaId)` / `resolveGates(board, areaId)` = `docs.areas[areaId] ?? docs.default ?? DEFAULT_*`, and `repoDocKindOf(board, relPath)`. New standard doc types shipped by default: **`open-questions`**, **`post-implementation-report`** (request #5).

### 1.2 Generalized hard-gate engine — M/L
- **Where:** `store.ts` (`assertProofGate` at 828-843 → `assertDocGate`; call sites `updateItem` 543-546, `takeTicket` 667-669), `docs.ts` (pure `evaluateGates`).
- `assertProofGate` (proof-before-last-stage, hard-coded) becomes `assertDocGate(ticketDir, board, item, fromStatus, toStatus)`: resolve the area's gates, evaluate, throw once listing all violations (missing doc/repo-doc + the boundary), matching the value-listing UX of `assertFieldAgainstBoard` (862-875).
- **Threshold semantics** (pure, testable): `idx(s)` = position or −1. `leave: X` → `T = idx(X)+1`; `enter: Y` → `T = idx(Y)`. If the gate's stage isn't on the board (`idx = −1`) → **inert/skip** (critical for backfilled/custom boards). Fire when `idx(to) ≥ T && idx(from) < T` (crosses upward, incl. multi-stage jumps → no skip-gaming); moving to an unknown status → skip. `needs` requires the doc file exists; `needsRepoDoc` requires ≥1 existing `refs` path whose kind ∈ the set **or `docs_todo: true`** on the ticket (the declared "a new governing doc will be created" escape — without it, every legacy/imported ticket would be blocked; §1.4). Today's proof→final behaviour is preserved **unchanged** as the default `proof → enter done` rule. Gates apply to transitions only — creation is ungated (D6) — and check file existence only, never content (D5). **Area changes:** `update_item` moving a ticket to another area re-resolves types/gates against the new area; doc files written under the old area stay on disk, but ids unknown to the new area stop being reported by `getTicketDocsInfo` and are rejected by `setDoc`, and subsequent moves gate against the new area's rules.

### 1.3 Dynamic doc names — M
- **Where:** `types.ts` (`TicketDoc` → `string`; `TICKET_DOCS` becomes `DEFAULT_DOC_TYPES` in `docs.ts`), `store.ts` (`getDoc`/`setDoc`/`getTicketDocsInfo` 707-770), `paths.ts` (`docFileIn` 106-108 + `assertSafeDocName`).
- `TicketDocsInfo.docs` becomes `Record<string, boolean>`. `getTicketDocsInfo` iterates `resolveDocTypes(board, item.area)` instead of the const; `checklist` progress comes from the doc-type flagged `progress: true`. `setDoc` validates the doc id against the area's set (throws listing valid ids) and enforces `requires` (a required prerequisite doc must exist first). `getDoc`/`setDoc` call `assertSafeDocName` (lowercase-kebab, reject `..`/separators). **MCP handoff:** the static `ticketDocEnum` (`mcp-server/src/index.ts:143`) can't survive per-area docs — Phase 2 changes it to `z.string()` and relies on this core validation.

### 1.4 Repo-`/docs/` refs + PRD/FRD/ADR requirement — M
- **Where:** `types.ts` (frontmatter `refs`, `docs_todo`; `CreateItemInput`/`UpdateItemPatch`), `frontmatter.ts` (`KEY_ORDER`), `paths.ts` (`assertSafeRepoPath`), `store.ts` (create/update validation), `docs.ts` (`repoDocKindOf`).
- New frontmatter **`refs: string[]`** (repo-relative POSIX paths) + **`docs_todo: boolean`** ("a new/linked governing doc is still to be created" — set from the create dialog's *New PRD/FRD/ADR needed* option (Phase 3), by `kanmer-import`, and by upgrade so the gate never retroactively blocks legacy tickets; it satisfies the `needsRepoDoc` gate, §1.2). `createItem`/`updateItem` validate each ref via `assertSafeRepoPath(this.paths.projectRoot, rel)` (resolves under the project root or throws — traversal-guarded like `assertSafeId`/`itemFile`, `paths.ts:50-73`) and require the file exists. The optional `needsRepoDoc` gate (§1.2, D4) enforces request #13 in core; the *soft* workflow (link-or-create) lives in Phase 8 skills.

### 1.5 Per-ticket scratch folder — S/M
- **Where:** `paths.ts` (`SCRATCH_PREFIX`, `scratchFileIn(dir, slug)`), `store.ts` (`appendScratch`, `getScratch`, `listScratch`), `activity.ts` pattern.
- Scratch files live in the ticket folder as **`scratch-<slug>.md`** (e.g. `scratch-research.md`, request #3) — matching the folder's flat doc naming (`research.md`, `plan.md`; no id prefix). `appendScratch(id, slug, content)` uses **`fs.appendFile`** — the only true append primitive (cf. `activity.ts:44`), unlike the atomic temp+rename of `setDoc` — with a blank-line separator when non-empty; emits **one** activity line per call (callers that stream must batch — Phase 7). `getDoc` whitelists the `scratch-` prefix (exempt from doc-type validation) so `get_ticket_doc` can read scratch back without a bespoke tool. Scratch is committed like the other ticket docs — deliberate working notes, not raw logs (dispatch stdout stays app-local, Phase 7). `getTicketDocsInfo` already enumerates configured doc ids by exact filename so it won't mistake scratch files for pipeline docs; add an explicit `scratch-*.md` exclusion to any folder-scan path, and `assertSafeDocName` rejects doc-type ids starting with `scratch-`.

### 1.6 7-stage default + backfill migration — M
- **Where:** `board.ts` (`defaultBoardConfig` 15-36 → 7 statuses), `migrate.ts` (`backfillStages`, `migrateBoard`).
- Default statuses: `backlog → researching → planning → implementing → review → verifying → done` (D1). The alias table covers **every canonical stage**, not just the first — e.g. `{ backlog: [todo], implementing: [doing, in-progress, in_progress, wip], review: [in-review, pr], done: [complete, completed, shipped] }` — so a custom board keeps its own stage names and never gains a near-synonym duplicate (a `[todo, doing, shipped]` board must **not** grow a second final stage next to `shipped`). `backfillStages(store)`: for each **missing** canonical stage (alias-aware presence test), insert it after the nearest preceding present canonical/alias stage; also backfill `docs.default` if absent; **never** overwrite a board that already customised `docs`, never rename/reorder/remove existing stages, **never touch item files**. Idempotent (second run → `added: []`, byte-identical). `migrateBoard(store, {dryRun})` = run `migrateToV2` if v1, then `backfillStages`; the existing v1→v2 path (`migrateToV2`) also calls `backfillStages` at its end so migrated boards land on 7 stages. Callers must surface the **dry-run preview** (stages to insert, docs block to add) before applying — the GUI prompt lives in **Phase 4**; the agent path is Phase 2's `migrate_board`.

### 1.7 Remove `due` — S
- **Where (delete cleanly):** `types.ts:105-111,139-142,156,170`; `frontmatter.ts:12` (`KEY_ORDER`); `store.ts:389-396,435,485,518,542,884-889,899-900,914`; tests `store.test.ts:520,553-576,610-612`. Also remove `ItemFilter.overdue`/`dueBefore`. Legacy `due:` values in existing files are harmless — `.passthrough()` (`types.ts:122`) round-trips them untouched; they simply stop being read. Downstream `overdue`/`dueBefore` filters and the Standup "Overdue" section (Phase 3/4 GUI) go too — they have no meaning without `due`.

### 1.8 Traceability: commits / PRs / deployment — M (request #16)
- **Where:** `types.ts` (frontmatter + `DeploymentConfigSchema` on the board), `frontmatter.ts` (`KEY_ORDER`), `store.ts` (validation), `board.ts` (default = deployment absent).
- Always-available optional arrays **`commits: string[]`** (SHAs) and **`prs: string[]`** (PR refs — number or URL), emitted only when non-empty (the `blocks` camp). Auto-populated by Phase 8 skills (`kanmer-execute` from the branch/worktree, `kanmer-closeout` from `gh`); hand-editable YAML.
- **Board-gated deployment.** New optional `board.yml` block:

```yaml
deployment:                 # absent ⇒ the field never appears on any ticket (non-cloud projects)
  environments: [ production ]   # ordered; "live" = the last/only one. Extensible (e.g. [staging, production]).
```

  When present it activates a per-ticket **`deployment`** field — a **flat string** (no object shape): **`n/a`** (not deployable — docs/tooling; always accepted) | **`not-deployed`** | **`<env-id>`** (deployed to that environment; must be one of `deployment.environments`). `store` validates `deployment` only when `board.deployment` exists (reject otherwise, like `assertFieldAgainstBoard`). `get_status`/`list_board` surface whether deployment tracking is on. **Out of scope:** CI/CD auto-detection of live state — `deployment` is set manually or at closeout.
- `KEY_ORDER` additions (after `blocks`/`refs`): `commits`, `prs`, `deployment`.

## Release rail

Per AGENTS.md §7, Phase 1 is core-only but its API is consumed downstream — freeze these signatures before Phase 2/4/8 start: `board.docs` schema, `resolveDocTypes`/`resolveGates`/`evaluateGates`, `assertDocGate`, `appendScratch`, `assertSafeRepoPath`, `migrateBoard`, and the new frontmatter fields (`refs`, `docs_todo`, `commits`, `prs`, `deployment`). No tool-reference changes here (that's Phase 2), but `smoke.mjs` first-stage assertions move `todo → backlog`.

## Verification

- **vitest** (`store.test.ts`, `frontmatter.test.ts`, new suites):
  - stages: default is the 7 ids; legacy `phases:` still stripped on read.
  - doc types/hierarchy: `setDoc` rejects an unknown doc id (message lists valid ids); `plan` rejected until `research`+`impact` exist; per-area override validates against its own list; a `requires` cycle or unknown-id reference in config is rejected at parse.
  - gate engine: cannot enter `review` without `post-implementation-report.md`; cannot enter `done` without `proof.md`; cannot leave `researching` without research+impact; cannot leave `planning` without plan+checklist; cannot leave `backlog` without a governing-doc ref — **unless `docs_todo: true`**; multi-stage jump `backlog→done` blocked by the first unmet threshold; a gate whose stage is absent on a custom board is inert; `create_item` directly into `done` succeeds (creation ungated, D6); after an area change, moves gate against the new area's rules.
  - refs: nonexistent/`../`-traversing path rejected; valid path round-trips; empty `refs` writes no `refs:` key.
  - scratch: `appendScratch` creates `scratch-<slug>.md`, second call appends below a blank line; not reported as a pipeline doc; readable back through `getDoc("scratch-<slug>")`; a doc-type id starting with `scratch-` is rejected.
  - backfill: a board `[todo, implementing, done]` gains `researching/planning/review/verifying` in canonical positions, keeps `todo` (alias — no `backlog` added), preserves custom stages, leaves items untouched; a `[todo, doing, shipped]` board treats `doing`/`shipped` as `implementing`/`done` aliases (no duplicate final stage); rerun → `added: []`, byte-identical; a fresh 7-stage board is a no-op; `{dryRun}` reports the same set without writing.
  - traceability: `commits`/`prs` round-trip and omit when empty; `deployment` rejected when the board has no `deployment` block; with one, `n/a`/`not-deployed`/a configured env id are accepted and an unknown env id is rejected.
  - `due` removal: old test deleted; a file still carrying `due:` round-trips via passthrough.
- **`node packages/mcp-server/src/smoke.mjs`** still green after the first-stage id change (full tool coverage lands in Phase 2).
