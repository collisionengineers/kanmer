---
kind: proof-record
merged_sha: "9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
environment: "Detached verification worktree .worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce (Windows 11, node v24.15.0, npm ci clean); manual FRD-030 acceptance against throwaway mkdtemp boards via the worktree's built dist server and the installed v0.3.12 plugin server"
verified_at: "2026-08-27T22:20:00Z"
result: PASS
attempts:
  - attempted_at: "2026-08-27T21:52:00Z"
    command: "gh pr view 295 --json state,mergeCommit,url"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 9c9a6980e34aeaa43a691526d2715fe8fb97d6ce, url https://github.com/collisionengineers/kanmer/pull/295"
  - attempted_at: "2026-08-27T21:53:00Z"
    command: "git worktree add --detach .worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce 9c9a6980e34aeaa43a691526d2715fe8fb97d6ce; rev-parse/symbolic-ref/status assertions; npm ci"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "HEAD 9c9a6980e34aeaa43a691526d2715fe8fb97d6ce, detached (symbolic-ref empty), status clean '## HEAD (no branch)', npm ci exit 0"
  - attempted_at: "2026-08-27T21:56:09Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "Build completed clean"
  - attempted_at: "2026-08-27T21:56:21Z"
    command: "npm test -w @kanmer/core"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "19 files, 417/417 tests passed, incl. new CORE-124 batch claims tests"
  - attempted_at: "2026-08-27T21:57:19Z"
    command: "node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "306/306 checks passed, incl. the CORE-124 FRD-030 batch block (declare+freeze, shared workspace, BATCH_WORKSPACE_MISMATCH, BATCH_FROZEN, WORKSPACE_OCCUPIED even with force, packet claim.batch, BATCH_ACTIVE release refusal)"
  - attempted_at: "2026-08-27T21:57:47Z"
    command: "npm run smoke:protocol"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "50/50 checks passed"
  - attempted_at: "2026-08-27T21:57:52Z"
    command: "npm run test:http -w @kanmer/mcp-server"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "HTTP transport tests passed (token files, provider startup fallback)"
  - attempted_at: "2026-08-27T21:58:16Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "Plugin check passed (39 tools)"
  - attempted_at: "2026-08-27T21:58:18Z"
    command: "npm run typecheck"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "Typecheck clean"
  - attempted_at: "2026-08-27T21:58:45Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 0
    result: PASS
    summary: "Skills verified, incl. batch-lane contract checks (board-worktree rule 6/6, one-boundary rule 7/7)"
  - attempted_at: "2026-08-27T21:59:00Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 1
    result: FAIL
    summary: "Failed only in scripts/test-scripts.mjs: 2/121 antigravity launcher tests ('quote-free launcher still reaches the shim when LOCALAPPDATA contains spaces', 'shipped installer shim restores the provider cwd before MCP launch') with EBUSY rmdir on 'Kanmer Test Space\\Kanmer\\bin' — the documented antigravity EBUSY host quirk. Everything else green: core 417/417, mcp-server 493/493, gui suites, smoke 306/306, protocol 50/50. `git diff --stat 3dd48d37..9c9a6980 -- scripts tools` is empty: the merge touches nothing in that area, so the failure is host-environmental and pre-existing, not caused by CORE-124."
  - attempted_at: "2026-08-27T22:12:00Z"
    command: "npm run test:scripts (retry of the failing sub-step)"
    cwd: ".worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce"
    exit_code: 1
    result: FAIL
    summary: "Same 2/121 antigravity EBUSY failures persist on this host (119 pass). Recorded per known-host-quirk policy; compensating hosted evidence below runs the same verify green at the exact merge SHA."
  - attempted_at: "2026-08-27T22:13:00Z"
    command: "gh run list --commit 9c9a6980e34aeaa43a691526d2715fe8fb97d6ce; gh run view 33116759466"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Hosted 'Pull request verification' run 33117549223 at merge SHA 9c9a6980 completed success; PR-head run 33116759466 at 14cf7083 (verify + kanmer-gate) completed success after re-run."
  - attempted_at: "2026-08-27T22:01:00Z"
    command: "manual FRD-030 AC4 (a): three tickets taken as batch B1 via built dist server on mkdtemp board"
    cwd: "$TEMP/kanmer-c124-vxBeG8 (throwaway board; server from verify worktree dist)"
    exit_code: 0
    result: PASS
    summary: "First take with batch:B1 + batch_members [TICK-001..003] declared and froze the batch (lease_batch B1, lease_batch_frozen_at = taken_at on all members; siblings untaken). TICK-002 and TICK-003 took the SAME worktree/branch with batch:B1 and got their own leases on the shared workspace, all lease_batch B1. One review attestation (kind: review-attestation, one PR/head 1111…1111) written per member referencing the shared head, plus three separate proof records; get_ticket_doc confirmed each member keeps its own docs (proofOwn/reviewOwn true for each)."
  - attempted_at: "2026-08-27T22:01:30Z"
    command: "manual FRD-030 AC5 (b): unrelated TICK-004 take_ticket into batch workspace"
    cwd: "$TEMP/kanmer-c124-vxBeG8"
    exit_code: 0
    result: PASS
    summary: "Plain take -> WORKSPACE_OCCUPIED naming 'batch B1 — only its frozen members may take it' (also refused with force:true); with batch:B1 + batch_members incl. TICK-004 -> BATCH_FROZEN (membership frozen, cannot be changed); with batch:B1 alone -> BATCH_INVALID (not a member). SHA-256 tree snapshot of .kanmer before/after all four refusals byte-identical (true)."
  - attempted_at: "2026-08-27T22:01:15Z"
    command: "manual (c): member TICK-003 taking a different workspace (.worktrees/elsewhere) with batch:B1"
    cwd: "$TEMP/kanmer-c124-vxBeG8"
    exit_code: 0
    result: PASS
    summary: "Refused BATCH_WORKSPACE_MISMATCH (LEASE_CONFLICT): 'member of batch B1, whose workspace is worktree .worktrees/batch on branch batch-branch … a batch owns one workspace'."
  - attempted_at: "2026-08-27T22:02:00Z"
    command: "manual (d): release ordering"
    cwd: "$TEMP/kanmer-c124-vxBeG8"
    exit_code: 0
    result: PASS
    summary: "Release of TICK-001 while TICK-002/003 still implementing -> BATCH_ACTIVE naming both pending members; after moving all three review->verifying->done (proofs written) each release succeeded and cleared lease_batch and taken_at; after the last release all members carry no batch fields."
  - attempted_at: "2026-08-27T22:02:30Z"
    command: "manual (e): get_execution_packet for member TICK-002; board-root workspace attempt"
    cwd: "$TEMP/kanmer-c124-vxBeG8"
    exit_code: 0
    result: PASS
    summary: "Packet ready:true with claim.batch {id:B1, frozenAt, workspace, members [TICK-001..003], pending [TICK-001..003]}. The same-batch exception does not weaken refusals: take_ticket recording worktree '.' (board root) is refused outright ('Worktree \".\" is the Kanmer board workspace'), and a ticket recording a path inside the board worktree ('docs') gets packet ready:false with refusal 'records a path inside a Git worktree instead of that worktree's root; this is not a resumable ticket worktree'."
  - attempted_at: "2026-08-27T22:03:00Z"
    command: "manual (f): installed v0.3.12 plugin server (kanmer-mcp.cjs, build plugin v0.3.12 sha 639df4cf) on a copy carrying lease_batch fields"
    cwd: "$TEMP/kanmer-c124-copy-XfqjtK (mkdtemp copy taken while batch B1 fields were live)"
    exit_code: 0
    result: PASS
    summary: "Installed server reports version 0.3.12, get_item reads lease_batch B1, update_item write succeeds, and the raw ticket file afterwards still carries 'lease_batch: B1' and 'lease_batch_frozen_at' untouched."
