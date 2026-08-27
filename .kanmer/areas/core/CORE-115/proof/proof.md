---
kind: proof-record
merged_sha: "3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
environment: "detached worktree .worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc (HEAD 3dd48d37…, symbolic-ref empty, status clean) on Windows 11 Pro 10.0.26200, Node v24.15.0, npm ci; manual acceptance on mkdtemp copies only (%TEMP%\\vc115-board-a4kCdI, a throwaway git repo carrying a copy of .worktrees/kanmer/.kanmer); hosted GitHub Actions run 33113533888; log %TEMP%\\verify-core-115.log"
verified_at: "2026-08-27T20:44:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T20:30:10Z"
    command: "gh pr view 293 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc, url https://github.com/collisionengineers/kanmer/pull/293"
  - attempted_at: "2026-08-27T20:30:20Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc; rev-parse HEAD; symbolic-ref --short -q HEAD; status --short --branch"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "rev-parse = 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc; symbolic-ref empty (detached); status '## HEAD (no branch)' clean; path is neither .worktrees/kanmer nor .worktrees/core-115"
  - attempted_at: "2026-08-27T20:30:27Z"
    command: "npm ci && npm run build"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "npm ci exit 0; build exit 0 (standalone kanmer-mcp.cjs 1.62 MB, remote-cli, doctor-cli built)"
  - attempted_at: "2026-08-27T20:31:13Z"
    command: "npm test -w @kanmer/core"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "19 files, 411/411 passed in 72.02 s; no flakiness, no 5 s timeouts observed (0 matches). Lease tests present: 'renewable leases (CORE-115) > serialises the lease writes across store instances: concurrent renewals from one revision yield exactly one success' 445 ms; 'serializes concurrent board mutations without losing either edit' 773 ms"
  - attempted_at: "2026-08-27T20:32:27Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "299/299 checks passed"
  - attempted_at: "2026-08-27T20:32:58Z"
    command: "npm run smoke:protocol"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed"
  - attempted_at: "2026-08-27T20:33:07Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "tests 124, pass 124, fail 0 (no spawn ETIMEDOUT this run)"
  - attempted_at: "2026-08-27T20:33:35Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK — 39 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.12, isolated MCP handshake lists 39 tools"
  - attempted_at: "2026-08-27T20:33:40Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "clean"
  - attempted_at: "2026-08-27T20:34:17Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 0
    result: PASS
    summary: "ALL CHECKS PASSED, incl. 'kanmer-execute re-enters on the existing PR and renews its claim', 'kanmer-auto transfers expired claims, never forces'"
  - attempted_at: "2026-08-27T20:34:27Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc"
    exit_code: 1
    result: FAIL
    summary: "Everything green except the root npm test node suite: tests 121, pass 119, fail 2 — 'the quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces' and 'the shipped installer shim restores the provider cwd before MCP launch', both EBUSY rmdir '...\\Kanmer Test Space\\Kanmer\\bin' after ~5 s. Both live in scripts/antigravity-plugin-config.test.mjs, which is NOT in `git diff --stat e903289e..3dd48d37` (17 files: core store/types/frontmatter/claims.test, mcp-server index/errors/execution-packet/reconciliation(+test)/smoke, plugin bundle, three skills, AGENTS.md, manual). Known Windows host quirk (antigravity EBUSY); recorded, not chased. kanmerGit orphan-cleanup tests passed (3.6–7.8 s each)."
  - attempted_at: "2026-08-27T20:43:40Z"
    command: "gh run list --commit 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc; gh run view 33113533888"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Hosted 'Pull request verification' run 33113533888 at headSha 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc: completed/success — jobs verify success, regate success, kanmer-gate skipped (push-to-main). This is the clean-environment execution of the same `npm run verify` suite that failed locally on the EBUSY quirk. PR-head run 33112834467 at 08586176: verify success, kanmer-gate success (after re-run), regate skipped."
  - attempted_at: "2026-08-27T20:38:02Z"
    command: "manual (a) FRD-030 AC1 — node %TEMP%\\vc115-accept.mjs: two KanmerStore instances (client-A, client-B) on a throwaway board copy, built core dist"
    cwd: "%TEMP%\\vc115-board-a4kCdI"
    exit_code: 0
    result: PASS
    summary: "A takeTicket CORE-112 {branch wa, worktree .worktrees/w} -> lease bda77e5b… rev 1, lease_workspace worktree:…\\.worktrees\\w. B takeTicket CORE-116 into same worktree -> 'WORKSPACE_OCCUPIED: \"CORE-116\" cannot take worktree .worktrees/w; it is recorded on \"CORE-112\" (held by ctl-A, lease bda77e5b…)'. B take CORE-116 on same branch wa with force:true -> WORKSPACE_OCCUPIED (force does not bypass). B renew CORE-112 without lease -> 'CLAIM_NOT_OWNED: held by client-A (controller ctl-A)'. B renew with foreign lease id -> LEASE_EXPIRED. B transfer live lease -> 'CLAIM_LIVE: … transferred only with a reason beginning \"operator:\"'. B take CORE-112 -> 'LEASE_LIVE: … A live lease is never taken over'. Zero writes: CORE-112.md sha256 baf71814… identical before/after all refusals; CORE-116 remained untaken. Note: the live-transfer refusal code is CLAIM_LIVE (not LEASE_LIVE); LEASE_LIVE is the take-refusal code."
  - attempted_at: "2026-08-27T20:38:06Z"
    command: "manual (b) FRD-030 AC2 — renew with stale/wrong/correct credentials"
    cwd: "%TEMP%\\vc115-board-a4kCdI"
    exit_code: 0
    result: PASS
    summary: "renew leaseRevision 99 -> 'Conflict: \"CORE-112\" lease revision changed since you read it (lease revision is now 1, you expected 99)' (REVISION_CONFLICT wording); renew with random lease id -> LEASE_EXPIRED; file hash still baf71814… (nothing written on refusal); renew with correct id + rev 1 -> rev 2, claim_expires_at +30 min, heartbeat updated, lease_id unchanged."
  - attempted_at: "2026-08-27T20:38:09Z"
    command: "manual (c) FRD-030 AC3 dead-lease recovery — standalone server node packages/mcp-server/dist/standalone/kanmer-mcp.cjs --root <copy>, take_ticket action transfer over stdio"
    cwd: "%TEMP%\\vc115-board-a4kCdI"
    exit_code: 0
    result: PASS
    summary: "(1) Aged CORE-112 on disk (claim_expires_at/heartbeat 2020-01-01); real `git worktree add -b wa .worktrees/w` with dirty README.md (M) and untracked dirty.txt; client-B transfer -> success: assignee client-B, claim_controller ctl-B, lease bda77e5b… -> 4ade6bbd… rev 4, lease_reclaimed_from ctl-A, branch/worktree/taken_at preserved. dirty.txt sha256 identical, `git status --porcelain` still 'M README.md / ?? dirty.txt'. activity.jsonl: take controller ctl-A->ctl-B, take lease_id old->new, update assignee, doc scratch/execution append. scratch/execution.md: '- claim-transfer ctl-A → ctl-B (expired; lease bda77e5b… → 4ade6bbd… rev 4; branch wa; worktree .worktrees/w; expires …; evidence: workspace dirty (matches-claim), pr absent, commits 0, proof absent)'. A renewing with the old lease id afterwards -> LEASE_EXPIRED. (2) Missing worktree: CORE-117 taken with worktree .worktrees/gone (never created), aged; transfer -> succeeds as an evidence-recorded transfer (not refused): lease 1a307bdb… -> 1fc46f33… rev 2, reclaimed_from ctl-A, transition '… evidence: workspace missing (unavailable), pr absent, commits 0, proof absent'; worktree/branch preserved, nothing created or deleted. (3) Branch mismatch: CORE-119 recorded worktree .worktrees/mm/branch wmm while the worktree is checked out on 'other'; transfer -> 'Error: RECOVERY_REFUSED: \"CORE-119\" records worktree .worktrees/mm but it is not checked out on the recorded branch wmm; an operator must restore the branch…'; ticket unchanged (still client-A, rev 1). (4) Board worktree: take with worktree = board root refused at take ('is the Kanmer board workspace'); CORE-116 patched to worktree '.' and aged; transfer -> 'Error: RECOVERY_REFUSED: \"CORE-116\" records the Kanmer board worktree as its workspace; it is never reclaimed or reused as an execution target.'; ticket unchanged."
  - attempted_at: "2026-08-27T20:38:20Z"
    command: "manual (d) legacy claim lazy migration — CORE-118 patched to taken_at+assignee+branch only, no lease_* / claim_*"
    cwd: "%TEMP%\\vc115-board-a4kCdI"
    exit_code: 0
    result: PASS
    summary: "First renew (actor only) minted lease_id ec697fc8…, lease_revision 1, claim_expires_at, claim_controller client-A, lease_workspace branch:legacy-br, lease_phase implementing, heartbeat; activity has exactly one 'take lease_id null -> ec697fc8…' and one scratch transition 'lease-migrate legacy claim → lease ec697fc8… rev 1 by client-A'. Second renew with id + rev 1 -> rev 2, same lease_id, no second lease-migrate line. B renew without lease afterwards -> CLAIM_NOT_OWNED."
  - attempted_at: "2026-08-27T20:38:06Z"
    command: "manual (e) running-command extension clamp — renew phase running-command extendMinutes 100000 (board has no leaseCommandMaxMinutes; leaseConfig = {expiry 30, heartbeat 5, commandMax 120})"
    cwd: "%TEMP%\\vc115-board-a4kCdI"
    exit_code: 0
    result: PASS
    summary: "claim_expires_at - lease_heartbeat_at = 120 minutes exactly (22:38:06 vs 20:38:06), lease_phase running-command, rev 3. extendMinutes in phase implementing -> LEASE_EXTENSION_NEEDS_RUNNING_COMMAND."
  - attempted_at: "2026-08-27T20:43:31Z"
    command: "manual (f) installed v0.3.12 server — node %LOCALAPPDATA%\\Programs\\Kanmer\\resources\\mcp\\kanmer-mcp.cjs (sha256 639df4cf…, serverInfo version 0.3.12) with KANMER_ROOT=<copy>: get_item, update_item title, get_status"
    cwd: "%TEMP%\\vc115-board-a4kCdI"
    exit_code: 0
    result: PASS
    summary: "get_item returned CORE-112 with all lease_* / claim_* fields intact; update_item rewrote the file (title 'renamed by installed v0.3.12', updated bumped) and the full lease block (lease_id 4ade6bbd…, rev 4, lease_controller_run, lease_workspace, lease_phase, lease_heartbeat_at, lease_reclaimed_from, claim_expires_at, claim_controller) compared JSON-identical before/after. Note: the installed launcher .cmd could not be spawned from the harness without a shell (quoting), so the installed bundle was run directly under node — same bytes the launcher executes."
