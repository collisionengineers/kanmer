Draft `## 0.4.0` section for `apps/gui/release-notes.md` (sonnet drafter, 2026-09-01; controller to edit before commit; CORE-127 placeholder to resolve at step 3):

## 0.4.0

### Every project now carries a stable, verifiable identity

Kanmer persists a logical project and board identity in `.kanmer/project.json`, allocated once on the first write a project receives and left untouched after that. An older v0.3.12 server reads straight past the file and keeps working, so rolling back to a prior release is just deleting `project.json` — nothing else changes. Every MCP result now names the logical project it came from, and a caller can pin `expected_project` to be refused cleanly rather than writing into the wrong board. Ticket writes that matter — proofs, plans, review records — now carry a document-inclusive revision, so a stale write is rejected instead of silently overwriting newer work.

### Workspace leases replace permanent claims, and batches can share one

Taking a ticket now grants a renewable lease instead of a permanent claim: it has an identity, a revision, and a heartbeat, and it expires on its own schedule rather than staying claimed forever. Only one live writer may hold a workspace at a time (`WORKSPACE_OCCUPIED`), a renewal must name the lease it is extending (`LEASE_EXPIRED`, `REVISION_CONFLICT`), and reclaiming an abandoned lease preserves whatever dirty work was left behind rather than discarding it. On top of that, a deliberate batch lets several related tickets share one worktree and branch once their membership is declared and frozen together, while still refusing to release the workspace until every member of the batch is finished.

### Delivery targets are configurable, and delivery is tracked separately from stage

A project that develops on one branch and releases from another can now say so. Kanmer resolves the real base branch, PR target and verification target from that policy instead of assuming `main` everywhere, and the merge gate flags a pull request aimed at the wrong target. A ticket still reaches Done purely on its own evidence; whether and when it actually shipped is recorded afterwards as separate delivery state, and a hotfix's owed backport to the main line is tracked until a real commit clears it.

### Releases are serialized behind their own leases

A release channel now has exactly one active holder at a time, and every release attempt gets an immutable identity derived from the channel, the code it integrates, and its position in the sequence — so a superseded or retried attempt can never be mistaken for a later one. This lives alongside the workspace lease mechanism but in its own record, keeping release evidence informative without ever gating a ticket's path to Done.

### Quick capture lets an idea land without committing to a plan

A capture is the lightest possible ticket: a title and an observation, nothing else owed, and it never becomes a stalled or expired claim because it cannot be taken at all until someone deliberately promotes it. Promotion is a recorded decision, not a silent transition, and only from that point on does the ticket pick up the gates and expectations of whatever profile it becomes.

### Approved plans compile into bounded, executable step packets

An approved plan can now be validated and compiled into a versioned step packet naming the exact files and symbols a step may touch, what must stay unchanged, the tests and commands that prove it, and the condition that ends the step. A worker executes one step at a time against that packet rather than the whole plan at once, keeping each unit of work small and checkable.

<!-- CORE-127: constrained step reconciliation — add if merged -->

### `/goal` runs a whole scope through to Done with a bounded review budget

A durable `/goal` run now covers a single ticket, a group, an area, an explicit list, or the whole prepared board, with the roster frozen for the life of the run so later captures and additions never join in flight. Each review round draws down a bounded remediation budget, and a ticket that exhausts it stays blocked rather than looping through automatic replans forever (`REMEDIATION_BUDGET_EXHAUSTED`). Review scope narrows to only what changed since the last round, and verification re-confirms a pass against the exact merged code rather than trusting an earlier result.

### Stuck tickets can be inspected and, now, actually fixed

`reconcile_ticket` reports what is really true about a ticket stuck in Review or Verifying — board state, claim state, proof, and the pull request itself — without touching anything. `apply_reconciliation` is the new companion that can act on that same fresh evidence: routing a verified failure back to the right stage, recovering a workspace whose claim expired, or moving a ticket forward, all bound to the ticket's current revision so a decision made against stale evidence is refused.

### Multiple projects show up in one place

A named endpoint registry at `~/.kanmer/endpoints.json` lets a single MCP client see every project it knows about — identity, location, health, sync state, and who is actively working where — without ever mixing writes across projects. The GUI's new Settings tab gives that same registry a face: add, open, or check the health of any registered project from one screen.

### The merge gate can be made strict, and board sync is confirmed rather than assumed

Checks that were previously advisory — an unreviewed merge, a stale review, an out-of-sync board — can now be turned into hard failures with `KANMER_GATE_STRICT`. A pull request whose recorded board state has diverged from the real board tip is caught as `SYNC_REQUIRED`, and a review that no longer matches the current commit is caught as `STALE_REVIEW`, both before a merge rather than after.

### Windows verification is reliable again

A cluster of intermittent Windows test failures — teardown races on locked files, timeouts sized for a quiet machine rather than a loaded one, and a lock held far shorter than the work it protected — is fixed at the root cause rather than retried around. `npm run verify` on Windows no longer needs a retained failing attempt explained away.

**Upgrading from 0.3.x:** boards written by this release stay fully readable by a v0.3.12 server; `project.json` and every lease field are additive and ignored by older code, so there is no board migration prompt to expect. After updating, re-run `kanmer-setup` to refresh AGENTS.md and your installed skills.

