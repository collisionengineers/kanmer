## GUI-084 merged-main reconciliation — 2026-08-21

Decision: retain cross-platform native Notification per FRD-018 R3; OS-owned native chrome cannot be portably themed, so no Windows toastXml or in-app replacement was added. Current main d9379d32 includes classifier fix 36039277, ticket-id/stage title/body and click-to-reveal. Focused classifier 7/7, full GUI 338/338, GUI typecheck/build, and diff-check passed. npm run verify reached all tests/smokes/typechecks and exited 1 only at plugin:check because the linked worktree resolved @kanmer/core from the main checkout. No interactive native-toast capture or visual pass is claimed; independent root review remains required.

# Independent review — GUI-084

## Changes

- This is a board/document reconciliation; no source or PR change is proposed. The merged classifier already maps format-3 document/scratch events to the owning ticket, and flushToasts already uses ticket id/stage/title wording.
- The report and open-question resolution match FRD-018 R3: retain native unfocused OS notifications, explicitly accept OS-owned chrome, and do not introduce Windows-only toastXml or an in-app replacement.

## Comments and dispositions

- Blocking: none.
- Non-blocking: native visual capture is unavailable; no visual pass is claimed. The prior linked-worktree plugin:check refusal is an environment limitation and not a source failure; the focused classifier test passed on current main.

## Verdict

PASS. Focused classifier test passed 7/7 on current main; packet, governing FRD, limitations, and merged commit 360392777d41e453dcd2edbaa9ee251dab38bce1 were reread. This reconciliation is ready for verification.
