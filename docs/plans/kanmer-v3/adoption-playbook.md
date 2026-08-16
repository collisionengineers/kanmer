
# Adoption playbook — bringing any repo onto Kanmer v3

Repo-agnostic. Works for a repo already on an older Kanmer board **and** for a repo that has never seen Kanmer (steps 2–3 simply find nothing to do). An agent or a human can drive it; every destructive or bulk step previews first.

## Steps

1. **Update the app** (or install it), then open the project.
2. **Migrate the board** — the format-3 prompt appears for any older board: review the dry-run (status alias counts, any `needs-restage` list, folder moves, priority strip, profile assignments), then apply. Declining leaves the board readable until you're ready.
3. **Convert label conventions** — run kanmer-groom's label→group operation if the board used labels for epics/horizons/state: preview the proposed mapping (capability-style labels → `epic` groups; now/next-style labels → `horizon` groups; `blocked` labels → real `blocks:` edges), then apply. Re-running proposes nothing.
4. **Reconcile** — run kanmer-setup: refreshes the AGENTS block, applies any version steps, ingests what isn't Kanmer (GitHub issues → tickets with the confirm-then-close flow; plan/markdown docs → per-item done tickets seeding areas; commit history as the fallback). Idempotent.
5. **Verify** — the backlog table loads and sorts; a `NOW` horizon filter narrows every view; gates are live (create a `chore`, jump it to Implementing in one move; create a `feature`, confirm it can't leave Backlog without a governing doc); open one group's detail view and see derived members.

## Notes

- codex hosts: the project folder must be **trusted** for the project-scoped registration to load (Connect says so too).
- Non-Git folders: everything works; the Git-sync tab reports unavailable.
- Nothing in this playbook is project-specific. If a step here ever names a particular repo, that's a bug in the playbook.
