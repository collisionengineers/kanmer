---
kind: proof-record
merged_sha: "e474f317eaf7d7989667d8b44442d7845953956d"
environment: "Windows 11, Node 24, detached verification worktree .worktrees/verify-mcp-057-e474f317eaf7d7989667d8b44442d7845953956d at e474f317eaf7d7989667d8b44442d7845953956d (clean, detached)"
verified_at: "2026-09-05T04:25:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T04:00:00Z"
    command: "gh pr view 325 --repo collisionengineers/kanmer --json state,mergeCommit,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid e474f317eaf7d7989667d8b44442d7845953956d, url https://github.com/collisionengineers/kanmer/pull/325"
  - attempted_at: "2026-09-05T04:05:00Z"
    command: "gh run list --repo collisionengineers/kanmer --workflow pr.yml --event push --commit e474f317eaf7d7989667d8b44442d7845953956d --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "one run found: databaseId 33943822997, headSha exact match, event push, status in_progress at query time"
  - attempted_at: "2026-09-05T04:10:06Z"
    command: "gh run watch 33943822997 --repo collisionengineers/kanmer --exit-status"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "waited once for the bound push run to complete rather than starting a competing local rail; run finished green"
  - attempted_at: "2026-09-05T04:18:00Z"
    command: "gh run view 33943822997 --repo collisionengineers/kanmer --json jobs,conclusion,status,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "run conclusion success; job verify (101246164773) status completed conclusion success 'Run the authoritative verification rail' (npm ci && npm run verify), job kanmer-gate skipped (push event, correctly not required), job regate success"
  - attempted_at: "2026-09-05T04:19:00Z"
    command: "git worktree add --detach .worktrees/verify-mcp-057-e474f317eaf7d7989667d8b44442d7845953956d e474f317eaf7d7989667d8b44442d7845953956d"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "detached worktree created for the obligations the receipt cannot cover (this ticket's own contract check); rev-parse HEAD == e474f317eaf7d7989667d8b44442d7845953956d, symbolic-ref empty (detached), status clean"
  - attempted_at: "2026-09-05T04:19:30Z"
    command: "npm ci"
    cwd: ".worktrees/verify-mcp-057-e474f317eaf7d7989667d8b44442d7845953956d"
    exit_code: 0
    result: PASS
    summary: "647 packages installed cleanly"
  - attempted_at: "2026-09-05T04:20:00Z"
    command: "npm run build -w @kanmer/core"
    cwd: ".worktrees/verify-mcp-057-e474f317eaf7d7989667d8b44442d7845953956d"
    exit_code: 0
    result: PASS
    summary: "tsup build succeeded and node scripts/check-browser.mjs (part of the core build script) passed; needed only to produce dist/index.js for the ticket-contract demo script below, not to re-discharge a packet obligation already satisfied by the receipt"
  - attempted_at: "2026-09-05T04:21:00Z"
    command: "node mcp057-demo-rejected.mjs"
    cwd: ".worktrees/verify-mcp-057-e474f317eaf7d7989667d8b44442d7845953956d"
    exit_code: 0
    result: PASS
    summary: "decisive check of this ticket's own contract, run twice over: (1) assessReceipt(receipt with job: \"kanmer-gate\", otherwise fully valid for merged_sha) returns {kind: \"rejected\", reasons: ['receipt job must be \"verify\", got \"kanmer-gate\"']}; (2) reconcileEvidence on a full PASS-proof evidence object carrying that receipt for a Verifying MCP-057 against the merged PR returns findings [{code: PROOF_RECEIPT_REJECTED, level: error}] and recommendation: null -- not PROOF_RECEIPT_SHA_MISMATCH (the head_sha was correct) and no MOVE_TO_DONE. Script preserved at .worktrees/verify-mcp-057-e474f317eaf7d7989667d8b44442d7845953956d/mcp057-demo-rejected.mjs"
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33943822997
    attempt: 1
    head_sha: "e474f317eaf7d7989667d8b44442d7845953956d"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33943822997"
    covers:
      - "npm run build"
      - "node scripts/build-stamp.mjs --write"
      - "npm run build -w @kanmer/gui"
      - "npm run test:built (includes npm run test -w @kanmer/core: proof-receipts.test.ts, reconciliation.test.ts; node --test packages/mcp-server/src/reconciliation.test.mjs step-reconciliation.test.mjs via test:http:built)"
      - "npm run typecheck"
      - "npm run verify:docs"
      - "node packages/mcp-server/src/smoke.mjs"
      - "npm run smoke:headless"
      - "npm run mcpb:check:built"
      - "npm run smoke:protocol"
      - "npm run smoke:discovery"
      - "npm run golden"
      - "npm run verify:skills"
      - "npm run verify:agents-block"
      - "npm run plugin:check"
    observed_by: "kanmer-verify (MCP-057 verification pass)"
