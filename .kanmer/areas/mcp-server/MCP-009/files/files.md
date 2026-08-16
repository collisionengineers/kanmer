# MCP-009 — Files: what this change touches

Scoped to the ticket as written. If the split proposed in `research` is
accepted, rows are tagged with the sub-ticket that would own them
(**a**/**b**/**c**/**d**); untagged rows stay with MCP-009.

## Files the change touches

| Path | What changes | Risk |
|---|---|---|
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | Replace ¶19 (the staleness clause) with the absence-of-evidence rule + check-the-binary method; correct the convergence note — `.agents/skills/` serves opencode **and grok**, not Antigravity. Text drafted verbatim in `research` §Finding 10. | **Medium.** Amending a merged ADR's reasoning. The convergence correction contradicts a line dated "verified 2026-08-15", so it changes a *fact*, not just a lesson. Needs the operator's sign-off (Q1). The ADR is `status: draft`, which lowers the bar but does not remove it. |
| `docs/functional/frd/FRD-012-connect.md` | R2 install matrix is wrong for grok and Antigravity; AC2 is unsatisfiable as written; R5 repeats the wrong lesson. Rewrite the matrix from `research` Findings 1-9 and replace R5 with a pointer to the amended ADR clause. | **Medium.** This is the "single description" the ticket says to keep authoritative; every other doc defers to it, so an error here propagates. AC2 currently asserts a behaviour that cannot pass — changing an acceptance criterion needs to be visible, not quiet. |
| `apps/gui/src/main/providers.ts` | claude/codex `marketplaceCommands` take a marketplace **root**, not the plugin dir; add codex's missing `codex plugin add kanmer@kanmer-plugins`; grok `copySkills` → plugin install (**b**); antigravity `copySkills` → plugin install and `dispatch: true` with `dispatchArgs: (p) => ["-p", p]` (**c**); the `.mcp.json` key collision with claude (**d**). Every stale comment on lines 348-352, 382-386 needs replacing with the commands in `research`. | **High.** The single registry every provider behaviour derives from; `connect.ts`, `Settings.tsx` and the whole test suite read it. Changing `dispatch` changes the "Dispatch to agent →" menu. Changing an `install.kind` changes what `skillsStatus()` returns and therefore the Connect UI. |
| `apps/gui/src/main/connect.ts` | `pluginRoot()` (55-58) currently returns the *plugin* dir and is used for two different jobs — the skills source (correct) and the marketplace source (wrong). Needs to become two functions, or `marketplaceCommands` needs the root passed separately. **(a)** | **High.** `installSkills` swallows every command failure into a note string (152-154), which is exactly why this has gone unnoticed; a fix that stays silent on failure fixes nothing observable. |
| `apps/gui/electron-builder.yml` | `extraResources` must also ship `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json` so the packaged app has a real local marketplace root. The comment on lines 20-21 asserts this already happens. **(a)** | **High.** Packaging-only — invisible to `npm test` and to any dev-mode run, since `pluginRoot()` takes a different branch when `!app.isPackaged`. A green test suite will not catch a regression here. |
| `README.md` (§"Install as a plugin", 158-179) | Retitle away from "Claude Code & codex"; add opencode, grok and Antigravity; correct codex's second step to `codex plugin add kanmer@kanmer-plugins`; state the install scope. | Low. Prose, but it is the end-user contract and currently understates the product. |
| `apps/gui/src/main/*.test.ts` (provider/connect specs) | Any test asserting `marketplaceCommands` output, grok's `skillsDir`, or `dispatchableProviders()` membership. | Medium. Tests currently encode the wrong commands, so they will pass before the fix and fail after — that is the fix working, not a regression. |
| `apps/gui/src/renderer/**/Settings.tsx` (416) | Only if `dispatch` flips for antigravity — the `· register-only` badge disappears on its own. | Low, and **owned by [[GUI-073]]** — do not edit the label here. |

## Ripple effects

- **`skillsStatus()` / "Update skills".** Moving grok or antigravity from
  `copySkills` to `marketplace` changes `scope` from `"project"` to
  `"marketplace"`, which makes `installedVersion` null and `updateAvailable`
  permanently false for those hosts. The affordance does not just change — it
  disappears. Interacts with [[MCP-011]] (the version is frozen at `0.1.0` so it
  never fires today anyway) and with [[GUI-080]] (which is designing a roster
  record inside `SKILLS_VERSION_FILE` that a marketplace host would never write).
  **These three tickets must agree on the end state before any of them lands.**
- **Disconnect.** `removeBundledSkillsOnly` and the `unmerge` functions reverse
  what connect wrote. If connect stops writing `.agents/skills` for antigravity,
  disconnect must still clean up trees written by earlier versions, or existing
  installs keep a stale roster forever — the exact failure [[GUI-080]] exists to
  fix, arriving by a new route.
- **The `.mcp.json` collision (Finding 7)** means grok's disconnect currently
  deletes Claude Code's registration. Any change to grok's registration must
  either preserve that shared file or move grok to `.grok/config.toml`
  (`grok mcp add -s project` exists and writes it).
- **[[MCP-011]]** bumps both `plugin.json` versions to `0.3.2`. Codex caches the
  installed plugin under a version-keyed path
  (`~\.codex\plugins\cache\kanmer-plugins\kanmer\0.1.0`), so that bump also
  changes codex's cache directory — worth landing in a known order.
- **[[GUI-073]]**'s third verification item ("Connecting Antigravity still
  writes `.agents/mcp_config.json` **and** `.agents/skills`") is falsified by
  Finding 4c and cannot be satisfied. It is already in Preparing with research
  written; it needs telling. See Q1/Q2.
- **The release rail.** ADR-0009 puts the AGENTS block and tool descriptions on
  the reviewed-surface list. If a `plugin:check` lands (proposed by [[MCP-011]]),
  the marketplace-root correctness in `extraResources` belongs in the same check
  — it is the failure no unit test can see.
- **No schema, no MCP tool surface, no board data** is touched by any of this.

## Deliberately out of scope

- **[[MCP-011]]** — the two `plugin.json` manifests (`0.1.0` vs `0.3.2`, the
  `node` runtime assumption, the missing `--root`). Recorded with evidence in
  `research` §Finding 6; **not fixed here**.
- **[[GUI-073]]** — the `· register-only` badge wording and `listProviders()`'s
  shape. This ticket supplies the evidence that `dispatch: false` is wrong;
  GUI-073 owns the label.
- **[[GUI-080]]** — pruning retired skills on install/update/disconnect.
- **[[MCP-010]]** — board discovery / the missing `--root`.
- Publishing to any public marketplace directory (explicitly out of scope in
  `docs/plans/implementation-audit.md:103`).
- The Antigravity **IDE** (as opposed to the `agy` CLI) — not installed on this
  machine and not investigated. See Q1.

## Context files an implementer must read first

| Path | What it tells you |
|---|---|
| `MCP-009/research` (this ticket) | The only place the actual CLI commands and their outputs are recorded. Every claim in `providers.ts`'s comments is either confirmed or refuted there, with the command. Read it before touching a single provider entry. |
| `apps/gui/src/main/connect.ts:54-70` | `pluginRoot()` and `bundledSkillsVersion()` — the two functions at the centre of both the marketplace bug and MCP-011's version bug. Note they share the same path helper for different purposes. |
| `apps/gui/src/main/connect.ts:144-170` | `installSkills` — shows that every install command failure is caught and reduced to a note string. Explains why a broken install path shipped; anything you change here must surface failure. |
| `apps/gui/src/main/providers.ts:142-154` | The codex TOML merge's docblock — an example of a capability claim done *right* ("verified against the installed CLI, 2026-08-16"), and the format the other comments should match. |
| `apps/gui/src/main/providers.ts:206-264` | `codexTrustFromConfig` + `codexTrustNote`. Real-world trust tables are ancestor-shaped, so `maybe-via-ancestor` is the common answer, not the edge case. |
| `docs/architecture/adr/ADR-0007` | Why codex registration is project-scoped per project. Constrains any move toward global plugin installs — `claude plugin install` defaults to `--scope user`, which cuts against it. |
| `docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:28-30` | The original requirement to ship "the two marketplace JSONs" in `extraResources`. Confirms the packaging gap is a regression against a written decision, not an unmade one. |
| `GUI-080/research` | Already-written analysis of the install-as-overlay problem, including its open question about whether marketplace hosts prune. Findings 2 and 6 here (codex's version-keyed cache dir) bear on it directly. |
