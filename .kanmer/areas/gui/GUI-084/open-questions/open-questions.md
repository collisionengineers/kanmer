# Open questions — GUI-084

- [x] **Which styling contract should Kanmer adopt?** Resolved 2026-08-21: retain cross-platform native notifications and accept OS-controlled chrome. Electron cannot portably theme native OS notification background. Choose one:
  - **Recommended:** retain cross-platform native notifications and accept OS-controlled chrome; close this ticket as already functionally resolved by the shared path classifier.
  - **Windows custom:** add a Windows-only `toastXml` design; macOS remains system-native. This adds platform-specific template and accessibility/click coverage.


## Resolution — 2026-08-21

- Retain Electron native `Notification` for unfocused agent changes on Windows and macOS, as required by FRD-018 R3.
- The shared `classifyKanmerPath` route already attributes document and scratch changes to the owning ticket, so `flushToasts` emits the ticket id and normal title casing, preserves click-to-reveal, and keeps own-write suppression.
- Native notification chrome remains owned by the operating system. A Windows-only `toastXml` design is not selected because it would add platform-specific template, accessibility, click, and packaged-runtime coverage beyond this narrow fix; macOS would remain system-native.
- Replacing native unfocused notifications with in-app toasts remains explicitly parked because it conflicts with FRD-018 R3.

## Parked (explicitly deferred)

- Replacing unfocused native notifications with an in-app toast is not proposed because it conflicts with FRD-018 R3 without a governing-doc change.
