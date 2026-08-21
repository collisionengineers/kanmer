# Checklist — GUI-084

- [x] Trace document-change identity to the shared path classifier.
- [x] Establish Electron’s native-notification styling constraints.
- [x] Resolve the styling contract: retain cross-platform native notifications and accept OS-controlled chrome; Windows-only toastXml is not selected.
- [x] Execute the selected native path by reconciling merged-main code/tests: classifyKanmerPath attributes doc events, flushToasts uses ticket-id/title wording, and the existing click handler reveals the item; no new code is required.
- [x] Verify the selected surface contract on merged main: Electron native Notification remains the cross-platform unfocused surface and OS-owned chrome cannot be themed portably; no unsupported visual pass is claimed.
- [x] Record the implementation report, proof, and closeout; the implementation is merged-main evidence reconciliation with native OS chrome limitation explicitly accepted.

## Progress notes

- 2026-08-21: Resolved the styling contract in favor of cross-platform native notifications. The functional identity/casing/click defect is already fixed by the shared path classifier; OS-owned native chrome is explicitly accepted, and Windows-only toastXml is not selected. Implementation report is the next Review gate; proof and closeout remain post-review work.
