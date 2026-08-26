---
kind: review-attestation
pr: "282"
head_sha: "7bc0168e62ebff55c86102103c996be01b71faf4"
verdict: needs-changes
reviewer: "mcp053-independent-review"
independent: true
plan_hash: "3d052de626aeefc8"
ticket_updated: "2026-08-26T12:58:35.290Z"
findings:
  - id: F-001
    severity: note
    summary: "Exact branch/worktree resumption is an explicit local workflow confirmation, not an authorization boundary between MCP clients."
    disposition: accepted-risk
    reason: "MCP client names and readable ticket locations are not credentials; exact values are a deliberate bounded confirmation rather than a security control."
  - id: F-002
    severity: major
    summary: "The advertised resumed path still attempts to create and take an already-recorded worktree and ticket, so it cannot complete."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "AGENTS.md does not document the new occupied-ticket resume convention required for contributors and agents."
    disposition: fixed
  - id: F-004
    severity: major
    summary: "The required verify job fails the new resumed-worktree smoke assertion on GitHub Windows because Git emits a slash-form path while Node resolves the fixture path with backslashes."
    disposition: open
---

# Independent review — MCP-053

## Scope and evidence

I independently reviewed PR #282 at `7bc0168e62ebff55c86102103c996be01b71faf4`, its packet documents, the full live diff, and both GitHub review threads. The scope remains bounded to the execution-packet resume API, its caller contract, its generated plugin runtime, and the managed contributor instructions. The PR is authored by `collisionengineers`; this is an independent agent-role review.

The branch-protection requirements are `verify` and `kanmer-gate`. `kanmer-gate` passed. The required `verify` run 32971427936 failed, so this review cannot pass or merge.

Independent local evidence at the reviewed head:

- `npm run build:server` — PASS.
- `node packages/mcp-server/src/smoke.mjs` — PASS, 227/227, including exact resume, mismatched-resume refusal, and Git worktree validation.
- `node scripts/verify-agents-block.mjs` — PASS, 31/31; it proves the canonical block, repository AGENTS.md, and shipped setup mirror match.
- `node scripts/verify-skill-prose.mjs` and `node --test scripts/verify-skill-prose.test.mjs` — PASS; the regression test rejects a resumed flow that would recreate its worktree.
- `npm run plugin:check` — PASS; 37 tools, matching generated bundle, and isolated MCP handshake.

## Disposition of prior threads

### F-002 — fixed

`kanmer-execute` now treats `ticket.taken` as a resumed lane. It validates the precise recorded worktree and branch and expressly skips both `git worktree add` and `take_ticket`; only a packet with no recorded take follows the fresh path. The new smoke creates a real Git worktree, receives a ready packet from a different client identity, and validates that exact branch/worktree. The generated plugin contains the same skill contract.

### F-003 — fixed

The canonical managed block now tells agents that fresh tickets use `take_ticket`, while resumed packets validate and reuse the exact recorded branch/worktree without a second take or worktree creation. `scripts/agents-block-body.mjs`, repository `AGENTS.md`, and the shipped `kanmer-setup` mirror are aligned and passed the dedicated verifier.

## New required remediation

### F-004 — major, open

The implementation needs a cross-form Windows path comparison in the smoke assertion. GitHub's required run fails the exact assertion with `C:/Users/runneradmin/...` returned by Git versus the Windows-resolved fixture path, despite the branch being correct. Normalize both sides to a common slash form (or compare canonical real paths) before equality. Re-run the full required CI and obtain a fresh review attestation at the resulting head.

## Residual risk

F-001 remains accepted risk: the exact pair is an explicit local workflow confirmation, not a credential or authorization boundary. The server remains fail-closed for absent, partial, or non-exact values.

## Verdict

Needs changes. Do not merge while required `verify` is red. The only open blocker identified in this review is F-004.
