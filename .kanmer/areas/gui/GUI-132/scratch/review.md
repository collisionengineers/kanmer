---
kind: review-attestation
pr: "256"
head_sha: d731c982b2d338d6c8cc6630f3a00e44c259b847
verdict: pass
reviewer: "codex-doc021-review"
independent: true
plan_hash: 122411684b89206a
ticket_updated: "2026-08-25T01:38:42.802Z"
findings:
  - id: F-001
    severity: note
    summary: "The plan shows root-relative test paths although npm executes the workspace script from apps/gui."
    disposition: accepted-risk
    reason: "The post-implementation report truthfully preserves the resulting no-tests exit 1; independent review reran the equivalent workspace-relative command (src/main/connect.test.ts and src/main/providers.test.ts) successfully. This does not affect the shipped probe or its regression, and this attestation records the executable form for merged-main verification."
---

# Independent review — GUI-132 / PR #256

## Changes and scope

- Reviewed exact head `d731c982b2d338d6c8cc6630f3a00e44c259b847` against base `53d8e2a70c0a91225ace0125f243b2100bde4829`; `git diff --check` exited 0.
- The five changed files are the authorized probe implementation, probe/contract tests, and the required AGENTS command-convention guidance. No dependency, launcher batch, installer, updater, release, remote-access, or provider-registration change is present.
- `codexPortableInvocation` remains the FRD-012 rootless persisted descriptor. Only `codexPortableProbeInvocation` changes: `cmd.exe /d /s /c call "%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd" --probe`, run with `windowsVerbatimArguments: true`.
- The target area now has a Windows-only real Node → `cmd.exe` → temporary `.cmd` regression. Deterministic runner coverage asserts the exact invocation/options, the failure path still precedes `.codex/config.toml` mutation, and fallback text no longer contains literal escaped quotes.

## FRD-012 assessment

- R1e/R1d are met: the installed portable launcher is probed before config mutation; the rootless serialized registration and optional board-branch environment are unchanged; no absolute-path fallback is added; failures remain actionable.
- The actual process boundary is exercised, rather than inferred from an injected runner. The production change is probe-only, preserving provider ownership and the canonical registration byte shape.

## Evidence

- Independent focused GUI command: `npm run test -w @kanmer/gui -- --run src/main/connect.test.ts src/main/providers.test.ts` exited 0 (2 files, 102 tests).
- Independent exact real-process test: `npm run test -w @kanmer/gui -- --run src/main/connect.test.ts -t "crosses the real Node to cmd.exe launcher boundary"` exited 0.
- GUI typecheck exited 0.
- Disposable direct subprocess comparison reproduced the old command's exit 1 (`\"...kanmer-mcp.cmd\" is not recognized`) and the new production shape's exit 0 with `Kanmer MCP launcher: healthy`.
- Hosted `verify` completed SUCCESS at this exact head. PR #256 has no reviews, comments, or unresolved GraphQL review threads.

## Findings and disposition

- F-001 — note, accepted risk: the plan's root-relative workspace paths are not executable after npm enters `apps/gui`. The report retains that initial failure; equivalent correct commands passed independently and are recorded above. This is documentation precision only, not a product or test-coverage defect.

## Verdict

PASS — all substantive review criteria are met at the bound head. The initial `kanmer-gate` failure predates the Review move and this attestation, so rerun only that failed job. On green required checks, normal protected squash merge and one Review → Verifying move are authorized. Merged-main proof, packaged installation, release, and cleanup remain for later stages.
