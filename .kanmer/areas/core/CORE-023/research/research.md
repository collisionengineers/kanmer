# Research — CORE-023: Detect when a repo's Kanmer is older than the agent's

## Question

A repo carries Kanmer artefacts that were written at install time and never move
again. The agent talks to a server that keeps moving. **What signals exist today
to tell the two apart, what would have to be added, and where must the answer be
reported so an agent actually reads it — itemised, not as a boolean?**

## Findings

### 1. The only version a repo records is the storage format — and it is the one thing already covered

- `.kanmer/version.json` is `{ format, migratedFrom?, migratedAt? }` and nothing
  else (`packages/core/src/version.ts:4-14`). `CURRENT_FORMAT = 3`.
- This repo's board: `{"format":3,"migratedFrom":2,"migratedAt":"2026-08-16T03:16:16.576Z"}`.
- `store.detectFormat()` (`packages/core/src/store.ts:166-187`) resolves it, with
  a deliberate re-stat because the GUI can migrate underneath a long-lived MCP
  server. `get_status` already returns `format`
  (`packages/mcp-server/src/index.ts:227, 244`).
- The GUI already acts on it: `App.tsx:1103-1125` shows a migration banner and
  `readOnlyClient` locks the board below format 3 (`App.tsx:109`, `lib/readOnly.ts`).
- **So board-format staleness is solved end to end.** It is the *only* dimension
  that is. Everything below has no detector at all.

### 2. `version.json` records no product version, so setup's own step 2 is unimplementable

`kanmer-setup` SKILL.md §2 says: *"If the installed Kanmer is newer than the
board was last reconciled against, apply whatever that version requires."*

Nothing anywhere records "what the board was last reconciled against". Grepping
`packages/` for `reconcil|lastReconciled|kanmerVersion|productVersion` returns
only unrelated id-allocation comments. The skill instructs the agent to compare
against a value that does not exist. **This is the single most load-bearing gap:
FRD-013 R1(b) rests on a field that was never added.**

### 3. The one shipped staleness signal for skills is inert

- `SKILLS_VERSION_FILE = ".kanmer-skills-version"` (`apps/gui/src/main/providers.ts:66`),
  written by `installSkills` (`connect.ts:160-167`), compared by `skillsStatus`
  (`connect.ts:188-210`) via `isNewerVersion` (`providers.ts:74-89`), surfaced as
  the "Update skills" button (`Settings.tsx:417-435`).
