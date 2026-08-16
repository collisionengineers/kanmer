# Proof — GUI-080

Verified on **merged `main`**, commit `9ac20af`
("fix(gui): install skills by reconciling, not overlaying (#41)"), in a worktree
detached at `origin/main`. Not the feature branch.

## The honest caveat, first

**The "Update skills" button this ticket repairs is still unreachable, and
nothing below claims otherwise.** `plugins/kanmer/.claude-plugin/plugin.json` is
pinned at `0.1.0` while the app ships 0.3.2. `bundledSkillsVersion()` reads that
manifest, `skillsStatus` sets `updateAvailable` only when the bundled version is
*strictly newer* than the stamp, and `Settings.tsx:417-437` renders the button
only when `updateAvailable` is true. So after any install the versions are equal
and the button never appears.

**[[MCP-011]] owns that bump** — its approved plan is to "bump both `plugin.json`
versions to the repo version and add a rail check that they cannot drift again"
— and two tickets editing the same file is a conflict, so GUI-080 deliberately
left it alone.

What that means for this proof: **Connect is the reachable entry point today**,
and it runs `installSkills` — exactly the same code the button would run. The
evidence below is of that path. No screenshot of the button is included, because
there is nothing to screenshot until MCP-011 lands.

## Rail (merged main)

```
$ git log --oneline -1
9ac20af fix(gui): install skills by reconciling, not overlaying (#41)

$ npm test
> @kanmer/core@0.1.0 test  → vitest run
 Test Files  9 passed (9)
      Tests  193 passed (193)
> @kanmer/gui@0.3.2 test   → vitest run
 Test Files  22 passed (22)
      Tests  230 passed (230)

$ npm run typecheck
> @kanmer/core@0.1.0 typecheck        → tsc --noEmit
> @kanmer/mcp-server@0.1.0 typecheck  → tsc --noEmit
> @kanmer/ui@0.2.0 typecheck          → tsc --noEmit
> @kanmer/gui@0.3.2 typecheck         → tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json
(all four workspaces named, all clean)

$ npm run verify:agents-block
26/26 checks passed
```

Of the 230 GUI tests, 16 are this ticket's: 9 in `connect.test.ts`, 7 in
`providers.test.ts`. The pre-existing "never touch a foreign skill" contract
(`connect.test.ts:14-33`) is byte-unchanged and green.

## Evidence A — a v2-era install repaired against the real bundle

A temp project seeded to look exactly like the install that prompted this ticket:
the two paths `130f837` retired, a **legacy bare `0.1.0` stamp** (no roster), and
a user-authored skill alongside. Reconciled against the real
`plugins/kanmer/skills` (12 folders).

```
--- A. BEFORE ---
.kanmer-skills-version                          <- bare "0.1.0", no roster
kanmer-import/SKILL.md                          <- retired by 130f837 (folder)
kanmer-research/assets/impact-template.md       <- retired by 130f837 (renamed file)
run-kanmer/SKILL.md                             <- the operator's own skill

--- A. result ---
installed: kanmer-auto, kanmer-closeout, kanmer-docs, kanmer-execute,
           kanmer-groom, kanmer-plan, kanmer-report, kanmer-review,
           kanmer-setup, kanmer-tickets, kanmer-verify
replaced:  kanmer-research
removed:   kanmer-import, kanmer-research/assets/impact-template.md

--- A. AFTER (top level) ---
.kanmer-skills-version
kanmer-auto/  kanmer-closeout/  kanmer-docs/  kanmer-execute/  kanmer-groom/
kanmer-plan/  kanmer-report/    kanmer-research/  kanmer-review/  kanmer-setup/
kanmer-tickets/  kanmer-verify/
run-kanmer/                                     <- survived

--- A. AFTER kanmer-research/assets ---
kanmer-research/assets/files-template.md        <- the rename's new name
kanmer-research/assets/open-questions-template.md
kanmer-research/assets/research-template.md
                                                <- impact-template.md gone

--- A. AFTER .kanmer-skills-version ---
0.1.0
skills:
kanmer-auto
kanmer-closeout
kanmer-docs
kanmer-execute
kanmer-groom
kanmer-plan
kanmer-report
kanmer-research
kanmer-review
kanmer-setup
kanmer-tickets
kanmer-verify

--- A. run-kanmer/SKILL.md ---
the operator's own skill                        <- byte-intact
```

**Both residues CORE-023 names are gone in one run**, and each by a different
mechanism: `kanmer-import` by the tombstone folder entry, `impact-template.md` by
the tombstone file entry *and* by `kanmer-research` being replaced wholesale
rather than merged. That second one is the case folder-level pruning alone would
have missed.

Note the "removed" line names both paths. That is the operator's requirement that
deletion inside a user-shared directory be **reported, not silent** — the same
`ConnectResult.output` string reaches Settings, where a re-connect also names
every folder it replaced, so a user who edited a skill in place learns it from
Kanmer rather than from losing it.

