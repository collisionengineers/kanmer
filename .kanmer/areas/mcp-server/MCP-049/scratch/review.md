---
kind: review-attestation
pr: "266"
head_sha: "45b7c649adf332bbb59d0e4aa92d6ba09889403f"
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: "14a3e94c0e563ecc"
ticket_updated: "2026-08-25T07:43:21.770Z"
findings:
  - id: F-001
    severity: major
    summary: "Native runtime convention was absent from AGENTS.md"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Private wrapper did not preserve a configured board branch"
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Manual conflated GUI controls with native runtime supervision"
    disposition: fixed
  - id: F-004
    severity: major
    summary: "Current native runtime JSON-status acceptance was not independently re-proven"
    disposition: fixed
  - id: F-005
    severity: major
    summary: "Previous branch reverts GUI-139 persisted-profile safeguards and regression coverage"
    disposition: fixed
  - id: F-006
    severity: major
    summary: "Committed packaged plugin runtime was stale after changing the canonical managed AGENTS body"
    disposition: fixed
---
# Independent review — MCP-049 / PR #266

## Verdict and scope

PASS for exact head `45b7c649adf332bbb59d0e4aa92d6ba09889403f`. This is an independent review by a distinct agent role against the complete MCP-049 packet, HZN-007 context, FRD-025, post-implementation report, current main, exact PR diff, GitHub checks, reviews, comments, and review threads.

The branch merge-base is current main `bb6e8f47d5aa2bffc5830d0c447fbfca15caa4d6`; GUI-139's persisted-profile guards and regression tests are unchanged. The diff is the bounded manual/convention work plus one required generated plugin artifact: AGENTS.md, the canonical managed body, its installed-skill and packaged-runtime mirrors, manual source, and regenerated manual chapter. No secret, provider identifier, or machine-specific value is committed.

## Findings and evidence

- **F-001 fixed:** AGENTS.md, the canonical source, and the installed skill now document the native `runtimes connect/status/stop/remove` boundary.
- **F-002 fixed:** the private wrapper exports both `KANMER_PROVIDER_CWD` and `KANMER_BOARD_BRANCH`.
- **F-003 fixed:** the manual accurately distinguishes native supervision from GUI `init/doctor/run` ownership.
- **F-004 fixed:** an independent bounded read-only status query exited 0 and reported running, healthy, ready, and non-stale, with no secret-bearing output retained.
- **F-005 fixed:** rebase onto current main preserves all GUI-139 source and tests unchanged.
- **F-006 fixed:** `npm run plugin:build` regenerated the required `plugins/kanmer/scripts/agents-block-body.mjs` packaged-runtime mirror. Independent `npm run build && npm run plugin:check` passes: 37 tools, matching bundle bytes, 12 skill frontmatters, and isolated 37-tool handshake. The prior exact-head hosted verification failure at `183ff91c3311befb8cdf74dc3c295abd2efa395c` is preserved in the report as a genuine artifact-drift failure; this head corrects it rather than erasing it.

Independent local evidence: manual freshness 22 chapters; focused generated-manual test 11/11; script tests 111/111; all-workspace typecheck; build; plugin synchronization; and diff check passed. Exact-head hosted run 32822962261 passed: verify 4m36s and kanmer-gate 48s. The two GitHub P1 threads map to F-001/F-002 and are fixed; resolve them before final merge gather. No blocker, scope expansion, or residual risk remains for this review.