---

# CORE-115 verification — PR #293 at 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc

Result: **PASS**.

- Merge confirmed via `gh pr view 293`: MERGED, mergeCommit 3dd48d37f5492943e0bf63e7f6e83c9d123d60bc.
- Detached verification worktree `.worktrees/verify-core-115-3dd48d37f5492943e0bf63e7f6e83c9d123d60bc` at the exact SHA, clean; board worktree, `.worktrees/core-115` and `.worktrees/gui-144` untouched.
- Deterministic checks: build, core 411/411 (lease + cross-store concurrency tests included, no flakiness), smoke 299/299, protocol 50/50, http 124/124, plugin:check 39 tools, typecheck, verify:skills all exit 0.
- `npm run verify` exit 1 locally solely on the two known antigravity EBUSY tests in `scripts/antigravity-plugin-config.test.mjs` (untouched by this merge; see `git diff --stat e903289e..3dd48d37`). The hosted push-to-main run 33113533888 at this exact SHA ran the same suite and is success (verify + regate).
- FRD-030 acceptance (a)–(f) exercised manually on throwaway copies only with exact outputs recorded above. Contract notes for the record: transferring a live lease refuses with `CLAIM_LIVE` (take of a taken ticket is `LEASE_LIVE`); a missing worktree is not a refusal but an evidence-recorded transfer (`workspace missing (unavailable)` in scratch Transitions); branch-mismatch and board-worktree workspaces refuse with `RECOVERY_REFUSED` and write nothing.
