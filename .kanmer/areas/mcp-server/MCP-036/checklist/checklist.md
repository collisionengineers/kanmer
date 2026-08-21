# Checklist — MCP-036

## Preparation

- [ ] Read MCP-025 packet, review finding, FRD-025, and ADR-0017.
- [ ] Confirm current listener/timer/socket start and close semantics.

## Implementation

- [ ] Resolve project fingerprint before binding.
- [ ] Retain readiness metadata without a second project resolution.
- [ ] Roll back every partial startup resource on failure.
- [ ] Add no-board/fingerprint-failure regression.
- [ ] Preserve valid start, HTTP smoke, and official-client behavior.

## Verification

- [ ] HTTP unit rail passes.
- [ ] Build and HTTP smoke pass.
- [ ] stdio/protocol/discovery smokes pass.
- [ ] Root typecheck/test results recorded without hiding failures.
- [ ] git diff --check and temporary-resource cleanup pass.

## Review and closeout

- [ ] Post-implementation report and PR.
- [ ] Independent review/merge.
- [ ] Merged-main proof, Done move, cleanup, and release.
