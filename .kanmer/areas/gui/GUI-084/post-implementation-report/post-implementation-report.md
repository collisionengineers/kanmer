# Post-implementation report — GUI-084

## Disposition

This is a merged-main reconciliation of the notification wording defect and native styling request. No source change is needed in this ticket: the shared path-classifier fix is already present on current main, and native notification chrome is owned by Windows/macOS rather than Electron.

## Governing document and decision

- FRD-018 R3 requires native OS notifications while the window is unfocused, with click-to-focus/reveal and correct AppUserModelId.
- Retain the cross-platform native Notification route. Do not replace it with an in-app toast and do not add a Windows-only toastXml template in this narrow ticket.
- The operating system owns native notification background/theme. A visual match cannot be promised portably; this limitation is explicit rather than a fabricated styling pass.

## Merged-main evidence

- Current main: d9379d32.
- Existing functional fix: commit 360392777d41e453dcd2edbaa9ee251dab38bce1, where toastKey delegates to classifyKanmerPath and document paths resolve to their owning ticket.
- flushToasts on current main resolves the ticket, renders ticket id plus stageName with the item title as body, and keeps the existing click handler that sends the reveal event.
- Existing classifier tests cover v1/v2 ticket paths, document and scratch paths, malformed child paths, and unrelated activity paths.

## Verification

- Focused classifier test: exit 0 — 7/7 tests passed.
- Full GUI suite: exit 0 — 37 files / 338 tests passed.
- GUI typecheck: exit 0.
- GUI production build: exit 0.
- git diff --check: exit 0; the audit worktree is clean at d9379d32.
- npm run verify: exit 1 at plugin:check after build, core 256/256, GUI 338/338, HTTP 61/61, scripts 75/75, all-workspace typecheck, MCP smoke 184/184, protocol 42/42, discovery 13/13, skills and managed-block checks passed. plugin:check refused because @kanmer/core resolved to the main checkout instead of this linked worktree; no source failure is claimed and the exact refusal is retained.

## Limitations and handoff

No interactive Windows/macOS native-toast capture was available, so no visual styling pass is claimed. No new PR was opened because this is board/document reconciliation only; existing merged code remains authoritative. Independent root review is required before any verifying/done move. Proof and closeout remain post-review work.
