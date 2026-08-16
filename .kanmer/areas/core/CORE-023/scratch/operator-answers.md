## OPERATOR + SCHEDULER ANSWERS — 2026-08-16

**Q3 — does the GUI surface ship here? OPERATOR ANSWERED: NO. MCP only; the GUI
surface is a follow-up.**

`get_status` reports an itemised stale list. Every skill calls `get_status` first
by convention, so agents get it immediately. The GUI stays blind to everything
except board format, which it already detects and banners. Do not add IPC, preload
or renderer work — that roughly doubles the ticket and the operator declined it.
File the GUI surface as a follow-up ticket at closeout; do not build it.

**Q1 — sequence with MCP-012? SCHEDULER: sequence, MCP-012 FIRST.** Both edit the
same ~40-line `get_status` handler at `packages/mcp-server/src/index.ts:216-257`,
both add a top-level block to the same returned object, both rewrite the same tool
description, and both force a rebuild of the committed 1.4 MB bundle — which is
unmergeable, so whichever lands second rebuilds by hand. MCP-012 is in flight now.
**Rebase onto it and read what it actually shipped** before touching the handler.

**Q2 — is a source-derived fingerprint acceptable given `check-plugin-sync.mjs`
demands byte-identity with a fresh build? OPERATOR ANSWERED: YES**, via MCP-012 —
the operator authorised changing `release.mjs` to rebuild the bundle inside the
release commit. Same call, answered once for both tickets. The constraint that
survives: **the stamp must be a pure function of the source tree.** A build
timestamp breaks byte-identity every build; an embedded git sha breaks it every
commit. MCP-012 is implementing this first — inherit its approach rather than
inventing a second one.

**Q4 — the `agentsBlock.ts` live bug. ANSWERED, and it stopped being hypothetical.**
See the `live-reproduction` scratch note beside this one: during this run Connect
overwrote this repo's `AGENTS.md` with the stale v2 block — seven stages,
`impact.md`, the deleted `-import` skill. Diff saved to the scratchpad; working
tree reverted.

**[[SKILL-013]] owns the fix** (pointing `connect.ts` at the canonical body),
because it owns deciding what the canonical body *is*. **CORE-023 keeps
detection**, and should cite this reproduction as its motivating case rather than
a hypothetical. Do not fix the pointer here — SKILL-013 is rewriting the block
body and a second ticket editing it would conflict.

## Design points already settled in research — do not re-derive

- **Shape:** `repo: { upToDate, stale: [{ artefact, state, detail, fix }] }`.
  Itemised, never a bare boolean. `state` in `behind` | `compensated` |
  `unstamped` | `unknown`. All fields optional so an older server omits `repo`
  entirely — **absence is the signal**, matching MCP-012's convention.
- **Compare by content hash, not version string.** Every version string in reach
  is stale: `version.json` records no product version at all, and
  `plugins/kanmer/.claude-plugin/plugin.json` is frozen at `0.1.0` (MCP-011 is
  fixing that, separately).
- **Detection reads `repoRoot`, not `projectRoot`.**
- **The false-positive trap:** every board omits `questions-resolved` from
  `board.yml` because `resolveProfiles()` injects it at read time. Reporting that
  as `behind` would put a permanent warning on every board in existence. A user's
  own extra skill must likewise not count as drift.
- **In scope (rows 2-6 and 8 of your table):** `board.yml` missing newer keys or
  carrying dead ones, the AGENTS.md managed block (no version marker exists — hash
  the span between the markers), the installed skills tree, an absent
  `.kanmer-skills-version`, and provider MCP registrations. **Row 1 (format) is
  already covered**; **row 7 (the binary) is MCP-012's.**
