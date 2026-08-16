---
status: draft
---

# ADR-0013 — Repo staleness is judged by content, not by version

## Context

`.kanmer/version.json` records the storage **format** and nothing else, and the format-3 migration (ADR-0008) moves ticket structure and nothing else. A repo carries far more than ticket structure, and none of the rest migrates or is reconciled by anything:

| # | Artefact | Migrated? | Reconciled by setup? | Detector before this ADR |
|---|---|---|---|---|
| 1 | `.kanmer/version.json` format | **yes** | yes | `get_status.format` + the GUI banner |
| 2 | `board.yml` missing newer keys | no | no | none — the runtime `?? DEFAULT_*` fallback hides it |
| 3 | `board.yml` carrying dead keys (`priorities`, `statuses`, `docs`) | yes, on migration | no, once format is current | none |
| 4 | The AGENTS.md managed block body | no | yes (setup rewrites it) | none — the markers carry no version |
| 5 | The installed skills trees | no | **no** — setup never touches skills | a stamp comparison that cannot fire (below) |
| 6 | An absent `.kanmer-skills-version` | n/a | no | none |
| 7 | The committed `kanmer-mcp.cjs` bundle | no | no | `get_status.server` (MCP-012) |
| 8 | Provider MCP registrations | no | no — Connect only | none |

So a repo set up on 0.3.2 keeps 0.3.2's skills and AGENTS block indefinitely while the agent talks to a newer server. This is not hypothetical: during CORE-023's own run, Connect overwrote this repo's `AGENTS.md` with a stale **v2** block — seven stages, `impact.md`, and the deleted `-import` skill — instructions that would misroute any agent reading them, written by Kanmer itself, noticed by nobody.

[[MCP-012]] closed row 7 and deliberately stopped there: it reports which build is answering and does not judge, because judging needs a known-good reference to compare against.

Every version string in reach is unusable as that reference. `version.json` records no product version at all. `plugins/kanmer/.claude-plugin/plugin.json` was frozen at `0.1.0` while the root package was `0.3.2`, so the one shipped staleness comparison — `isNewerVersion(bundledSkillsVersion(), installed)` behind the GUI's "Update skills" button — could never return true for any release that has ever shipped. A version string also cannot represent the case that matters most in practice: a user editing a skill.

## Decision

`get_status` gains a `repo` block beside `server`: **`{ upToDate, stale: [{ artefact, state, detail, fix }] }`** — itemised, never a bare boolean, covering rows 2–6 and 8. Row 1 stays where it is and row 7 stays MCP-012's; duplicating either would be a second source of truth.

1. **Compare by content hash.** Every artefact is judged by a sha256 of its text, line endings normalised, against what this build ships. No product version is recorded, read or required, and none needs to be added.
2. **The reference is discovered from the running server's own path, and nothing is baked into the bundle.** MCP-012's `classifyBuild()` already resolves which of the four shapes is running, so the bundled skills tree is a determined sibling in each. The canonical AGENTS block body is read out of the bundled `kanmer-setup/SKILL.md`, whose marker span `scripts/verify-agents-block.mjs` check 7 pins byte-for-byte to `scripts/agents-block.mjs`'s `BLOCK_BODY` — so **nothing hardcodes the block text**, and rewriting it needs no change to the detector.
3. **Four states, and only one of them means "act":** `behind`, `compensated` (the file is old and the runtime already papers over it — informational), `unstamped` (no evidence either way), `unknown` (unreadable, or no reference). `upToDate` is true **iff nothing is `behind`**.
4. **The skills walk iterates the bundled tree into each destination, never the destination itself.**
5. **Detection only.** `get_status` stays `readOnlyHint: true`; every `fix` is a pointer at `kanmer-setup`, which FRD-013 makes the repair loop. Nothing is cached, so a repair is visible on the very next call.
6. **Absence is the signal**, as for `server`: a server older than 0.3.4 omits `repo` entirely, and that means "pre-0.3.4", not "error".

## Alternatives considered

**(a) Record a product version — `reconciledWith` in `version.json` — and compare that.** This is what `kanmer-setup` §2 already assumes exists ("if the installed Kanmer is newer than the board was last reconciled against…"). Rejected as the *mechanism*: nothing writes it, so it would be permanently absent and would have to report `unknown` on every repo forever; and even once written it cannot see a user's edit. Worth adding later **with its writer**, under FRD-013, as a record rather than a comparator.

**(b) Bake a content manifest into the standalone bundle at build time.** Authorised by the operator, and the route CORE-023's research preferred before MCP-012 landed. Rejected once `classifyBuild()` made discovery reliable: a baked *skills* manifest would make the bundle's bytes a function of every skill prose file, and `scripts/check-plugin-sync.mjs` compares the committed bundle byte-for-byte against a fresh build — so from then on every skill-prose edit would fail `plugin:check` until somebody rebuilt the MCP bundle. A permanent tax on a file nobody would expect to be coupled to the binary. Discovery adds no build-time input at all, which satisfies the determinism constraint (FRD-022 R5b/R6) trivially rather than carefully.

**(c) Report a single `stale: true/false`.** Rejected in the ticket's own acceptance criteria: not actionable, and it cannot express `compensated`, which is the state that keeps the report credible.

**(d) Repair automatically.** Rejected: `get_status` is the orientation call and is `readOnlyHint`. FRD-013 already specifies setup as the reconciliation path, and a read that silently rewrites a repo's AGENTS.md is the failure this ADR exists to detect, not a fix for it.

## Consequences

- Three previously invisible classes of drift become visible on the call every session already makes. Measured on this repo the day the detector landed: `.claude/skills` 3 files behind, `.agents/skills` 17 files behind and unstamped, `board.yml` `compensated` — and **no** row for the `run-kanmer` skill the user added, or for the correctly-rooted `.mcp.json`.
- `compensated` is a standing commitment about what Kanmer will *not* warn about. Every future artefact row must choose a state under rule 3, and the default for "the runtime already handles it" is `compensated`, not `behind`.
- Two small lists in `staleness.ts` — the skill destinations and the registration file paths — mirror `apps/gui/src/main/providers.ts`, because core cannot depend on the Electron main process. The GUI follow-up inverts that: `providers.ts` reads them from core.
- The GUI is **not** covered. It has no MCP client and calls core directly, so it stays blind to everything but board format until the follow-up ships the IPC surface.
- The detector adds no dependency and no build step. `~35` small reads per skills destination, measured at 36 ms on this repo, recomputed per call.

Related: FRD-013 (the repair path) · FRD-022 R5b (the `server` block this mirrors) · ADR-0008 (what migration does cover) · ADR-0009 · MCP-012 · GUI-080.
