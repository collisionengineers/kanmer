---
kind: review-attestation
pr: "152"
head_sha: "fdeae1b04a1eaab95a48c11bf637efbe94ed8ad2"
verdict: needs-changes
reviewer: "root"
independent: true
plan_hash: "34dfaaaaafac0d68"
ticket_updated: "2026-08-22T04:12:54.507Z"
findings:
  - id: F-001
    severity: major
    summary: "Legacy Antigravity disconnect fixtures lacked an injected absent-plugin command seam"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Release version bump source of truth omitted the Antigravity manifest"
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Native plugin descriptor required a packaged runtime"
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Legacy Antigravity migration paths needed to remain ignored"
    disposition: fixed
  - id: F-005
    severity: major
    summary: "Functional proof needed project-specific get_status identity"
    disposition: fixed
  - id: F-006
    severity: major
    summary: "Native lifecycle commands needed argv-safe execution"
    disposition: fixed
  - id: F-007
    severity: major
    summary: "AGENTS.md needed the native plugin convention"
    disposition: fixed
  - id: F-008
    severity: major
    summary: "Antigravity dispatch completion required machine-checkable deliverable proof"
    disposition: fixed
  - id: F-009
    severity: major
    summary: "Native plugin cleanup could drop AGENTS.md while marketplace peers remained connected"
    disposition: fixed
  - id: F-010
    severity: major
    summary: "Functional plugin proof needed legacy-registration isolation"
    disposition: fixed
  - id: F-011
    severity: major
    summary: "Grok functional probe still interpolates a hostile project path through a shell"
    disposition: open
  - id: F-012
    severity: major
    summary: "Functional proof hardcodes and caps the storage format at 3"
    disposition: open
  - id: F-013
    severity: minor
    summary: "FRD-012 still documents the obsolete node/PLUGIN_ROOT Antigravity descriptor"
    disposition: open
  - id: F-014
    severity: minor
    summary: "README still describes Antigravity as a project .agents registration"
    disposition: open
---

## Review scope

Independently reviewed PR #152 at head fdeae1b04a1eaab95a48c11bf637efbe94ed8ad2 against the MCP-015 plan, FRD-010, FRD-012, ADR-0009, the complete diff, hosted verification, and all current GraphQL review threads. The prior six implementation findings and the three lifecycle findings are bounded in code; the four current findings below remain substantive. Hosted verification is still running on this head. The real authenticated Antigravity install/uninstall, bound get_status, unbound control, and IDE lanes remain INCONCLUSIVE.

## Findings and dispositions

- F-001..F-010 are fixed with focused regression coverage, shared deliverable verification, marketplace-peer retention, and temporary legacy registration isolation.
- F-011 open: the newly added Grok functional command still uses grok -p with --cwd and q(root) through the shell seam; add an argv-native Grok command and hostile-path test.
- F-012 open: expectedProjectIdentity defaults to format 3 and caps version.json values; derive the expected format from core's current storage-format source of truth so future format changes do not reject correct proofs.
- F-013 open: FRD-012's install matrix/R6 still says node plus the plugin-root token while the shipped descriptor uses cmd.exe and the installer-owned launcher; governing documentation must match the implementation.
- F-014 open: the end-user README still tells users Antigravity receives a project .agents/mcp_config.json; document the user-scoped native plugin and bound CLI behavior.

No merge, Verifying move, proof, release, or cleanup is authorized while F-011..F-014 remain open.

### 2026-08-22 fresh GraphQL review findings F-011 through F-014

Independent fresh review of PR 152 at fdeae1b0 found these additional current threads; the prior F-001 through F-010 dispositions remain in the earlier review sections:

- F-011 (blocking/P1): Grok's functional get_status probe still used a shell-interpolated command, so a hostile project root could alter command interpretation.
- F-012 (blocking/P1): expectedProjectIdentity hardcoded and capped the storage format at literal 3 instead of deriving the current format from core.
- F-013 (blocking/P2): FRD-012 still described the Antigravity descriptor as node plus the PLUGIN_ROOT token, contrary to the installer-owned launcher now shipped.
- F-014 (blocking/P2): README still said Connect writes the legacy .agents/mcp_config.json registration for Antigravity.

Disposition: F-011 fixed with Grok's argv-native lifecycle/functional commands and a hostile-root argv regression assertion; injected command runners remain only deterministic test seams. F-012 fixed by importing core CURRENT_FORMAT and clamping version.json values against that source of truth while retaining legacy 1/2 detection, with a format-2 functional identity regression. F-013 fixed by aligning FRD-012's descriptor, launcher matrix, token explanation, and MCP-015 route text with cmd.exe and %LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd. F-014 fixed by documenting that native Antigravity owns skills/MCP and .agents paths are migration residue only. No real host install/tool claim is added; the authorized-host proof remains INCONCLUSIVE.

Fresh commit and hosted verify rerun are pending. PR 152 stays open at Review; no merge.
