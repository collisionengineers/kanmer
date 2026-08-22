# GUI-116 plan

## Governing documents

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`
- `docs/functional/frd/FRD-012-connect.md`
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`

## Scope

Implement only closed-project reopen reconciliation for provider-owned registrations and explicit native reconnect state after branch changes. Do not alter provider ownership, protected-branch policy, or native install semantics.

## Steps

1. Add durable settings/status representation for pending native Grok/Antigravity reconnects, scoped by project and provider.
2. In `openProject`, after `ensureBoardWorktree`, reconcile Codex/Claude/OpenCode through `reconcileProviderRegistration`; preserve and surface failures.
3. Mark native providers pending when the reopened branch differs from the saved branch state; clear only the matching provider after successful explicit Connect.
4. Render concise Settings guidance that names the provider and the required reconnect action.
5. Add deterministic production-caller regressions for reopen order, provider failure/error surfacing, native persistence/clear, and unrelated-project isolation.
6. Run focused GUI tests, GUI/core typechecks, scripts/docs/diff rails as practical; record exact exits and inherited failures.
7. Write the post-implementation report and leave the post-merge proof unchecked; commit and open a PR against `core-043-protection-retarget`.

## Non-goals

- Automatic Grok/Antigravity CLI/plugin installation.
- Claiming live credentials, hosted tunnel, or native functional proof.
- Changes to unrelated providers, project registration files, or protected branch behavior.