- `bundledSkillsVersion()` (`connect.ts:61-70`) reads
  `plugins/kanmer/.claude-plugin/plugin.json` → **`"version": "0.1.0"`**, while
  the root package is `0.3.2`. `scripts/release.mjs` never bumps the plugin
  manifest (MCP-012's research found the same for `packages/mcp-server/package.json`).
  So `isNewerVersion("0.1.0", installed)` is false forever. **The comparison
  cannot fire for any release that has ever shipped.**
- It is also scoped out of existence for the hosts that matter: `skillsStatus`
  returns early for `marketplace` installs, which is Claude Code and codex
  (`connect.ts:197`). Only project-scope `copySkills` hosts are ever stamped.
- Measured here: `find . -name .kanmer-skills-version` → **nothing**. This repo's
  `.claude/skills/` (12 skills, refreshed today, byte-identical to
  `plugins/kanmer/skills/`) carries no stamp, so even a working comparator would
  have nothing to compare.

Implication: a version *string* is the wrong primitive twice over — it is not
bumped, and it cannot distinguish "old install" from "user edited a skill". A
per-file digest of the installed tree against the bundled tree answers both.

### 4. The AGENTS.md managed block carries no version — and three copies of it disagree

- `scripts/agents-block.mjs:16-38`: the markers are bare HTML comments with no
  version attribute. Detection is therefore **only** possible by comparing the
  span between the markers against the canonical body (text equality or hash).
  That is a finding, not an inconvenience: adding a version attribute to the
  START marker would make old blocks detectable *and* would itself be a breaking
  change to every existing repo's marker, so hashing is the migration-free route.
- Confirmed by measurement: this repo's block (`AGENTS.md:1-20`) matches
  `BLOCK_BODY` exactly, so a hash comparison reports clean here.
- **Three bodies exist:**
  1. `scripts/agents-block.mjs` `BLOCK_BODY` — current (six fixed stages, profiles, `get_doc_gates`).
  2. `plugins/kanmer/skills/kanmer-setup/SKILL.md` fenced block — kept in step **by hand**
     (the file's own comment: *"KEEP IN STEP … Change one, change the other"*),
     mechanically verified only by `scripts/verify-agents-block.mjs` against copy 1.
  3. `apps/gui/src/main/agentsBlock.ts:11-24` — **stale v2 text**: seven stages
     (`researching`/`planning`), `impact.md`, the deleted `-import` skill. Its own
     header says *"Phase 8 reconciles the two on one canonical body"* — never done.
- `connect.ts:18` imports `applyManagedBlock` from copy 3. **The GUI's Connect
  flow writes the stale v2 block into every repo it touches, right now.** A repo
  can therefore become stale *by being set up*, which means the detector must
  compare against the canonical body, not against "whatever the GUI would write".
  (This is a live bug adjacent to, but not part of, this ticket — see
  open-questions.)

### 5. `board.yml` is behind the shipped defaults, and the compensation hides it

- This board's `board.yml` carries an explicit `profiles:` block with **no
  `questions-resolved`** in any boundary.
- `resolveProfiles()` (`packages/core/src/board.ts:85-106`) injects it at read
  time, precisely because `board.profiles ?? DEFAULT_PROFILES` means a board that
  has ever been written stops consulting the defaults (the comment at
  `board.ts:50-62` documents this being found by watching the gate not fire).
- So the file is genuinely behind and the runtime silently compensates. Any
  detector must distinguish **stale-and-compensated** (informational: the file no
  longer lists every effective requirement — `board.ts:60-61` names this trade-off)
  from **stale-and-broken**. Reporting both as plain "stale" would produce a
  permanent warning on every board in existence, which is the fastest way to make
  the report ignored.
- Other keys a newer version expects and an older `board.yml` may lack:
  `groupKinds`, `proofTypes`, `repoDocs`, `defaultProfile`, `deployment`. All have
  `?? DEFAULT_*` fallbacks (`board.ts:109-121`), i.e. all are the same
  stale-but-compensated shape. Format-3 boards may also still carry a dead
  `priorities:`/`statuses:` key that ADR-0008 strips.

### 6. `get_status` is the right home, and the GUI needs it too

- Convention is real and enforced in prose: the AGENTS.md block's first bullet is
  *"Start every session with `get_status`"*, and `kanmer-setup` §1 opens with it.
  Every skill's first call.
- `get_status` today (`index.ts:216-257`) returns `projectRoot`, `kanmerDir`,
  `exists`, `format`, `boardSource`, `deploymentTracking`, counts, `warningsCount`.
  It is `readOnlyHint: true` and runs on every session — so the check must be cheap
  and must never throw.
- The GUI is **not** covered by a `get_status` field: it has no MCP client of its
  own, it calls core directly (`snapshotOf` at `index.ts:468-477` returns `format`,
  nothing else). Its existing surfaces are the format banner and the "Update skills"
  button — which, per finding 3, never lights up. So the GUI needs the same
  itemised report through IPC, or it stays blind to everything except format.
- Detection needs `repoRoot`, not `projectRoot`: AGENTS.md and `.claude/skills/`
  live in the source checkout, while the board is at `.worktrees/kanmer`.
  `resolvePaths` already exposes `repoRoot` and `deriveRepoRoot` recognises the
  `.worktrees/<name>` shape (`paths.ts:31-54`), so this works even for the
  `.mcp.json` registration that omits `--repo-root`.

### 7. Locating the bundled artefacts from inside the server has three shapes

- packaged: `resources/mcp/kanmer-mcp.cjs` + `resources/plugins/kanmer/skills`
  (`apps/gui/electron-builder.yml:17-23`)
- plugin: `${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs` + `${CLAUDE_PLUGIN_ROOT}/skills`
  (`plugins/kanmer/mcp/claude.mcp.json`)
- dev: `packages/mcp-server/dist/standalone/` or `dist/index.js`, with the plugin
  four levels up (`connect.ts:36-58`)

Walking the filesystem for the bundled skills therefore has three different
relative answers and fails on the fourth. **Baking a manifest (path → sha256, plus
the canonical AGENTS block hash) into the bundle at build time is the robust
route** — and, critically, it is *safe against the release rail*:
`scripts/check-plugin-sync.mjs:57-76` requires the committed bundle to be
byte-identical to a fresh build, and a manifest derived purely from the source
tree is deterministic. This is the same rail MCP-012 hit; a timestamp or git sha
would break it, a content manifest does not.

### 8. The enumerated staleness dimensions

| # | Artefact | Migrated? | Reconciled by setup? | Detector today |
|---|---|---|---|---|
| 1 | `.kanmer/version.json` format | **yes** (`migrate_board`) | yes (§3) | `get_status.format` + GUI banner |
| 2 | `board.yml` missing newer keys | no | no | none (runtime `??` fallback hides it) |
| 3 | `board.yml` carrying dead keys (`priorities`, `statuses`) | yes (format 3 strip) | no, once format is current | none |
| 4 | AGENTS.md managed block body | no | yes (§4 rewrites it) | none — no version marker |
| 5 | Installed skills tree | no | **no** (setup never touches skills) | stamp exists but is inert (§3) |
| 6 | `.kanmer-skills-version` stamp absent entirely | n/a | no | none |
| 7 | Committed `kanmer-mcp.cjs` plugin bundle | no | no | none → **MCP-012's territory** |
| 8 | Provider MCP registrations (`.mcp.json`, `.codex/config.toml`) | no | no (Connect only) | none |

Rows 2–6 and 8 are this ticket. Row 1 is done. Row 7 is MCP-012.

## Implications

1. **Hashes, not versions.** Every version string in reach is stale
   (`plugin.json` 0.1.0, `mcp-server/package.json` 0.1.0, `McpServer` 0.1.0) and
   none is bumped by `release.mjs`. A content digest per artefact is the only
   primitive that is correct today, survives a user editing a skill, and needs no
   release-process change. A recorded *product* version in `version.json` is still
   worth adding — as the "last reconciled against" field setup §2 already assumes
   — but it must not be the comparison mechanism.
2. **The output must itemise.** `stale: true` is useless; the verification
   criterion in the ticket body is explicit. Proposed shape, all fields optional
   so an older server simply omits them:
   ```
   repo: {
     upToDate: boolean,
     stale: [
       { artefact: "skills", state: "behind",       detail: "3 of 12 skills differ from bundled: kanmer-plan, kanmer-review, kanmer-verify", fix: "run kanmer-setup / Update skills" },
       { artefact: "skills", state: "unstamped",    detail: ".claude/skills/ has no .kanmer-skills-version", fix: "…" },
       { artefact: "agents-block", state: "behind", detail: "AGENTS.md managed block differs from the canonical body", fix: "node scripts/agents-block.mjs <repo>" },
       { artefact: "board-config", state: "compensated", detail: "board.yml profiles omit questions-resolved; injected at read time", fix: "informational" },
       { artefact: "board-format", state: "behind", detail: "format 2, current is 3", fix: "migrate_board" }
     ]
   }
   ```
   `state` is the field that stops the report crying wolf: `behind` (act),
   `compensated` (informational, no action), `unknown` (could not read),
   `unstamped` (no evidence either way). A clean repo returns
   `{ upToDate: true, stale: [] }`.
3. **Absence is a signal.** An installed 0.3.2 server omits `repo` entirely —
   exactly as MCP-012 concluded for its `server` block. Say so in the tool
   description rather than trying to make old binaries talk.
4. **Cheapness matters.** This runs on every session's first call. Hash only what
   is small (the AGENTS block span, `board.yml`, the skills tree's `SKILL.md`
   files — not the 1.4 MB bundle), cache per process, and wrap every read so a
   failure yields `state: "unknown"` instead of breaking `get_status`.
5. **Do not auto-fix.** FRD-013 makes `kanmer-setup` the repair loop; this ticket
   is the detection that tells the user to run it. `get_status` is
   `readOnlyHint: true` and must stay so.
6. **The GUI is a second surface, not an afterthought.** Its only staleness UI
   today is the format banner plus a button that can never light up. Whether the
   GUI ships in this ticket or a follow-up is an open question.

## Scope boundary — MCP-012

[[MCP-012]] adds a `server` block to the **same `get_status` handler**
(`packages/mcp-server/src/index.ts:216-257`). Stale *binary* vs stale *repo*.
The file overlap is recorded in `files` and is the deciding factor for whether
these two can run in parallel.