## Evidence B — a retirement *after* the roster exists, then disconnect

Two real bundles: a copy of the current 12, and the same with `kanmer-groom`
removed. A foreign `mycompany-review/` was added between the two installs.

```
--- B. after install #1 (kanmer-groom present) ---
.kanmer-skills-version  kanmer-auto/  kanmer-closeout/  kanmer-docs/
kanmer-execute/  kanmer-groom/  kanmer-plan/  kanmer-report/  kanmer-research/
kanmer-review/  kanmer-setup/  kanmer-tickets/  kanmer-verify/  mycompany-review/

--- B. install #2, kanmer-groom retired from the bundle ---
removed:  kanmer-groom
replaced: 11 folders

--- B. after install #2 ---
(kanmer-groom absent; the other 11 + mycompany-review/ present)

--- B. after disconnect ---
mycompany-review/
mycompany-review/note.txt: keep exactly
kanmer-groom still present? false
```

The roster carried the retirement without any tombstone involvement, which is
what makes the tombstone list closeable. Disconnect then left **only** the
foreign skill, with its bytes intact.

## Against the ticket's own verification list

- **Install a bundle with skill X, then one without it; X is gone.** ✅ Evidence
  B — `kanmer-groom` present after install #1, absent after install #2.
- **A user-authored skill in the same directory survives both operations.** ✅
  Evidence A (`run-kanmer`, bytes checked) and Evidence B
  (`mycompany-review/note.txt` = "keep exactly" after install *and* disconnect).
- **Disconnect removes a retired skill a previous version installed.** ✅
  `connect.test.ts` — "removes a roster-recorded skill the bundle has since
  retired": the roster records `kanmer-retired`, the bundle no longer has it,
  `removeBundledSkillsOnly` removes it anyway. This is the case the old
  `readdir(bundle)` implementation could not reach. Evidence B shows the same
  function leaving nothing but the foreign skill behind.
- **An install stamped by an older Kanmer (no roster) upgrades without deleting
  anything it cannot account for.** ✅ Evidence A ran against a bare `0.1.0`
  stamp, and `connect.test.ts` — "deletes nothing it cannot account for when the
  stamp predates the roster" — pins it: a `kanmer-unknown/` folder that is
  neither bundled nor tombstoned survives with its bytes.
- **Each marketplace host's prune behaviour recorded, or named as unchecked.**
  ⚠️ **Named as unchecked**, which the ticket explicitly allows. Read-only
  evidence: both hosts key the extracted plugin tree by version
  (`~/.claude/plugins/installed_plugins.json` → `installPath: …/cache/<marketplace>/<plugin>/<version>`;
  `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`, with
  `openai-bundled/chrome/26.715.71837` and `…/26.803.81509` coexisting), so a
  version change materialises a fresh directory and a retired skill cannot
  survive it. **That conclusion holds only while the version moves — and frozen
  at `0.1.0` it does not**, which puts marketplace hosts in the same trap until
  MCP-011 lands. The command that would settle it,
  `claude plugin install kanmer@kanmer` run twice across a retirement, was **not
  run**: Kanmer's marketplace is not registered on this machine
  (`known_marketplaces.json` lists only `claude-plugins-official`), registering
  it is a mutation, and it is blocked anyway by the manifest-path defect
  **MCP-009** / **MCP-011** own. Asserting more than was run is the failure
  ADR-0009 exists to prevent.

## A live pre-fix install, observed read-only

The main checkout carries an untracked `.agents/skills/` — a real Connect-made
install, 12 folders, stamped:

```
$ cat .agents/skills/.kanmer-skills-version
0.1.0
```

A bare version, no roster: the legacy shape. It was left untouched (it is not
this ticket's to modify), but it confirms the fallback branch is not
hypothetical — it is the branch that will run on this machine at the next
Connect, and Evidence A is that branch running against exactly that stamp.

## Governing docs

- **FRD-012 R2** — met unchanged; **R2a / R4 / AC5** — amended in this PR under
  the operator's explicit instruction to state the closed tombstone list "in the
  code and in the ADR/FRD prose". Prose and code agree, checked in that
  direction.
- **FRD-013 R1(a)** — met, unamended: the doc already said "reconcile"; only the
  code was additive.
- **ADR-0009** — met, unamended: "install-time copies" authorises wholesale
  replacement, and the stated roster-atomicity constraint is what the disconnect
  peer guard now honours.

## Follow-ups this proof does not cover

- **MCP-011** — until it bumps `plugin.json`, the "Update skills" button does not
  render and marketplace prune-by-version is not guaranteed.
- **GUI-079** — shares `connect.ts` and `providers.ts`; should rebase onto
  `9ac20af`.
- **`Settings.tsx:405-410`** still describes opencode/Antigravity as
  AGENTS-block-only. Stale, adjacent, deliberately not touched (GUI-079's
  surface).
