# Files — GUI-073

Surveyed before planning. Nothing here is a decision; the plan chooses among the
options the research left open (especially whether `dispatch` flips).

## Where the change lands

| Path | What changes | Risk |
|---|---|---|
| `apps/gui/src/main/providers.ts` | The antigravity entry (l.373-388): the `// agy -p is known-broken piped (GH #318/#76) → register-only in v1` comment is false for agy 1.1.13 and must go; `dispatch: false` (l.387) is the same false claim as data. The `AgentProvider.dispatch` doc comment (l.50) says "antigravity is register-only". Likely also `listProviders()` (l.396-398) if the UI is to stop interpreting one boolean, and a new field for the per-host caveat (project-binding) alongside it. | **Highest.** `dispatch` is load-bearing: `dispatchableProviders()` (l.401) feeds the "Dispatch to agent →" menu and `dispatch.ts:85` refuses non-dispatchable hosts. Flipping it to `true` without `dispatchCli`/`dispatchArgs` makes `dispatchableProviders()` silently exclude it while the badge disappears — the two would disagree, which is the exact class of bug this ticket exists to kill. Flipping it *with* naive `["-p", prompt]` produces a dispatch that runs blind to the MCP server Connect registered (research F6). Changing the `listProviders()` return type is a breaking change to the preload/IPC contract. |
| `apps/gui/src/renderer/src/components/Settings.tsx` | l.416 `{!p.dispatch && <span className="hint"> · register-only</span>}` — the badge itself. **And l.405-410**, the panel blurb, which still says skills reach "opencode, Antigravity" via "the shared AGENTS.md block for hosts that only read skills globally" — false since both get a project `.agents/skills/` copy (`providers.ts:353`, `:385`), and false about the hosts' capability (research F7). | Medium. Pure copy, but the blurb is the sentence the ticket says the badge is read *against* ("Registers … and installs the skills"), so leaving it makes the badge fix incoherent. If `listProviders()` grows fields, this is the only consumer and the typing must follow. |
| `apps/gui/src/main/providers.test.ts` | l.79-82 `it("antigravity is register-only (no dispatch)")` asserts `dispatch === false`; l.94 asserts `dispatchArgs` is undefined. Both encode the refuted claim. l.64-77 asserts `configPath === ".agents/mcp_config.json"` — **that one is correct and must survive** (research F6 confirmed the path is read). | Medium. These tests are the reason a wrong fact survived: they make it look verified. Rewriting them to state the *evidenced* capability (and, if dispatch flips, the real arg vector) is part of the change, not follow-up. |
| `docs/functional/frd/FRD-012-connect.md` | R1 (l.14) "Antigravity — config file (as shipped)" never names `.agents/mcp_config.json` and omits the project-binding condition. AC2 (l.23) claims both hosts' `/skills`-style listings show the roster — true for opencode, true for Antigravity **only in a project-bound session**, so the acceptance criterion as written fails against a bare `agy`. | Medium. It is this ticket's linked governing doc, so the plan's Governing-docs section has to say whether it is amended here or left to [[MCP-009]] (which owns the whole install matrix). Doing both risks a conflicting edit to the same lines. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/src/main/dispatch.ts` (l.84-127) | Why `dispatch: true` is not a one-line change. `spawn(provider.dispatchCli, args, { cwd: root, env, windowsHide, detached: !win32 })` — **no project binding**, and research F6 proves a bare `agy` session in a directory ignores `.agents/mcp_config.json` and `.agents/skills/`. Also shows the guard at l.85 that must stay in agreement with the badge. |
| `apps/gui/src/main/providers.ts` (l.243-263, `codexTrustWarning`) | The precedent for exactly the thing Antigravity now needs: a host-specific *conditional* surfaced as a warning string rather than a capability tier ("codex will ignore this file until you trust the folder"). Antigravity's project-binding caveat is the same shape; copy the pattern instead of inventing one. |
| `apps/gui/src/main/connect.ts` | What Connect actually writes for antigravity (config-file merge + `copySkills` into `.agents/skills` + the AGENTS block), i.e. the behaviour the new label must be true about. Read before writing any copy claiming what Connect does. |
| `.kanmer/areas/gui/GUI-073/research/research.md` | The commands, outputs and the four temporarily-modified machine files (all restored). Any re-verification should re-run those, not re-reason from the ticket body. |
| `.kanmer/areas/mcp-server/MCP-009/MCP-009.md` | The rule this ticket follows and the owner of the wider audit. It explicitly claims GUI-073 as one instance of an unverified "cannot" — so scope creep into the other four providers belongs there, not here. |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` (l.19) | The convergence note ("one project-scoped write to `.agents/skills/` serves both opencode and Antigravity") — **verified** by this research, so it must not be weakened. The staleness sentence in the same paragraph is the wrong lesson but is [[MCP-009]]'s to amend; do not edit it here or the two tickets collide on one line. |
| `.kanmer/areas/gui/GUI-075/GUI-075.md` | "Configure background dispatch per provider — model and prompt". If `dispatch` flips for antigravity, the `--project` / `--new-project` binding is a dispatch-configuration question that overlaps this ticket's boundary; check before absorbing it. |

## Ripple effects

- **`dispatchableProviders()` → the "Dispatch to agent →" menu.** Any change to
  `dispatch` adds Antigravity to that menu (only if `dispatchCli` + `dispatchArgs`
  are also set — the filter at `providers.ts:401` requires all three). The
  ticket's own verification bullet demands the badge and the menu agree, so these
  two must be changed together or neither.
- **`dispatch.ts:85-86`** throws `"…doesn't support background dispatch."` — the
  wording should end up consistent with whatever the badge now says.
- **IPC / preload types.** `listProviders()`'s return type crosses the main→
  renderer boundary; widening it touches the preload bridge and the renderer's
  provider type. Grep for `listProviders` consumers before changing the shape.
- **Tests.** `providers.test.ts` (l.64-95) and `dispatch.test.ts` both assert on
  the provider registry; `connect.test.ts` covers the merges (unchanged here).
- **Docs.** FRD-012 R1/AC2 (above). ADR-0009 l.19's convergence claim is
  *confirmed* by this work — worth citing rather than editing.
- **Screenshots / release notes** that show the Connect panel will show the old
  badge text.

## Out of scope

- **Amending ADR-0009's staleness clause** — [[MCP-009]] owns it and says so.
- **The other four providers' capability claims** — [[MCP-009]]'s audit.
- **Fixing `plugins/kanmer/skills/kanmer-report/SKILL.md`'s frontmatter**, which
  fails Antigravity's YAML parser and silently drops one skill of twelve
  (research F9). Real, evidenced, and a genuine parity defect — but it is an
  install-parity bug, not a label bug. Raised in open-questions as a ticket
  candidate.
- **Moving Antigravity onto the plugin install path** (`agy plugin install`,
  which research F8 shows exists and is already used on this machine) — that is
  the parity question [[MCP-009]] exists to answer.
- **Any change to the `.agents/mcp_config.json` register path.** It was probed
  and it works; the ticket's premise about project-level support is correct.
