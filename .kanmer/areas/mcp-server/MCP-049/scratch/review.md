---
kind: review-attestation
pr: "266"
head_sha: "4b20eab9f0a2c0a4bba141ddeb21afee6e42b373"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "14a3e94c0e563ecc"
ticket_updated: "2026-08-25T07:24:06.132Z"
findings:
  - id: F-001
    severity: major
    summary: "New native runtime command convention is absent from AGENTS.md"
    disposition: open
  - id: F-002
    severity: major
    summary: "The private wrapper loses a project's configured board branch"
    disposition: open
  - id: F-003
    severity: major
    summary: "The manual incorrectly equates GUI Initialize with native runtime supervision"
    disposition: open
  - id: F-004
    severity: major
    summary: "Current native runtime JSON-status acceptance remains unproven"
    disposition: open
---
# Independent review — MCP-049 / PR #266

## Scope and evidence

Reviewed the exact PR head 4b20eab9f0a2c0a4bba141ddeb21afee6e42b373 against the complete MCP-049 packet, FRD-025, HZN-007 context, and post-implementation report. The repository diff is limited to docs/manual/connect.md and its generated manual mirror. Added-content confidentiality scanning found no API-key, bearer, private-key, provider-token, tunnel-id, or non-placeholder user-path pattern. The operational report is also appropriately redacted: it presents no credential, bearer, full provider identifier, or machine-specific path.

Local repository checks passed: node scripts/build-manual.mjs --check (22 chapters), focused generated-manual tests (11/11), npm run test:scripts (111/111), npm run typecheck (all workspaces), and git diff --check. Hosted verify and kanmer-gate are green on this head. A safe live public MCP probe returned 401 without a bearer and process enumeration found one tunnel-client and two cloudflared processes, but that is intentionally only partial operational corroboration. The correct tunnel-client runtimes status command did not yield JSON within the bounded read-only review query (60 seconds under Infisical injection; 10 seconds without); only that client query was terminated and no runtime/provider state was changed.

## Findings

- **F-001 — major, open:** This PR replaces the supported operational convention from foreground init/run to the long-lived runtimes connect/status lifecycle. AGENTS.md is unchanged, despite the repository rule requiring a PR that changes commands or conventions to update it. The first unresolved GitHub P1 thread identifies this. Add concise contributor guidance defining the supported native-supervisor lifecycle and its separation from repository code; do not add secret or machine-specific values.
- **F-002 — major, open:** The new private wrapper exports KANMER_PROVIDER_CWD but not KANMER_BOARD_BRANCH. The installed launcher consumes that variable to preserve a caller's configured board branch. On any project using a non-default board branch, the wrapper therefore defaults to kanmer-board and reports the correct board worktree as mismatched. The second unresolved GitHub P1 thread identifies this. Document/export the configured branch in the private wrapper with a generic placeholder and preserve the default safely.
- **F-003 — major, open:** Immediately after changing the documented long-lived path to runtimes connect, the GUI section still says Initialize and Run doctor execute the same commands. Production code shows Initialize invokes tunnel-client init and Start invokes tunnel-client run; neither creates the required native runtime alias. Clarify that GUI initialization/doctor validates the profile only, while native runtimes connect/status is the separate persistent-supervision step. Do not claim that the GUI has created or is monitoring that alias.
- **F-004 — major, open:** The plan requires current process_running, healthy, and ready JSON status, not doctor alone. The report claims that result, but the reviewer’s safe current status recheck was inconclusive: the exact status query produced no JSON within its bounded waits. Re-run the exact command in the known private Infisical context, record only exit code and approved redacted status booleans, and ensure it responds before fresh review. Preserve this attempt; do not expose secret material or modify the runtime merely to satisfy review.

The two GitHub threads are unresolved and are dispositioned by F-001 and F-002. No merge is authorized while these major findings remain open. This attestation makes no post-merge, release, or proof claim.
