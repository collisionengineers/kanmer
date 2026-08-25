---
kind: review-attestation
pr: "265"
head_sha: "a34b453172e41257f951284618845367444aebf3"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "9af7da453bc2b0c7"
ticket_updated: "2026-08-25T06:59:40.477Z"
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
    disposition: fixed
  - id: F-004
    severity: major
    summary: "Previously persisted non-alphanumeric default names remain unloadable"
    disposition: open
---
# Independent re-review — GUI-139 / PR #265

## Scope and evidence

Reviewed exact PR head a34b453172e41257f951284618845367444aebf3 against the full GUI-139 packet, FRD-025, and HZN-007 context. Exact-head local evidence passed: focused openaiTunnel tests (14/14), all-workspace typecheck, and git diff --check against base 700ae9c46904cd5417abe81dd3b256f6d33000d0. Hosted checks remained in progress at the final gather.

## Finding dispositions

- **F-001 — major, fixed:** Incomplete structural profiles are now admitted only when they match the product-owned default configuration.
- **F-002 — major, fixed:** Product-written diagnostics are narrowly validated and incomplete profiles cannot run Doctor or Initialize to mutate or persist state.
- **F-003 — major, fixed:** Newly generated defaults prefix a non-alphanumeric basename and the /tmp/.kanmer register/restart regression proves the generated name reloads.
- **F-004 — major, open:** The old product code persisted profileName .kanmer (and analogous leading _/-/replacement names) before this PR changed defaultProfile to kanmer-.kanmer. Those existing incomplete profiles are the ticket's persisted data, but current normalizeProfile compares them only to the new default and still applies the leading-alphanumeric validator, so upgrading does not load them and the settings surface remains unavailable. The new test registers after the generator change; it does not exercise the already-persisted legacy default. Recognize the exact prior product-generated default as a bounded legacy incomplete state and normalize/migrate it safely to a valid default name (or otherwise provide an equivalent recovery path), with a persisted legacy fixture followed by restart. Do not broaden acceptance to arbitrary unsafe/partial values.

No merge is authorized while F-004 remains open. The earlier F-002/F-003 GitHub threads are dispositioned fixed by this assessment, but no thread-resolution mutation was made while a new blocking finding remains. This attestation makes no post-merge, release, or proof claim.