## Prepare attempt 1 — 2026-09-01T20:25Z — refused (dirty tree)

`npm run release -- 0.4.0 --ticket CORE-136` in the fresh clone refused: "the working tree is not clean" — the controller's own `release-prepare.log`/`.pid` files were untracked inside the clone. Removed; log relocated to `C:\Users\Alex\Documents\KanmerBackups\release-prepare-0.4.0.log`.

## Prepare attempt 2 — 2026-09-01T20:26Z–20:38Z — FAILED at step 6 (GUI build)

Clone `C:\Users\Alex\Documents\GitHub\kanmer-release-0.4.0`, `main` a744fd76 + local notes commit 0e37dd3e. Verify rail: all steps exit 0 (core 826, GUI 524, server 236/1 skip, scripts 161, docs, smokes, mcpb, protocol, discovery, skills, agents-block, plugin:check 41 tools). Bump to 0.4.0 on `release/v0.4.0`, `npm install --package-lock-only`, `npm run build`, `build-plugin`, `build-mcpb` (kanmer-0.4.0.mcpb, 41 tools), `plugin:check` OK at v0.4.0. Then `npm run build -w @kanmer/gui` exit 1:

```
error during build:
../../packages/core/dist/index.js (675:9): "createHash" is not exported by "__vite-browser-external", imported by "../../packages/core/dist/index.js".
```

No branch pushed, no PR, no tag. Clone reset: `git checkout -- . && git switch main && git branch -D release/v0.4.0` (notes commit retained). Root cause and fix filed as [[GUI-146]] (release blocker, HZN-008). Prepare attempt 3 follows GUI-146's merge; the clone will be fast-forwarded first and the notes commit re-applied on top.

## Promotion step 1 — board backup (2026-09-01T22:32:47Z)

- Archive: `C:\Users\Alex\Documents\KanmerBackups\kanmer-board-20260901T223247Z.zip` (6,155,447 bytes)
- SHA-256: `90fbb8438ef0ea6aad2226837de1b38b9f4dbea597e017bf75c6e14be2ef6539`
- Board commit at backup: `41f795f9100d27b39f34262417362d626ade7a2b` (= `origin/kanmer-board`; worktree clean)
- Retained rollback installer: `C:\Users\Alex\Documents\KanmerBackups\installers\Kanmer-Setup-0.3.12.exe` (sha256 prefix `82b6fcd73f299aa2`, downloaded from the v0.3.12 GitHub release with its `latest.yml`)

## Release commit

PR #309 squash-merged as `7e114cd117ef720c20797e2bf9f5cf58643a94e6` (contains CORE-127 `a744fd76`, GUI-146 `3a98bf7c`, notes, 0.4.0 manifests). Publish phase: `npm run release -- 0.4.0 --publish --release-commit 7e114cd1…` from the clone's `main` at 7e114cd1 with `GH_TOKEN` from the operator's `gh auth token`; log `C:\Users\Alex\Documents\KanmerBackups\release-publish-0.4.0.log`.

## Publish (2026-09-01T22:33–22:53Z) — PASS

`npm run release -- 0.4.0 --publish --release-commit 7e114cd117ef720c20797e2bf9f5cf58643a94e6` from the clone's `main` at 7e114cd1, exit 0 (`release-publish-0.4.0.log`): verify rail green (incl. GUI build); GUI built; `git tag v0.4.0` (→ 7e114cd1) pushed; one `--publish never` package (`Kanmer-Setup-0.4.0.exe`, blockmap, `latest.yml`, `kanmer-0.4.0.mcpb`); draft release created, 4 assets uploaded and verified byte-identical, then published: https://github.com/collisionengineers/kanmer/releases/tag/v0.4.0 (non-draft, non-prerelease, published 2026-09-01).

## Promotion step 8 — independent release verification

- `node scripts/verify-release-assets.mjs 0.4.0 --remote-coherent` → exit 0: "PASS: v0.4.0 is complete and its public manifest matches the published installer bytes".
- `node scripts/check-updater-package.mjs --out apps/gui/release` → exit 0: "updater package OK (8 checks)".
- Tag workflow `release.yml` run 33567978927 (push v0.4.0): in progress at time of writing; result recorded below when it completes.

## Promotion step 9a/9b — packaged boot and copied-board smoke (2026-09-01T22:56Z)

- Board copy: backup zip expanded to `%TEMP%\kanmer-board-copy-0.4.0` (`.kanmer/data/board.yml` present, areas `_none core docs gui mcp-server skills`).
- Packaged boot: `apps/gui/release/win-unpacked/Kanmer.exe --user-data-dir=<fresh>` with `KANMER_SMOKE=1 KANMER_OPEN=<copy>` → exit 0, renderer PNG 118,602 bytes captured at `%TEMP%\kanmer-smoke-0.4.0-renderer.png`.
- Standalone bundle at 7e114cd1 carries `SERVER_VERSION "0.4.0"`; `KANMER_ROOT=<copy> npm run smoke:headless` → exit 0 (explicit board root reported; headless write/read; host files untouched).
