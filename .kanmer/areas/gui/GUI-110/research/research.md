# Research — GUI-110: browser demo dispatch settings fixture

## Question
Why does the browser demo's in-memory settings bridge fail the hosted GUI-075 typecheck, and what is the smallest browser-safe fixture correction that satisfies the new AppSettings contract without changing provider dispatch behavior?

## Findings

- `packages/ui/src/demo.tsx` creates the `settings` object returned by its demo `KanmerApi` bridge and spreads that object through `getSettings`, `setTheme`, `setNotifications`, `setPreferences`, and `setKanmerGitPreferences`.
- GUI-075 extends the shared `AppSettings` contract with a required `dispatch` section. Its browser-demo worktree currently has the one-line intended shape, `dispatch: { providers: {} }`, immediately after `gitSyncMinutes`.
  - The empty provider map is browser-demo-safe: the demo does not launch provider CLIs, and it does not invent provider behavior or model values.
- Hosted PR #142 run 32545348530 completed the GUI (355/355), MCP HTTP (61/61), and scripts (80/80) rails, then failed at the authoritative root `npm run typecheck` in `@kanmer/ui`.
  - The exact error is `packages/ui/src/demo.tsx(726,5): error TS2322`: the `getSettings` return and each settings mutator return are not assignable to `AppSettings` because `Property 'dispatch' is missing`.
  - The run concluded failure at `2026-08-22T02:08:35Z`; the ticket records the hosted path as `D:\a\kanmer\kanmer\packages\ui`.
- The GUI-075 implementation changes the type contract and behavior; GUI-110 only supplies the missing fixture field so the existing bridge returns a complete AppSettings shape. No provider registry, settings persistence, dispatch execution, or UI behavior belongs in this ticket.

## Implications

Add exactly one field to the demo settings literal: `dispatch: { providers: {} }`. Because all bridge methods return the same object or spreads of it, this fixes every reported type error without duplicating provider settings or altering dispatch behavior. The remediation should be stacked after GUI-075's contract change; its standalone branch may be based on current `main` and carries only the fixture line.

## Open questions

- None. The ticket explicitly defines the required shape and the hosted compiler evidence identifies the missing field.
