# Plan — CORE-023: Detect when a repo's Kanmer is older than the agent's

Written from `research` and `files`, and from the operator's answers in
`scratch-operator-answers` + the reproduction in `scratch-live-reproduction`.
Rebased onto [[MCP-012]] (`efdc9f3`, PR #46), which has merged.

## Approach

`get_status` gains a `repo` block beside MCP-012's `server` block:
`repo: { upToDate, stale: [{ artefact, state, detail, fix }] }` — **itemised,
never a bare boolean**, with `state` in `behind` | `compensated` | `unstamped` |
`unknown`. MCP-012 reports *which binary is answering*; this reports *whether
this repo's artefacts match it*. MCP-012 deliberately only reports and parked
judging as CORE-023's job, because judging needs a known-good reference to
compare against — that reference is what this plan resolves.

**Comparison is by content hash, never by version string.** Every version string
in reach is stale: `version.json` records no product version, and
`plugins/kanmer/.claude-plugin/plugin.json` is frozen at `0.1.0`. A digest also
survives a user editing a skill, which a version string cannot represent.

**The known-good reference is discovered at runtime from the server's own path,
and nothing is baked into the bundle.** This is the one place the plan improves
on what research proposed, and it is only possible *because* MCP-012 landed:
`classifyBuild()` already tells us which of the four shapes is running, so the
bundled skills tree is a determined sibling of the running script in every
shape (`packaged` → `<resources>/plugins/kanmer/skills`, `plugin` →
`<pluginRoot>/skills`, `dev-*` → `<repo>/plugins/kanmer/skills`), and `unknown`
→ `state: "unknown"`. Research preferred a manifest baked in at build time, and
the operator authorised that (Q2) — but a baked skills manifest would make the
bundle's bytes depend on **every skill prose file**, so `check-plugin-sync`'s
byte comparison would then demand an MCP rebuild on every skill edit, including
[[SKILL-013]]'s in-flight one. Runtime discovery costs nothing on the rail, adds
no build-time input at all, and honours the constraint that survived Q2 ("pure
function of the source tree") trivially by adding no input to the bundle.

The **canonical AGENTS.md body comes from the same discovered tree**: the span
between the two markers in the bundled `kanmer-setup/SKILL.md`, which
`scripts/verify-agents-block.mjs` check 7 already pins byte-for-byte to
`scripts/agents-block.mjs`'s `BLOCK_BODY`. Verified by measurement: extracting
that span yields a 2175-byte string identical to `BLOCK_BODY`. **Nothing hard-codes
the current text**, so when SKILL-013 rewrites the canonical body the detector
follows it automatically — which is required, since SKILL-013 owns that body and
is in flight.

## Governing docs

- **`docs/functional/frd/FRD-013-setup-as-reconciliation.md` — meets, and makes
  R1(b) implementable for the first time.** R1(b) says every setup run must
  "apply any Kanmer-version upgrade steps". Research finding 2 established that
  nothing records what a board was last reconciled against, so the skill
  instructs the agent to compare against a value that does not exist. This
  ticket supplies the comparison R1(b) needs — by content, not by a recorded
  version — and stops at detection: `get_status` stays `readOnlyHint: true`,
  every `fix` string points at `kanmer-setup`, and nothing is repaired here.
  FRD-013 is unchanged; the repair loop it specifies is the consumer.
  AC4 ("`verify-agents-block` passes after any run") is untouched — no step
  edits `scripts/agents-block.mjs`.
- **`docs/architecture/adr/ADR-0008-single-format-3-migration.md` — meets.**
  ADR-0008 strips `priorities:`/`statuses:` as part of the one format-3
  migration. The `board-config` rows report a format-3 board still carrying
  those dead keys as `behind` — i.e. a board that escaped the migration — which
  is ADR-0008's own contract observed, not extended. Board **format** itself is
  deliberately *not* an entry in `stale[]`: it is already reported as
  `get_status.format` and bannered by the GUI, and duplicating it would be the
  second source of truth ADR-0008 exists to avoid.
- **`docs/functional/frd/FRD-022-mcp-server-surface.md` — meets R5b's
  conventions without modifying it.** R5b's rules are inherited verbatim: every
  field degrades rather than failing the orientation call, the block is absent
  on older servers and that absence is the signal, and the stamp adds no
  non-deterministic build input (here, no build input at all — R6's byte
  comparison is untouched, and R5c's release rebuild is unaffected).
- **New: `docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md`.**
  The one genuinely architectural decision — compare by content hash against a
  reference discovered from the running server's own path, report itemised with
  a four-value `state` vocabulary, and never repair — is written as an ADR via
  `kanmer-docs` and linked into `refs`. It is the decision every future artefact
  row will be added under, and the `compensated` state in particular is a rule
  about what Kanmer will *not* warn about, which belongs in a durable document
  rather than a code comment.

## Steps

1. **`packages/core/src/staleness.ts` (new)** — the detector.
   `detectStaleness({ paths, board, boardSource, format, bundledSkillsDir })`
   returns `{ upToDate, stale[] }`. Every filesystem read is individually wrapped
   so a failure yields `state: "unknown"` for that artefact and never throws;
   `get_status` must not be breakable by an unreadable file. No caching — the
   result is recomputed per call, deliberately, for the same reason
   `store.detectFormat()` re-stats (`store.ts:167-171`): a cached "stale" answer
   that survives the user running `kanmer-setup` in the same session would tell
   the agent its own fix did not work. Cost is bounded (~35 small file reads per
   destination) because of step 3's walk rule.
2. **AGENTS.md row.** Read `<repoRoot>/AGENTS.md` — `repoRoot`, **not**
   `projectRoot`: this repo's board is at `.worktrees/kanmer` and AGENTS.md is
   in the checkout. No file, or no markers → `unstamped`. Markers present and
   the span between them differs from the reference body → `behind`, `fix:`
   naming `kanmer-setup` / `node scripts/agents-block.mjs <repo>`. Markers
   malformed (END before START, or one of two), or no reference body available →
   `unknown`. Line endings normalised (CRLF → LF) on both sides before hashing.
   **Motivating case, now real:** `scratch-live-reproduction` records Connect
   overwriting this repo's `AGENTS.md` with the stale v2 block during the run
   that produced this ticket — seven stages, `impact.md`, the deleted `-import`
   skill. This row is the detector for exactly that. Fixing the cause is
   SKILL-013's; nothing here touches `agentsBlock.ts`.
3. **Skills rows.** For each destination that exists — `.claude/skills`,
   `.agents/skills`, `.grok/skills` under `repoRoot` — **iterate the bundled
   tree's relative paths and look each one up in the destination.** Never
   enumerate the destination. That single rule buys three things at once: a
   user's own skill cannot count as drift (the operator's explicit
   false-positive rule), a destination is skipped entirely when it holds none of
   Kanmer's skills, and the measured 115-file `run-kanmer/node_modules` tree
   already sitting in this repo's `.claude/skills` is never walked. Missing or
   differing files → `behind`, reported **per skill folder**, not per file, so
   the detail stays one line. `RETIRED_SKILL_PATHS` still present → `behind`
   (reporting only; removing them is [[GUI-080]]). No reference tree → `unknown`.
4. **Skills-stamp row.** A destination that carries Kanmer skills but no
   `.kanmer-skills-version` → `unstamped`, never `behind`: no stamp is an
   absence of evidence, not evidence of staleness. (Measured: this repo's
   `.agents/skills` is stamped and its `.claude/skills` is not.)
5. **`board-config` rows.** Skipped entirely when `boardSource === "default"` —
   a synthesized board cannot be stale. Dead keys (`statuses`, `priorities`, the
   legacy `docs`) on a format-3 board → `behind`. Profiles present but omitting
   `questions-resolved` on a boundary `resolveProfiles()` injects it into →
   **`compensated`**, and missing newer keys (`groupKinds`, `proofTypes`,
   `defaultProfile`, `repoDocs`) → `compensated`. This is the load-bearing
   distinction: **every board in existence** omits `questions-resolved` because
   `resolveProfiles()` injects it at read time, so reporting it as `behind` would
   put a permanent warning on every `get_status` call and kill the feature on
   arrival.
6. **`mcp-registration` rows.** For each known registration file under
   `repoRoot` — `.mcp.json`, `.codex/config.toml`, `.grok/config.toml`,
   `opencode.json`, `.agents/mcp_config.json` — if it registers `kanmer` with an
   explicit `--root`, compare that root against `paths.projectRoot`
   (case-insensitive, separators normalised); a mismatch → `behind` ("registered
   against a board that is not this one — reconnect"). Extraction is a single
   regex for the quoted token after `"--root"`, unescaped with `JSON.parse`,
   which reads JSON and TOML alike — so **no TOML dependency is added to core**.
   A file with no `--root` is not stale (the server discovers the board), and an
   unreadable file → `unknown`. Verified against this repo's real `.mcp.json`,
   which points at `.worktrees/kanmer` and correctly produces no row.
7. **`packages/core/src/staleness.test.ts` (new)** — vitest over a temp repo:
   clean → `{ upToDate: true, stale: [] }`; drifted block → `behind`; absent
   block → `unstamped`; malformed markers → `unknown`; drifted skill file →
   `behind` naming the skill; an extra user skill → **no row**; retired path
   present → `behind`; unstamped destination → `unstamped`; `questions-resolved`
   absent → `compensated`, and `upToDate` still `true`; dead `priorities` key →
   `behind`; registration with a foreign `--root` → `behind`; registration with
   the right root → no row; unreadable artefact → `unknown`.
8. **`packages/core/src/index.ts`** — export the detector and its types.
9. **`packages/mcp-server/src/bundled.ts` (new)** — `bundledSkillsDir()`:
   resolve the reference tree from `serverIdentity()`'s already-computed `path`
   and `build`, one case per shape, `null` for `unknown` or a tree that is not
   there. Consumes MCP-012's values; re-derives nothing.
10. **`packages/mcp-server/src/index.ts`** — `get_status` returns `repo:` after
    `server:`, and the tool description gains the `repo` paragraph plus the same
    absence-is-the-signal sentence MCP-012 wrote for `server`. This is the file
    [[MCP-006]] is queued behind, so the edit stays inside the handler and the
    description string.
11. **`packages/mcp-server/src/smoke.mjs`** — extend the `get_status`
    assertions: the fresh sandbox reports `repo.upToDate === true` with an
    `agents-block` row in state `unstamped`; then write a deliberately stale
    managed block into the sandbox's `AGENTS.md`, call `get_status` again, and
    assert that row flips to `behind` and `upToDate` to `false`. mcp-server has
    no vitest suite, so this is the only executable end-to-end test of the tool
    and it must prove the detector actually detects, not merely that a field
    exists — the same standard MCP-012's block was held to.
12. **`plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` and
    `AGENTS.md` §7** — update the `get_status` prose. `git diff AGENTS.md` is
    checked before every commit: only the §7 line may move, never the managed
    block.
13. **`docs/architecture/adr/ADR-0013-…`** — write it, `link_doc` it into `refs`.
14. **Rebuild the committed bundle** (`npm run plugin:build`) and run the rail:
    `npm test`, `npm run typecheck`, `npm run plugin:check`,
    `npm run smoke:protocol`.
15. **File the GUI-surface follow-up ticket** at closeout (operator's Q3: MCP
    only, no IPC/preload/renderer). It should also carry the small tidy this
    plan defers: `providers.ts` reading the destination and registration-file
    lists from core instead of core mirroring them.

## Verification

`proof.md` is written on merged `main` and carries:

- `npm test` (including the new `staleness.test.ts` cases), `npm run typecheck`,
  `npm run plugin:check`, `npm run smoke:protocol`, `npm run smoke` — command
  output as evidence.
- The smoke script's own new assertions, which are the end-to-end proof: a
  sandbox repo reporting clean, then reporting `behind` after its managed block
  is made stale.
- A `get_status` call against **this** repo on merged main, whose output is the
  ticket's three acceptance criteria at once: it names `.claude/skills` as
  behind (3 files measured to differ from the bundled tree today), reports
  `board.yml`'s missing `questions-resolved` as `compensated` rather than a
  warning, and produces **no** row for the `run-kanmer` skill the user added or
  for the `.mcp.json` that is correctly rooted.
- The enumeration itself — research's table of what is and is not covered by
  migration — is written down in ADR-0013, satisfying the third acceptance
  criterion ("written down, not implied").

## Risks / open questions

- **False positives are the whole risk.** Mitigated by the `compensated` state,
  by walking the bundled tree rather than the destination, and by test cases 7
  that assert the *absence* of rows for a user's own skill and a correct
  registration.
- **`plugin:check` byte-identity.** Mitigated by adding no build-time input at
  all. The bundle still needs one rebuild because `src/index.ts` changed; use
  MCP-010's recipe (`npm install` in the worktree, settle `plugin:check` in a
  clean detached checkout) since the main checkout is contended.
- **SKILL-013 conflict.** Avoided: no step touches `agentsBlock.ts`,
  `scripts/agents-block.mjs`, or the canonical body. The reference is read from
  the bundled `kanmer-setup/SKILL.md` at runtime, so SKILL-013's rewrite is
  picked up with no code change here. If SKILL-013 lands first, only the
  `tool-reference.md` line could conflict.
- **[[MCP-006]] is queued behind me on the same `index.ts`.** Mitigated by
  keeping the edit inside the `get_status` handler and its description, and by
  announcing the merge.
- **`apps/gui/src/main/kanmerGit.test.ts` flakes under load** — pre-existing,
  tracked as GUI-085. Rerun alone with `--testTimeout=30000` and move on.
- **Deferred, recorded:** `version.json` gains no `reconciledWith` field here
  (open question Q8). A field with no writer is permanently absent, which would
  have to report `unknown` on every repo forever — a row that fires always and
  means nothing. It belongs with `kanmer-setup`'s writer, in FRD-013's ticket.
