---
kind: proof-record
merged_sha: "7a2062026ca4be5a052f4ad120e9009cfc6bb713"
environment: "Windows 11 Pro 10.0.26200; disposable detached worktree C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\.worktrees\\verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713 (detached HEAD, clean tree, rev-parse HEAD == merged_sha); node v24.15.0, npm 11.14.1; verifier run identity claude-opus-verify-gui147-7a206202 (independent of the implementer and the reviewer)"
verified_at: "2026-09-02T08:48:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-02T07:54:00Z"
    command: "gh pr view 311 --json state,mergeCommit,url,mergedAt,headRefName,baseRefName"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED; mergeCommit.oid 7a2062026ca4be5a052f4ad120e9009cfc6bb713; mergedAt 2026-09-02T03:18:05Z; head GUI-147-claude-marketplace-stable into base main; url https://github.com/collisionengineers/kanmer/pull/311"
  - attempted_at: "2026-09-02T07:55:00Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713 7a2062026ca4be5a052f4ad120e9009cfc6bb713 && git -C <wt> rev-parse HEAD && git -C <wt> symbolic-ref --short -q HEAD && git -C <wt> status --short --branch"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "rev-parse HEAD = 7a2062026ca4be5a052f4ad120e9009cfc6bb713 (exact merge SHA); symbolic-ref exits 1 with empty output (detached); status '## HEAD (no branch)' with no dirty entries. The path is neither .worktrees/kanmer (board) nor .worktrees/gui-147 (implementation); both were left untouched, as was the stale short-named .worktrees/verify-gui-147-7a206202 left by an earlier dead worker."
  - attempted_at: "2026-09-02T07:58:28Z"
    command: "npm ci"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713"
    exit_code: 0
    result: PASS
    summary: "Fresh-worktree install from the committed lockfile; only npm audit advisories reported. Log: C:\\Users\\Alex\\AppData\\Local\\Temp\\gui147-verify-7a206202-npm-ci.log"
  - attempted_at: "2026-09-02T08:00:33Z"
    command: "npm run build"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713"
    exit_code: 0
    result: PASS
    summary: "core + mcp-server incl. standalone CJS bundle built. Log: gui147-verify-7a206202-build.log"
  - attempted_at: "2026-09-02T08:00:50Z"
    command: "npx vitest run src/main/connect.test.ts"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713/apps/gui"
    exit_code: 0
    result: PASS
    summary: "1 file, 53/53 tests passed, 0 failed, 0 skipped. The GUI-147 describe block 'Claude's marketplace is staged where the host can keep reading it (GUI-147)' contains exactly 14 `it(` cases (counted in the source at the merge SHA, connect.test.ts:1101+), all inside this green file; the untouched MCP-013 blocks above it are also green. Log: gui147-verify-7a206202-connect-test.log"
  - attempted_at: "2026-09-02T08:01:28Z"
    command: "npm run test -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713"
    exit_code: 0
    result: PASS
    summary: "54 files / 538 tests passed — exactly the count the post-implementation report claims. Log: gui147-verify-7a206202-gui-test.log"
  - attempted_at: "2026-09-02T08:06:41Z"
    command: "npm run build -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713"
    exit_code: 0
    result: PASS
    summary: "electron-vite build of main, preload and renderer. Log: gui147-verify-7a206202-gui-build.log"
  - attempted_at: "2026-09-02T08:06:57Z"
    command: "node --test scripts/renderer-core-imports.test.mjs"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713"
    exit_code: 0
    result: PASS
    summary: "6/6 pass, 0 fail — the GUI-146 guard the PIR and review both name. Log: gui147-verify-7a206202-renderer-imports.log"
  - attempted_at: "2026-09-02T08:07:06Z"
    command: "npm run verify (attempt 1, backgrounded through the harness)"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713"
    exit_code: 1
    result: INCONCLUSIVE
    summary: "Retained, not discarded. The rail reached the GUI vitest run and was cut off mid-file after src/main/projectRegistry.test.ts with no failing assertion, no vitest summary block and no npm error text — the harness terminated the detached child, so exit 1 is the truncation, not a result. No test in the captured 430 lines failed. Re-run as attempt 2 below with no code change. Log: gui147-verify-7a206202-verify.log"
  - attempted_at: "2026-09-02T08:21:04Z"
    command: "npm run verify (attempt 2, run via Start-Process so the harness could not cut it)"
    cwd: ".worktrees/verify-gui-147-7a2062026ca4be5a052f4ad120e9009cfc6bb713"
    exit_code: 0
    result: PASS
    summary: "Full authoritative rail green in 26m: build (core, mcp-server, GUI); check:manual; core 24 files / 826 tests; GUI 54 files / 538 tests; mcp-server http tests; test:scripts 167 pass / 0 fail; typecheck across all four workspaces; verify:docs; smoke; smoke:headless; mcpb:check; smoke:protocol; smoke:discovery; verify:skills; verify:agents-block 31/31; plugin:check 'plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.0, isolated MCP handshake lists 41 tools'. Note: plugin:check did not refuse in this linked worktree (AGENTS.md §6/§8 gotcha 8 warns it can), so the rail is complete rather than partial. Log: gui147-verify-7a206202-verify-attempt2.log"
  - attempted_at: "2026-09-02T08:47:00Z"
    command: "gh run list --commit 7a2062026ca4be5a052f4ad120e9009cfc6bb713 --json databaseId,name,status,conclusion,url + gh run view 33586517612"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Hosted rail at the exact merge SHA: 9 'Pull request verification' runs, all conclusion success. The authoritative one is the push-triggered run 33586517612 on main (headSha 7a20620…), whose 'verify' job ran 'Run the authoritative verification rail' to success in 6m45s (03:18:11Z-03:25:00Z); 'regate' success; 'kanmer-gate' skipped as designed for a push event. Eight later workflow_dispatch runs at the same SHA are also success."
  - attempted_at: "2026-09-02T08:47:00Z"
    command: "manual: /reload-plugins on a real machine loads the plugin after a live GUI Connect (ticket body Verification bullet 3)"
    cwd: "n/a"
    exit_code: null
    result: INCONCLUSIVE
    summary: "Not run; no green result claimed. Establishing it requires a live Connect from a build that contains this commit, and no such build exists — the installed app is v0.4.0, which carries the defect. Running it from source would mutate the operator's real ~/.claude and %LOCALAPPDATA%\\Kanmer\\claude-marketplace, which the plan's 'Do not modify' list forbids for this lane. What would make it conclusive: the 0.4.1 release installed on a real Windows host, Connect pressed, then /reload-plugins. Owed at release/promotion acceptance."
  - attempted_at: "2026-09-02T08:47:00Z"
    command: "manual: upgrade the app from N to N+1, press Connect, expect `claude plugin list` to report N+1 (ticket body Verification bullet 4)"
    cwd: "n/a"
    exit_code: null
    result: INCONCLUSIVE
    summary: "Not run; no green result claimed. Structurally unavailable at this merge SHA: no N+1 build exists yet, so the upgrade cycle this bullet describes cannot be performed by any verifier at this commit. What would make it conclusive: install v0.4.0, upgrade to the release carrying this commit, press Connect, and read `claude plugin list`. Owed at release/promotion acceptance."
