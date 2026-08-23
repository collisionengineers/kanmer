# Plan

1. Trace `restoreTabs`, `openProject`, and the existing renderer advisory/log mechanisms; choose the smallest user-visible surface consistent with current patterns.
2. Refactor the restore loop so each failure is reported while later tabs continue, without changing session persistence semantics.
3. Add a focused regression test for one failed background restore plus one successful restore, asserting the advisory/log call and surviving tab.
4. Run focused GUI tests, full GUI tests/typecheck as practical, and the relevant build rail; inspect the diff and write the post-implementation report before Review.

## Risks and rollback

- Avoid exposing local paths or project contents in a toast/log. Use the existing safe project label or a generic failure message.
- Do not turn a recoverable background-tab failure into a startup-blocking modal.
- Rollback is a single renderer/test revert.
