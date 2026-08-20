# Open questions — GUI-084

- [ ] **Which styling contract should Kanmer adopt?** Electron cannot portably theme native OS notification background. Choose one:
  - **Recommended:** retain cross-platform native notifications and accept OS-controlled chrome; close this ticket as already functionally resolved by the shared path classifier.
  - **Windows custom:** add a Windows-only `toastXml` design; macOS remains system-native. This adds platform-specific template and accessibility/click coverage.

## Parked (explicitly deferred)

- Replacing unfocused native notifications with an in-app toast is not proposed because it conflicts with FRD-018 R3 without a governing-doc change.
