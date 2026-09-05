# Files — CORE-138

## Edited

- `.github/workflows/pr.yml`
  - `concurrency.group`: carve `edited` PR events into a distinct group so a body
    edit never cancels a running `verify`/`kanmer-gate` for the same PR:
    `${{ github.workflow }}-${{ github.event_name }}-${{ github.event.action == 'edited' && 'meta-' || '' }}${{ github.event.pull_request.number || github.ref }}`.
    Keep `cancel-in-progress: ${{ github.event_name != 'push' }}` unchanged.
    Update the comment block above the block to describe the new carve-out
    truthfully (do not claim `edited` still shares the run's group).
  - `kanmer-gate` step: append
    `${{ github.event.pull_request.draft && '--draft' || '' }}` as an extra CLI
    argument to the `node packages/mcp-server/src/check-pr.mjs …` invocation.
  - `regate` job: replace the "in progress → skip" branch of the per-PR loop
    with a bounded wait (`timeout 900 gh run watch "$run_id" --exit-status
    >/dev/null 2>&1 || true`) followed by one retry
    (`gh run rerun "$run_id" --job "$job_id"`), with clear `echo` lines for the
    waited-then-reran and the already-finished outcomes.
  - Only these three seams are touched; `node-version: 24` lines belong to
    PR #322 (CORE-140) and are left exactly as that PR sets them — do not
    revert or fight over them if #322 has already merged onto `main` by the
    time this branches.

- `packages/mcp-server/src/check-pr.mjs`
  - New `--draft` boolean flag (extend `parseArgs`).
  - Draft PR authoritative source: the event payload's
    `pull_request.draft === true`. The CLI flag is redundant confirmation
    (workflow always passes it consistently with the event); when payload and
    flag disagree, the **event payload's `draft` field is authoritative** — a
    conditional-expression bug on the caller side must not silently turn a
    draft PR strict or a ready PR advisory. Document this choice inline as a
    comment.
  - In `--draft` mode (i.e., the effective draft state is true): run every
    existing check exactly as today (do not skip or shortcut any evaluation),
    but:
    - write the JSON result and a human-readable summary of findings to
      `process.env.GITHUB_STEP_SUMMARY` when that env var is set (append,
      `ADVISORY (draft): ...` prefix per finding line) in addition to the
      existing stdout/stderr behavior;
    - prefix each finding line written to stdout/stderr with
      `ADVISORY (draft):`;
    - always `process.exitCode = 0`, regardless of `result.ok`.
  - Non-draft behavior is byte-for-byte unchanged (strict/warn per
    `KANMER_GATE_STRICT`, same exit codes 0/1/2).

- `plugins/kanmer/skills/kanmer-execute/SKILL.md`
  - "Finish: report, PR, Review" section, step 3: PR handoff becomes
    `gh pr create --draft` → `update_item prs:[…]` → `move_item → review` →
    board push (reuse existing wording for how the board gets pushed —
    GUI auto-sync or `git -C .worktrees/kanmer push`) → `gh pr ready`.
    Add a sentence that the draft-mode gate result is advisory and the
    strict/warn judgment that matters binds to the PR once it is marked ready.

- `plugins/kanmer/skills/kanmer-review/SKILL.md`
  - Add an explicit sentence (near "Decide and merge" / the current-head
    attestation language) that review binds to the PR's current head and that
    merging requires a current-head `scratch/review.md` attestation; under
    `KANMER_GATE_STRICT` this is blocking, and until that variable is set it is
    a warning the reviewer must still treat as blocking by policy.

- `scripts/pr-workflow.test.mjs`
  - Extend with the matrix: concurrency expression carves out `edited`;
    `kanmer-gate` step has no draft-skip and conditionally passes `--draft`;
    `verify.if` still skips `edited` and `workflow_dispatch` and still runs on
    push to `main`; `regate` contains `gh run watch` and no unconditional
    in-progress skip line; no `pull_request_target` anywhere in the workflow
    files.

- `packages/mcp-server/src/check-pr.test.mjs`
  - New cases: draft event + `--draft` → exit 0 with `ADVISORY (draft):`
    output even when an underlying check fails; non-draft event unchanged
    (existing tests continue to pass unmodified); stale attestation (head SHA
    mismatch between attestation and PR) still reported as today (existing
    `STALE_REVIEW` behavior, asserted explicitly for the draft path too).

- `AGENTS.md`
  - "### Pull-request merge gate" paragraph: describe the draft handoff
    (draft → advisory gate → ready → strict/warn judgment), the `edited`
    concurrency carve-out, and the regate wait-then-retry behavior (conduct
    rule 24 area). Only if `npm run verify:docs` / `npm run check:manual`
    demand it, touch `docs/manual`.

## Explicitly not touched (CORE-142 / out of scope)

- No new required check, no branch-protection change, no repository variable
  writes (`KANMER_GATE_STRICT` stays operator-set).
- No `pull_request_target` anywhere.
- `scripts/verify.mjs`, `scripts/agents-block-body.mjs`, `kanmer-verify/SKILL.md`,
  `packages/core/src/reconciliation.ts` (or `packages/mcp-server/src/reconciliation.ts`),
  `apps/gui/**` are untouched.
