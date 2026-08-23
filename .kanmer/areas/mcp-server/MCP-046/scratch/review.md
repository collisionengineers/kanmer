---
kind: review-attestation
pr: "231"
head_sha: "d63495a1ed80d0e5b258fbe46b126ca4e2b63b9a"
verdict: needs-changes
reviewer: "doc019_executor"
independent: true
plan_hash: "08d18d9d435084fe"
ticket_updated: "2026-08-23T12:32:45.051Z"
findings:
  - id: F-001
    severity: blocker
    summary: "GUI Connect still expects the old quoted Antigravity launcher argv and rejects the shipped unquoted descriptor."
    disposition: open
  - id: F-002
    severity: major
    summary: "The changed launcher convention is not recorded in AGENTS.md, and FRD-012 still specifies the old quoted Antigravity argv."
    disposition: open
---

## Changes reviewed

PR #231 changes the native `plugins/kanmer/mcp_config.json` launcher argument to the unquoted `%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd` form, adds a two-case dependency-free regression, and updates `scripts/check-plugin-sync.mjs` to pin the command, argv, environment-key, cwd, and root/path constraints.

## Checks and acceptance

- `node --test scripts/antigravity-plugin-config.test.mjs`: PASS, 2/2.
- `npm run plugin:check`: PASS.
- GUI `connect.test.ts` and `providers.test.ts`: PASS, 101/101, but their fixtures retain the old quoted form and therefore do not exercise the shipped unquoted descriptor against Connect's validator.
- Hosted PR `verify` and `kanmer-gate`: PASS.
- `git diff --check`: PASS.
- The report's real-host evidence is honestly bounded: it describes a disposable corrected descriptor and bound agy `get_status` result, without claiming packaged/IDE proof; cleanup and remaining post-merge proof are retained as residual work.

## Findings and dispositions

- **F-001 — blocker, open (PR thread 3838509508).** `apps/gui/src/main/connect.ts` exact-compares the staged descriptor against `antigravityPortableInvocation()` from `apps/gui/src/main/providers.ts`, which still returns the embedded-quoted launcher. With this PR's source descriptor, GUI Connect throws before `agy plugin validate` or installation. Update the consumer/helper contract and its GUI fixtures/regression, or introduce a distinct descriptor-shape contract while preserving the direct local probe semantics as appropriate.

- **F-002 — major, open (PR thread 3838509510).** This PR changes a shipped command convention, but the managed operating guidance has not been updated despite the repository rule requiring command/convention changes to update `AGENTS.md`. The governing FRD-012 Antigravity row also still documents the embedded-quoted argv. Update the durable guidance and governing contract, or provide an explicit authorized disposition for each discrepancy.

## Verdict

Needs changes. The unquoted form is supported by the bounded real-host evidence and is the smallest descriptor-only agy fix, but the current head is not wired through GUI Connect and leaves governing guidance inconsistent.
