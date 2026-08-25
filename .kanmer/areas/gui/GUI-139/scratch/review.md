---
kind: review-attestation
pr: "265"
head_sha: "1218384c8248c4670cdb54bb790958996005afd7"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "9af7da453bc2b0c7"
ticket_updated: "2026-08-25T06:57:14.081Z"
findings:
  - id: F-001
    severity: major
    summary: "Incomplete-profile exception is broader than the product-owned default"
    disposition: fixed
  - id: F-002
    severity: major
    summary: "Doctor or Initialize makes the product-created incomplete profile unloadable"
    disposition: fixed
  - id: F-003
    severity: major
    summary: "Generated default profile name can fail its own validation on restart"
    disposition: open
---
# Independent re-review — GUI-139 / PR #265

## Scope and evidence

Reviewed exact PR head 1218384c8248c4670cdb54bb790958996005afd7 against the full GUI-139 packet, FRD-025, and HZN-007 context. The three remediation commits remain within the two declared files. Exact-head local evidence passed: focused openaiTunnel tests (13/13), all-workspace typecheck, and git diff --check against 700ae9c46904cd5417abe81dd3b256f6d33000d0. Hosted checks were in progress at the final gather.

## Finding dispositions

- **F-001 — major, fixed:** Structural default matching remains restricted to the canonical project-derived configuration, and the regressions reject altered safe tunnel, executable, and profile-name values.
- **F-002 — major, fixed:** Product-written diagnostic metadata is now separately bounded to string/null summaries/errors and a parseable-or-null timestamp while structural default fields remain exact. Incomplete profiles are still rejected before Doctor/Initialize mutates state, spawns, or persists data.
- **F-003 — major, open:** defaultProfile derives profileName by replacing unsafe characters but does not ensure its first character is alphanumeric. A project basename such as .kanmer, _repo, -repo, or a non-ASCII-prefixed directory persists an expected default whose name fails isSafeOpenAIProfileName; normalizeProfile then rejects it at the next restart despite productDefault matching. Canonicalize or prefix the generated name so it always satisfies the profile-name validator, and add a register/restart regression for a non-alphanumeric basename.

No merge is authorized while F-003 is open. GitHub currently also has one matching unresolved F-003 thread; the older diagnostics thread is disposed fixed by this head. This attestation makes no post-merge, release, or proof claim.
