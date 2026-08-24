## 2026-08-24 — hosted status

PR #242 head 3921d90f passed `kanmer-gate` (56s) and authoritative `verify` (4m19s). The automated Codex review is COMMENTED with no actionable suggestion, not an APPROVED review. GitHub reports `mergeStateStatus: BLOCKED` and no formal review decision. Per the ticket stop condition and protected-main rule, the author will not self-approve or merge; a different GitHub identity must supply the formal approval.

## 2026-08-24 — independent review of PR #242

### Reviewer identity and boundary

This review was performed by an agent other than the authoring agent and did not modify the PR. The current GitHub credential resolves to `collisionengineers`, which is also the PR author, so it cannot supply a formal independent GitHub approval or author-safe merge.

### Changes reviewed

- `apps/gui/release-notes.md` is the sole changed path (17 additions, 1 deletion) at head `3921d90f4a613d4a6b2037dc5833df5cdad6a8a6`.
- It promotes the accumulated top section to `0.3.4`, retains the four already-recorded post-v0.3.3 user-facing changes, adds bounded summaries for project-declared sources and Windows connection/remote-access resilience, and starts the existing shipped material under `0.3.3`.
- No release script, manifest, generated artifact, workflow, provider setting, tag, or publishing behavior is changed.

### Checks against plan and governing evidence

- The diff exactly matches the plan and files map. The post-implementation report accurately lists the one file, commit, PR, focused test, and diff check.
- The source-preference wording agrees with `FRD-027` and `ADR-0020`: declarations are retrieval preferences and never install software, authenticate, enable, or grant access.
- The Windows wording is supported by the post-v0.3.3 transient settings-rename-lock fixes and cloudflared origin-path/readiness fixes; it does not claim public-route verification or provider automation.
- All open questions are resolved or explicitly parked for CORE-096. No unintended scope or unplanned extra was found.

### Hosted evidence

- `verify`: SUCCESS on the exact head.
- `kanmer-gate`: SUCCESS on the exact head.
- PR is OPEN with `mergeStateStatus: BLOCKED`; GitHub lists no APPROVED review (only the automated COMMENTED review). Branch-protection status checks are satisfied.

### Comments and disposition

- **Blocking — workflow:** a formal independent GitHub approval and merge eligibility are still absent. This is an external protected-flow condition, not a defect in the change; no remediation ticket is appropriate.
- **Non-blocking:** none.

### Verdict

Substantive review **passes**. Do not author-self-approve or author-self-merge. Await a different GitHub identity to formally approve and merge PR #242; after the merge, record the merge SHA and move DOC-021 from Review to Verifying only.
