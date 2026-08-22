---
kind: review-attestation
pr: "155"
head_sha: "9e7ab6299314cb3a7a9b0eb66ea70af630bf5b2c"
verdict: needs-changes
reviewer: "root"
independent: true
findings:
  - id: F-001
    severity: major
    summary: "CLI workflow-error annotation does not match the plan's required kanmer/gate title and code-bearing format"
    disposition: fix-requested
  - id: F-002
    severity: minor
    summary: "Infrastructure JSON envelope omits the plan's explicit infrastructureError marker"
    disposition: fix-requested
---

## Review scope

Independently reviewed PR #155 head 9e7ab629 against the CORE-024 plan, FRD-009, ADR-0011, the existing workflow, and the full diff. Focused core tests (10/10), full core tests (279/279), typecheck, build:core, CLI fixture, and diff-check pass. Hosted kanmer-gate passes on run 32555645841/job 96989232191. Hosted verify fails at pre-existing MCPB/plugin parity (scripts/check-mcpb-sync.mjs:44) on the merged b6c8 base; this is outside the PR's declared scope and is tracked separately as MCP-043.

## Findings

- F-001 needs changes: the plan requires one escaped annotation in the kanmer/gate title with the finding code; the implementation emits ::error title=kanmer-gate::... and drops the code. Align the CLI and test with the declared contract so consumers see the stable check/error identity.
- F-002 needs changes: the plan's adopted infrastructure envelope includes infrastructureError: true; the current emitInfra envelope only has ok, error, and findings. Add the marker and assert it in the CLI test while retaining exit 2 and path-safe diagnostics.

Stop at Review until the amended head is independently rerun.
