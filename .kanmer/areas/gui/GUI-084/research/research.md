# Research — GUI-084

## Current state

The identity/root-cause portion is already fixed: `toastKey()` delegates to `classifyKanmerPath()`, which returns the owning ticket id for every format-3 document (including `open-questions`, `post-implementation-report`, and scratch) and is covered by renderer tests. `flushToasts()` therefore now resolves the ticket and produces `TICKET-ID — Stage` with the item title as body.

## Native styling constraint

Electron's portable `Notification` constructor exposes title, body, icon, actions, etc., but no background/theme option. The operating system owns native notification chrome. Electron exposes `toastXml` as a Windows-only replacement with full toast-template customization; it supersedes the normal properties. macOS uses UNNotification and does not expose an equivalent app-controlled background.

Current official Electron documentation: [Notification API](https://www.electronjs.org/docs/latest/api/notification).

## Decision needed

The remaining grey-background request has two materially different paths:
1. Keep native notifications cross-platform and accept OS-controlled notification chrome (no product change remains for this ticket's identity bug).
2. Implement a Windows-only custom `toastXml` design while macOS remains native/system-themed, including new template, accessibility, and click-behaviour coverage.

Replacing unfocused native notifications with in-app toasts would contradict FRD-018 R3 and is not recommended without an FRD change.
