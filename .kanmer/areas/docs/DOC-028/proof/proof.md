---
kind: proof-record
merged_sha: "bd36854967b0fa0b68489a4f3db592a59d451696"
environment: "detached verification worktree .worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696 on Windows 11, Git Bash, Node 24 (npm ci); push-to-main verify job ran on GitHub-hosted ubuntu runner, Node 20 (per repo CI pin)"
verified_at: "2026-09-05T03:25:00.000Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T03:11:51Z"
    command: "push-to-main verify (workflow pr.yml, run 33941180713, job 'verify')"
    cwd: "GitHub Actions runner (hosted, not local)"
    exit_code: 0
    result: PASS
    summary: "Authoritative receipt for the `npm run verify` obligation (HZN-009, R1-EVID). Triggered by push of merge commit bd36854967b0fa0b68489a4f3db592a59d451696 to main. Job 'verify' ran steps Set up job / Check out the pull request / Set up Node.js / Run the authoritative verification rail / Post Set up Node.js / Post Check out the pull request / Complete job, all success, in 10m24s (03:11:54Z-03:22:18Z). Observed via `gh run view 33941180713 --json jobs,conclusion,status,attempt,headSha,url`; headSha field equals the full merge SHA exactly."
  - attempted_at: "2026-09-05T03:24:10Z"
    command: "npm ci"
    cwd: ".worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696"
    exit_code: 0
    result: PASS
    summary: "Clean install succeeded in the detached worktree at the exact merge SHA."
  - attempted_at: "2026-09-05T03:24:40Z"
    command: "node scripts/verify-agents-block.mjs"
    cwd: ".worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696"
    exit_code: 0
    result: PASS
    summary: "35/35 checks passed, including new checks 10-13 asserting no stale 'merged main' proof claim, presence of delivery.integrationBranch, the routing and heavy-owner sentences, and the deployment-separation sentence. Log: /tmp/doc028-verify-logs/verify-agents-block.log"
  - attempted_at: "2026-09-05T03:24:41Z"
    command: "node --test scripts/agents-block-routing.test.mjs"
    cwd: ".worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696"
    exit_code: 0
    result: PASS
    summary: "All tests passed (5-sentence exact-occurrence assertions plus the 24-rule/4-group structural check). Log: /tmp/doc028-verify-logs/agents-block-routing-test.log"
  - attempted_at: "2026-09-05T03:24:42Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696"
    exit_code: 0
    result: PASS
    summary: "verify-skill-prose.mjs and related checks all green; FRD-023 R1 compliance confirmed, no per-profile requirement restated by a skill. Log: /tmp/doc028-verify-logs/verify-skills.log"
  - attempted_at: "2026-09-05T03:24:43Z"
    command: "npm run verify:docs && npm run check:manual"
    cwd: ".worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696"
    exit_code: 0
    result: PASS
    summary: "Manual up to date (22 chapters); no undocumented command or convention drift. Log: /tmp/doc028-verify-logs/verify-docs-check-manual.log"
  - attempted_at: "2026-09-05T03:24:50Z"
    command: "git diff c088be13 bd368549 --stat -- plugins/kanmer/mcp/"
    cwd: ".worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696"
    exit_code: 0
    result: PASS
    summary: "Empty diff output — plugins/kanmer/mcp/kanmer-mcp.cjs is byte-identical between c088be13 (source-of-truth base) and bd368549 (this ticket's merge SHA), confirming the ticket's claim that no core/server source change touched the bundled MCP artifact. Log: /tmp/doc028-verify-logs/mcp-cjs-diff.log"
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33941180713
    attempt: 1
    head_sha: "bd36854967b0fa0b68489a4f3db592a59d451696"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33941180713/job/101238796528"
    covers: ["npm run verify"]
    observed_by: "claude-code verifier (HZN-009)"
---

# Proof — DOC-028 @ `bd36854967b0fa0b68489a4f3db592a59d451696`

## Obligations satisfied by the push-to-main receipt

Per HZN-009 (pack R1-EVID; `mcp__kanmer__get_group_doc id: HZN-009
path: context.md`), the push-to-`main` `verify` job that `.github/workflows/pr.yml`
runs for the exact merge SHA is the authoritative receipt for the `npm run
verify` obligation. That receipt is workflow run `33941180713`
(https://github.com/collisionengineers/kanmer/actions/runs/33941180713),
triggered by `event: push` for `headSha: bd36854967b0fa0b68489a4f3db592a59d451696`
— the exact PR #321 `mergeCommit.oid`, confirmed via `gh pr view 321 --json
state,mergeCommit,url` (`state: MERGED`). Its `verify` job completed
`success` in 10m24s. This discharges the full `npm run verify` obligation;
it was not re-run locally in the detached worktree, per this ticket's
programme-specific evidence rule and to avoid Alex (the named heavy
verifier) being duplicated by an automated agent. Provider provenance
(run id, head SHA, job name and conclusion) was human-observed via the
`gh` CLI against the live GitHub API, not inferred or reconstructed from
local state.

## Obligations satisfied by the detached-worktree checks

The following checks are not covered by the full-verify receipt as
distinct, cheap, ticket-specific evidence and were run directly in
`.worktrees/verify-doc-028-bd36854967b0fa0b68489a4f3db592a59d451696`
(detached at the exact merge SHA, confirmed clean and detached before any
command ran):

- `npm ci` — clean dependency install at this SHA.
- `node scripts/verify-agents-block.mjs` — the ticket's own new checks
  10-13 (stale-phrase absence, `delivery.integrationBranch` presence,
  routing/heavy-owner sentences, deployment-separation sentence), plus
  all pre-existing checks 1-9 (24-rule/4-group structure, mirror
  byte-equality, GUI re-export shape).
- `node --test scripts/agents-block-routing.test.mjs` — the new routing
  fixture test asserting each of the five required sentences appears
  exactly once and the 24-rule/4-group structure is intact.
- `npm run verify:skills` — FRD-023 R1 compliance (no skill restates a
  per-profile requirement `get_doc_gates` already answers).
- `npm run verify:docs && npm run check:manual` — governing-doc/manual
  consistency, confirming the plan's conditional Step 7 (an optional
  AGENTS.md prose sentence) was correctly skipped.
- `git diff c088be13 bd368549 --stat -- plugins/kanmer/mcp/` — verifies
  the ticket's explicit claim that `plugins/kanmer/mcp/kanmer-mcp.cjs` is
  byte-unchanged since the last known-good release base (`c088be13`),
  because this ticket touches no `packages/core` or `packages/mcp-server`
  source.

All seven attempts (one receipt, six local) returned PASS with no
retries needed.

## Result

**PASS.** The PR is merged at the exact recorded SHA, the authoritative
CI verify receipt is green for that exact SHA, and every ticket-scoped
check specific to DOC-028 (agents-block checks, routing test, skills
prose check, docs/manual check, and the byte-identity confirmation of
the untouched MCP bundle) passes in a clean detached worktree at that
SHA. No deviation, retry, or waiver was needed.