---

# Proof — CORE-124 (FRD-030 batch workspaces)

Independent verification of PR #295 at the exact GitHub merge SHA
`9c9a6980e34aeaa43a691526d2715fe8fb97d6ce`, in the disposable detached
worktree `.worktrees/verify-core-124-9c9a6980e34aeaa43a691526d2715fe8fb97d6ce`
(asserted detached, clean, at the exact SHA before any check ran).

## Deterministic checks

All packet checks passed with exit 0: `npm run build`; `npm test -w
@kanmer/core` (417/417); `node packages/mcp-server/src/smoke.mjs` (306/306);
`npm run smoke:protocol` (50/50); `npm run test:http -w @kanmer/mcp-server`;
`npm run plugin:check` (39 tools); `npm run typecheck`; `npm run verify:skills`.

`npm run verify` exited 1 solely on the two antigravity launcher tests in
`scripts/test-scripts.mjs`, failing with `EBUSY: resource busy or locked,
rmdir '…\Kanmer Test Space\Kanmer\bin'` — the documented antigravity EBUSY
host quirk on this Windows machine. It persisted on one retry (2/121, both
attempts retained above). `git diff --stat 3dd48d37..9c9a6980 -- scripts
tools` is empty — the CORE-124 merge (16 files: core store/types/claims
tests, mcp-server errors/execution-packet/index/smoke, plugin cjs, skills
docs, glossary) touches nothing in that area, so the failure is
host-environmental and pre-existing. Hosted verification is green at the
exact merge SHA: run 33117549223 ("Pull request verification", success) at
`9c9a6980…`, and PR-head run 33116759466 (verify + kanmer-gate, success
after re-run) at `14cf7083…`.

## Manual FRD-030 acceptance (copies/throwaway boards only)

Run against mkdtemp throwaway boards using the verify worktree's built dist
server and, for (f), the installed v0.3.12 plugin server; the live board and
`.worktrees/kanmer` were never touched. Attempts (a)–(f) above record: the
three-ticket declare-and-freeze batch sharing one workspace with one PR/head
attestation and three member-owned proofs (AC4); refusal of an unrelated
ticket via WORKSPACE_OCCUPIED (naming the batch, force ineffective),
BATCH_FROZEN and BATCH_INVALID with byte-identical board files (AC5);
BATCH_WORKSPACE_MISMATCH for a member elsewhere; BATCH_ACTIVE until every
member is Done, with the final releases clearing `lease_batch`; the packet's
`claim.batch` block with board-root refusals intact; and the installed
v0.3.12 server reading and writing a `lease_batch`-carrying board without
disturbing the batch fields.

## Verdict

**PASS** — every check attributable to the merged change succeeded at the
exact merge SHA; the sole local failure is the known antigravity EBUSY host
quirk in an area the merge does not touch, recorded with both attempts and
compensated by green hosted verification at the same SHA.

## Closeout

- PR: https://github.com/collisionengineers/kanmer/pull/295
- Merged: 2026-08-27T21:18:41Z as `9c9a6980e34aeaa43a691526d2715fe8fb97d6ce` (squash merge of `core-124-batch-workspaces`)
- Proof record version at closeout: `e279c645fcceaf2c` — result **PASS**, unchanged by closeout.