---

# Proof — MCP-057

## What the receipt satisfied

`gh run list`/`gh run view` bound the exact push-to-`main` run GitHub ran for
this merge SHA: run `33943822997`, event `push`, workflow `pr.yml`, job
`verify` completed with conclusion `success` (job `101246164773`, step "Run
the authoritative verification rail" = `npm ci && npm run verify`). Reading
`scripts/verify.mjs`'s `VERIFY_STEPS` array and the packages it composes
(`scripts/run-tests.mjs` -> `npm run test -w @kanmer/core` and
`packages/mcp-server/scripts/run-http-tests.mjs`'s `TEST_FILES`, which lists
both `src/reconciliation.test.mjs` and `src/step-reconciliation.test.mjs`) at
the merge SHA confirms every one of this ticket's packet obligations is a
strict subset of that ordered command list:

- `npm ci`, `npm run build` (includes `node packages/core/scripts/check-browser.mjs`
  as part of `@kanmer/core`'s own `build` script) — covered by `VERIFY_STEPS[0]`.
- `npm run test -w @kanmer/core` (`proof-receipts.test.ts`, `reconciliation.test.ts`,
  901/901) — covered by `npm run test:built` -> `scripts/run-tests.mjs`.
- `node --test packages/mcp-server/src/reconciliation.test.mjs
  packages/mcp-server/src/step-reconciliation.test.mjs` — covered by
  `npm run test:http:built -w @kanmer/mcp-server`, itself part of `test:built`;
  `run-http-tests.mjs`'s `TEST_FILES` names both files explicitly.
- `npm run typecheck`, `npm run verify:skills` — each a named `VERIFY_STEPS`
  entry, run verbatim.

No obligation in this ticket's packet is a manual GUI, installed-host,
Windows-lock, or provider check, so nothing was left `missing` by the
classification and no full re-run of the rail was needed locally. This is
the receipt discharging exactly what MCP-057 was built to let it discharge.

## What the worktree checks proved (this ticket's own contract, not a packet obligation)

The packet itself needed no worktree. A detached worktree was still created,
at this exact merge SHA, to run the decisive end-to-end check of what this
ticket actually shipped: that a bad receipt is truly rejected by the running
code, not merely documented as rejected. `npm ci` and `npm run build -w
@kanmer/core` produced `packages/core/dist/index.js`; `mcp057-demo-rejected.mjs`
then called the built `assessReceipt` and `reconcileEvidence` directly (not a
hand-rolled reimplementation) with a receipt naming `job: "kanmer-gate"` and
otherwise-valid fields for this exact merge SHA. Result: `assessReceipt`
returns `{kind: "rejected", reasons: ["receipt job must be \"verify\", got
\"kanmer-gate\""]}`, and `reconcileEvidence` on a full PASS-proof evidence
object returns finding `PROOF_RECEIPT_REJECTED` (not
`PROOF_RECEIPT_SHA_MISMATCH` — the `head_sha` was correct, isolating the
job-name path specifically) and `recommendation: null`. This is the same
production entry point (`packages/mcp-server/src/reconciliation.ts`'s
`reconcile_ticket` calls `reconcileEvidence`) that governs this very ticket's
own Done gate below.

## Code-validated vs human-judged, per the new skill's own section

Per `plugins/kanmer/skills/kanmer-verify/SKILL.md` "What is validated by code
and what is human judgement in this release" at this merge SHA: code
(`assessReceipt`, invoked through `reconcileEvidence`/`reconcile_ticket`)
validates receipt shape, `job == "verify"`, `workflow == "pr.yml"`, exact
`head_sha` match, `event == "push"`, and `conclusion == "success"` — the
`PROOF_RECEIPT_REJECTED` demonstration above exercised the job check live.
Two things remain this verifier's human judgement, stated honestly rather
than mechanised:

- **Provider provenance** — the receipt above genuinely names run
  `33943822997` as shown by `gh run view`; `observed_by` names this
  verification pass, not a forged or hand-edited value.
- **"packet ⊆ npm run verify" coverage** — traced above by reading
  `scripts/verify.mjs`, `scripts/run-tests.mjs`, and
  `packages/mcp-server/scripts/run-http-tests.mjs` at the merge SHA and
  confirming every packet command is a literal subset of `VERIFY_STEPS`, not
  assumed from the ticket title.

## Result

**PASS.** Every packet obligation is `satisfied` by the bound post-merge
receipt above; the ticket's own new contract (`PROOF_RECEIPT_REJECTED` for a
non-`verify` job) was independently exercised end-to-end against the built
code and behaved exactly as MCP-057 specifies. No obligation is `missing` or
`rejected`.
