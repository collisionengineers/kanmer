# Research — GUI-128

## Question

Why does the focused sync integration test exit non-zero after all assertions pass?

## Findings

1. `apps/gui/src/main/index.sync.test.ts` supplies an Electron mock with an empty `Notification` class.
2. The production toast flush path calls the static Electron API `Notification.isSupported()` before instantiating a notification.
3. During the focused test, delayed toast callbacks reached that path after test assertions. The empty mock caused two unhandled `TypeError` rejections; Vitest correctly turned them into exit code 1 despite 11/11 assertions passing.
4. The test is exercising sync/branch handoff behavior, not notification delivery. A static `isSupported()` implementation returning `false` accurately models notifications being unavailable in the test environment and prevents constructor-side effects.

## Implication

Add only that static mock method, preserve production code, and verify that the focused suite exits zero with no unhandled errors. The broader full-suite settings atomic-write failure is separate.

## Sources

- `apps/gui/src/main/index.sync.test.ts` Electron mock.
- `apps/gui/src/main/index.ts` toast flush guard.
- GUI-127 controlled focused run: 11/11 assertions, process exit 1 due only to the two missing-mock rejections.
