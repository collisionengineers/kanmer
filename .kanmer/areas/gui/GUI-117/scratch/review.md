---
kind: review-attestation
pr: "214"
head_sha: "858b76f76e375caa729deeb2a10b5b85491f7141"
base_sha: "69ca8883"
verdict: needs-changes
reviewer: "codex-mcp-client"
independent: true
reviewed_at: "2026-08-22T22:16:00Z"
findings:
  - id: F-001
    severity: P2
    summary: "AGENTS.md still states that source descriptors retain ${KANMER_BOARD_BRANCH:-kanmer-board}, contradicting the literal shipped Antigravity descriptor introduced by this PR."
    disposition: needs-changes
    evidence: "AGENTS.md lines 76-80 in the reviewed head; PR diff changes plugins/kanmer/mcp_config.json but not AGENTS.md."
checks:
  descriptor: "PASS — plugins/kanmer/mcp_config.json has env.KANMER_BOARD_BRANCH exactly kanmer-board and no shell interpolation"
  staged_custom_branch: "PASS — existing connect.test.ts Antigravity lifecycle asserts release-board is injected into disposable staged descriptor while source bundle remains unchanged"
  focused_tests: "PASS — npx vitest run src/main/connect.test.ts src/main/providers.test.ts; 100/100"
  typecheck: "PASS — npm run typecheck -w @kanmer/gui; exit 0"
  diff_check: "PASS — git diff --check 69ca8883 858b76f7; exit 0"
  external_packaged_antigravity: "INCONCLUSIVE — no disposable live Windows host authorized"

Independent review of GUI-117 PR #214 at exact head 858b76f76e375caa729deeb2a10b5b85491f7141 against base 69ca8883. The source/test diff is otherwise bounded to the literal descriptor and regression; the GUI-owned disposable staging path still injects custom branches and the shipped bundle remains unchanged by staging. The required guide contract is stale, however: AGENTS.md explicitly requires the old shell-style source default. Amend the PR to reconcile that wording with the literal shipped descriptor, then request fresh review. No merge authorized.