---

# Proof — GUI-147 at merged SHA `7a206202`

Verified at the PR's exact GitHub `mergeCommit`, in a disposable detached
worktree named from that full SHA. The mutable `main` checkout, the board
worktree `.worktrees/kanmer`, the implementation worktree `.worktrees/gui-147`
and its branch were not read-modified, switched, merged, pulled or removed.

The merge is a squash commit with the single parent `ef001344` (MCP-055, #310),
so `git diff HEAD^1 HEAD` is exactly this PR: **6 files, 912 insertions, 48
deletions** — `apps/gui/src/main/connect.ts`, `apps/gui/src/main/providers.ts`,
`apps/gui/src/main/connect.test.ts`,
`apps/gui/src/renderer/src/components/Settings.tsx`, `AGENTS.md`,
`docs/functional/frd/FRD-012-connect.md`. That set is exactly the plan's
"Expected files" table with nothing extra, and nothing on the plan's "Do not
modify" list was touched.

## Plan acceptance criteria

- **Step 1 — stable staging root exists and is exported.** `claudeMarketplaceStableRoot()`
  is exported from `connect.ts:221`, resolves `process.env.LOCALAPPDATA` with a
  `homedir()` fallback, and Electron's absent `localAppData` `getPath` key is
  recorded as the reason. Proved by `resolves one installer-owned staging root from
  LOCALAPPDATA, the same one every time`.
- **Step 2 — no `mkdtemp`/`tmpdir` staging for Claude.** `stageClaudeMarketplaceRoot`
  now stages into the stable root (`connect.ts:253`); the only surviving
  `mkdtemp(join(tmpdir(), …))` in the file is the untouched native-plugin path at
  `connect.ts:1125` (Grok/Antigravity), which the plan's "Do not modify" list
  protects. Proved by `stages into that root, leaves it in place after Connect, and
  refreshes it on the next one`.
- **Step 3 — the `finally { rm(stagedRoot, …) }` cleanup is gone.** Confirmed by
  reading the PR diff's deleted lines: `- } finally {` / `- if (stagedRoot) await
  rm(stagedRoot, { recursive: true, force: true });` are removed from
  `installSkills`, and the failure path no longer deletes the staged tree. Proved
  by `keeps the staged root when a marketplace command fails`.
- **Step 4 — add-vs-update and install-vs-reinstall decided from the host's JSON,
  then the install is proved.** `claudeMarketplaceHostState()` (`connect.ts:288`)
  reads `known_marketplaces.json`/`installed_plugins.json`;
  `verifyInstalledMarketplaceVersion()` (`connect.ts:693`) is called from
  `installSkills` and returns the existing `{ command, output }` failure shape, so
  Connect answers `ok:false` rather than a note on a green result. Proved by
  `reads add-vs-update and install-vs-reinstall from the host's own state files`,
  `treats missing host state files as nothing recorded rather than an error`,
  `turns each recorded state into the Claude verbs that actually change it`,
  `reads the installed version back out of the host's own report`, `fails Connect
  with a pasteable repair when the host reports a version that is not the bundled
  one`, `fails Connect when the host reports no Kanmer plugin at all after the
  install`, `fails Connect when the version cannot be read at all, rather than
  reporting success`, and `reports success when the host confirms the bundled
  version`. The plan's explicit anti-weakening clause holds: the mismatch test
  asserts `result.command` equals the exact repair string, not `ok !== true`.
- **Step 5 — the installed version reaches the staleness read.** `skillsStatus()`
  populates `installedVersion`/`updateAvailable` from `readMarketplaceInstalledVersion()`
  (`connect.ts:738`, soft-failing to `null`), with no new IPC channel and no new
  `SkillsStatus` field; `Settings.tsx` changes one title string expression to be
  scope-aware. Proved by `surfaces the host's installed plugin version in the
  skills staleness read`.
- **Step 6 — disconnect reverses the durable state, in order, without deleting the
  directory.** `disconnectAgent` runs the marketplace host's declared
  `hostRemoveCommands()` (`connect.ts:1557`). Proved by `removes the host's own
  marketplace and plugin on disconnect, and keeps the staged directory` and
  `leaves a marketplace host that declares no host removals untouched on
  disconnect`. `AGENTS.md` §8 gotcha 24 and the two `**Amended (GUI-147):**`
  clauses in FRD-012 R2/R4 are present in the merged tree.
- **Production callers.** Confirmed in the merged tree, not taken on trust:
  `installSkills` is called from `connectAgent` (`connect.ts:903`) and
  `updateSkills` (`connect.ts:1388`); `skillsStatus` and `disconnectAgent` are
  bound to IPC in `apps/gui/src/main/index.ts:1328` and `:1298`, and
  `connectAgent` at `index.ts:1036`. No dead code, no new route.
- **No weakened assertions.** The PR's only deleted line in `connect.test.ts` is
  an `import` statement that was widened; every other change is an addition.
- **codex containment.** `providers.ts`'s codex spec takes no `state`, declares no
  `installedVersion` and no `hostRemoveCommands`; the only codex-adjacent change
  in the diff is a comment.

## Ticket-body verification bullets

1. *temp-dir no longer used* — PASS (Step 2 above).
2. *version mismatch after install is reported as a failure* — PASS (Step 4 above).
3. */reload-plugins on a real machine loads the plugin after Connect* — INCONCLUSIVE, not run.
4. *N → N+1 app upgrade yields `claude plugin list` = N+1* — INCONCLUSIVE, not run.

## Outcome

**PASS** for everything verification at a merge SHA can own: the deterministic
rail is green locally in the exact-SHA detached worktree (`npm run verify` exit
0, including `plugin:check`) and green on the hosted rail at the same SHA (nine
GitHub Actions runs, all success, the authoritative one being the push-triggered
`verify` job 100111695372). Every acceptance criterion in the plan is met by a
named, passing test, the shipped diff is exactly the plan's expected file set,
and every changed function has a real production caller.

Two of the ticket body's four verification bullets are recorded above as
**INCONCLUSIVE with `exit_code: null`** and are *not* claimed as passing. They
are host-integration checks whose enabling condition is downstream of this
ticket: both require a build that contains this commit to be installed on a real
Windows machine, and no such build exists — the installed app is v0.4.0, which
carries the defect. They remain owed at 0.4.1 release/promotion acceptance and
must not be treated as discharged by this record.

The first `npm run verify` attempt is retained as INCONCLUSIVE, not erased and
not relabelled: it exited 1 because the harness truncated the detached child
mid-run, with no failing assertion anywhere in its output, and the identical
command at the identical SHA with no code change then exited 0.

Two review dispositions carried into this record, neither of which this proof
discharges: **F-001** (a per-project Disconnect now performs user-scoped Claude
removals with no user-scope confirmation) is a genuine major deferred to
**GUI-148** and should be taken before the release that ships this; F-002-F-006
are dispositioned accepted risk. One cosmetic doc inconsistency observed and not
raised as a failure: FRD-012's R2 trailing bullet still reads "a marketplace host
reports no installed version, so the update offer does not apply to Claude Code
or codex", which the GUI-147 amendment above it explicitly retires for Claude
Code.

Verified by `claude-opus-verify-gui147-7a206202`, an independent verifier that
did not implement or review this work.
