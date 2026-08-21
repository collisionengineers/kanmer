# Checklist — MCP-036

## Preparation

- [x] Read MCP-025 packet, review finding, FRD-025, and ADR-0017.
- [x] Confirm current listener/timer/socket start and close semantics.

## Implementation

- [x] Resolve project fingerprint before binding.
- [x] Retain readiness metadata without a second project resolution.
- [x] Roll back every partial startup resource on failure.
- [x] Add no-board/fingerprint-failure regression.
- [x] Preserve valid start, HTTP smoke, and official-client behavior.

## Verification

- [x] HTTP unit rail passes (7/7).
- [x] Build and HTTP smoke pass.
- [x] stdio/protocol/discovery smokes pass (184/184, 42/42, 13/13).
- [x] Root typecheck exits 0; test/smoke results are recorded without hiding failures.
- [x] git diff --check and temporary-resource cleanup pass.

## Review and closeout

- [x] Post-implementation report written; PR follows after commit.
- [ ] Independent review/merge.
- [ ] Merged-main proof, Done move, cleanup, and release.
