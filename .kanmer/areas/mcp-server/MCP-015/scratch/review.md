---
kind: review-attestation
pr: "152"
head_sha: "16f91003a813f20e66539069fc4e3f6d936d2891"
verdict: needs-changes
reviewer: "root"
independent: true
plan_hash: "34dfaaaaafac0d68"
ticket_updated: "2026-08-22T03:53:21.510Z"
findings:
  - id: F-001
    severity: major
    summary: "Legacy Antigravity disconnect fixtures lacked an injected absent-plugin command seam"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Release version bump source of truth omits the new Antigravity plugin manifest"
    disposition: open
  - id: F-003
    severity: major
    summary: "The native plugin descriptor hardcodes node without a packaged-runtime solution"
    disposition: open
  - id: F-004
    severity: minor
    summary: "Removing legacy Antigravity paths from .gitignore exposes migration residue"
    disposition: open
  - id: F-005
    severity: major
    summary: "Functional proof accepts the literal prompt marker without verifying project-specific get_status data"
    disposition: open
  - id: F-006
    severity: major
    summary: "Interpolated Antigravity shell commands are unsafe for hostile roots"
    disposition: open
  - id: F-007
    severity: major
    summary: "AGENTS.md does not document the new native Antigravity manifest/lifecycle convention"
    disposition: open
---

## Review scope

Independently reviewed PR #152 at head 16f91003a813f20e66539069fc4e3f6d936d2891 against the MCP-015 plan, FRD-010, FRD-012, ADR-0009, the implementation report, the complete diff, the required hosted check, GitHub review comments, and unresolved GraphQL review threads. The original hosted test regression (F-001) is fixed by a bounded test-only seam, and the required hosted verify is now green. The PR remains non-mergeable because the unresolved automated review findings below are substantive.

## Findings and dispositions

- F-001 fixed: the three legacy Antigravity disconnect fixtures inject a deterministic `agy plugin list` response of `No imported plugins.`; focused connect tests pass 29/29 and production remains fail-closed when the real CLI is unavailable.
- F-002 open: `scripts/release.mjs` must include `plugins/kanmer/plugin.json` in the version-bump manifest source of truth, with regression coverage, or a linked ticket must own that release blocker.
- F-003 open: the descriptor uses bare `node`, but packaged Kanmer deliberately promises Electron-as-Node/no separate Node installation. The plugin lifecycle needs a shipped-runtime/portable invocation solution or an explicit, authorized scope boundary; a preflight alone does not make the installed app work.
- F-004 open: dropping `.agents/mcp_config.json` and `.agents/skills/` from `.gitignore` exposes legacy machine-local migration residue before a user reconnects. Preserve ignore coverage or provide a safe, tested replacement.
- F-005 open: `connectNativePlugin` currently treats any output containing `KANMER_GET_STATUS_OK` as a successful tool proof, so a failed tool call that echoes the prompt can pass and trigger destructive legacy cleanup. Require project-specific machine-checkable get_status fields/fingerprint before cleanup; update fixtures.
- F-006 open: Antigravity command strings interpolate roots through `q()`, which does not safely handle shell metacharacters such as `$()`, backticks, `&`, or `;`. Use an argv-safe execution seam/robust quoting and test hostile roots.
- F-007 open: this PR changes commands/conventions and adds a third versioned manifest, but the governing AGENTS.md source of truth is not updated. Add the required native plugin/release convention in the same PR.

Every GitHub review thread is represented above; no thread is silently dropped. No merge, Verifying move, proof, release, or cleanup is authorized while any major finding is open.

## Residual risk

Real authenticated Antigravity install/uninstall, bound `get_status`, unbound control, and IDE evidence remain INCONCLUSIVE as documented by the author; those boundaries must remain explicit after the implementation findings are resolved. The current hosted verify success covers deterministic rails only and does not close those external acceptance gaps.

### 2026-08-22 automated review findings and bounded dispositions

The following six unresolved automated review threads were preserved before the remediation pass. They are all in scope for this PR and remain open until the fresh head is independently gathered:

1. P1, scripts/release.mjs pluginManifestPaths: “Add the Antigravity manifest to the release bump list.” The release source of truth omitted plugins/kanmer/plugin.json, allowing release/plugin:check version drift.
2. P1, plugins/kanmer/mcp_config.json: “Ship a runtime for the Antigravity MCP command.” A hardcoded node command is not valid for packaged installs whose supported runtime is Electron-as-Node and which do not require a separate Node installation.
3. P2, .gitignore: “Keep legacy Antigravity state ignored during migration.” Existing .agents/mcp_config.json and .agents/skills residue must remain machine-local and ignored until reconnect cleanup has proven ownership.
4. P1, apps/gui/src/main/providers.ts functional proof: “Verify board data instead of a disclosed static marker.” A failed tool call or model echo containing KANMER_GET_STATUS_OK must not authorize legacy cleanup.
5. P1, apps/gui/src/main/providers.ts/connect.ts command execution: “Pass Antigravity arguments without a shell.” q() interpolation was unsafe for paths containing $(), backticks, &, and ;.
6. P1, apps/gui/src/main/providers.ts / AGENTS.md: “Document new native plugin convention in AGENTS.md.” The root Antigravity manifest, native lifecycle, runtime convention, and release source of truth must be documented in the same PR.

Bounded dispositions implemented in this remediation: (1) release.mjs now bumps all three shipped plugin manifests and release-manifests.test.mjs pins that source of truth; (2) Antigravity mcp_config.json now launches the existing installer-owned Windows \`%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd\` through cmd.exe, and Connect preflights that launcher rather than node; (3) .gitignore restores both legacy .agents paths; (4) cleanup requires a fresh machine-checkable get_status identity containing the exact project fingerprint, canonical board root, repo root, and storage format, so markers/PONG/echoes fail closed; (5) Antigravity lifecycle commands use execFile argv, with hostile-root regression coverage; (6) AGENTS.md records the root manifest, launcher and lifecycle convention. No provider behavior outside the bounded native plugin path was changed.

The real agy host lane remains INCONCLUSIVE: no disposable authorized plugin project or credentials are available. No install/uninstall/functional capability is inferred from list, validation, process start, marker output, or fixture output.
