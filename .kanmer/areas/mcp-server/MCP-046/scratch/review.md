---
kind: review-attestation
pr: "231"
head_sha: "5fe1a0f5c3a6cf589af6a9f7f2b36477b7864899"
verdict: needs-changes
reviewer: "doc019_executor"
independent: true
plan_hash: "08d18d9d435084fe"
ticket_updated: "2026-08-23T12:32:45.051Z"
findings:
  - id: F-001
    severity: blocker
    summary: "GUI Connect rejected the shipped unquoted descriptor because its Antigravity helper still emitted the old quoted argv."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The changed launcher convention was undocumented in AGENTS.md and FRD-012 still specified the quoted Antigravity argv."
    disposition: fixed
  - id: F-003
    severity: blocker
    summary: "The unquoted launcher token is not safe when LOCALAPPDATA expands to a path containing whitespace."
    disposition: open
---

## Changes reviewed

Remediation commit `5fe1a0f5` updates the GUI Antigravity invocation and its lifecycle fixtures to the unquoted argv, while leaving the Codex invocation and Codex tests quoted. It also documents the Antigravity-specific convention in `AGENTS.md` and FRD-012. The original descriptor, plugin-sync assertion, and two-case dependency-free regression remain in scope.

## Acceptance and checks

- Antigravity Connect now validates, probes, and stages the unquoted launcher through `antigravityPortableInvocation()`; Codex remains quoted through `codexPortableInvocation()`.
- `node --test scripts/antigravity-plugin-config.test.mjs`: PASS, 2/2.
- GUI `connect.test.ts`: PASS, 35/35; GUI `providers.test.ts`: PASS, 66/66.
- `npm run plugin:check`: PASS; `git diff --check`: PASS.
- `kanmer-gate`: PASS. Hosted `verify` is currently FAIL on run 32640132767 because the Windows core suite hit unrelated Vitest timeouts/ENOTEMPTY cleanup errors; it is not claimed green.
- The real-host evidence remains honestly bounded to the disposable corrected descriptor and bound agy `get_status` result; it does not claim packaged or IDE proof.

## Findings and dispositions

- **F-001 — blocker, fixed (PR thread 3838509508).** The helper, Connect validation path, and GUI fixtures now use the unquoted Antigravity form; the direct Codex contract remains unchanged.

- **F-002 — major, fixed (PR thread 3838509510).** `AGENTS.md` now records the unquoted native Antigravity token, and FRD-012 distinguishes it from Codex's quoted project registration.

- **F-003 — blocker, open (PR thread 3838526763).** If `%LOCALAPPDATA%` expands to a Windows path containing whitespace, `cmd.exe /c` receives an unquoted command path and can parse only the prefix before the first space. The PR's own research lists path-with-spaces shell safety as a risk, but the remediation removed quotes from both the plugin launch and Connect's local `--probe`. Resolve this while retaining Antigravity's requirement that embedded quote characters not be forwarded literally, and add regression/evidence for the spaced-path case.

## Verdict

Needs changes. The GUI/Codex split and documentation remediation are correct, but the remaining path-with-spaces launch failure is a production blocker, and the hosted authoritative verify is not green.
