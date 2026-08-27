# Open questions — CORE-124

None blocking. Scope decisions taken under the operator's delegation of routine scope calls (auto run 20260827T133106Z-claude-code), recorded so the plan does not silently assume them.

- **Record shape: on-member fields, not a `.kanmer/batches/` folder.** `lease_batch` + `lease_batch_frozen_at` on each member (passthrough-safe for v0.3.12, written only under the lease lock). A separate record file would need its own lock/CAS and a directory the installed server never expected.
- **Declaration is the first take.** `take_ticket batch: <id>, batch_members: [...]` both declares and freezes membership in one locked write set; there is no pre-take "open batch" state to manage or leak.
- **Terminal = `status === "done"` or `archived === true`**, matching kanmer-closeout's two accepted terminal shapes.
- **Cleanup gate lives on `release`** (`BATCH_ACTIVE` while another member is non-terminal) plus a closeout skill sentence; git worktree removal itself is skill-side.
- **No new tool**; roster stays 39.

## Parked (explicitly deferred)

- [ ] Whether `transfer` of one batch member should reclaim the whole batch (one controller owns the batch) — today each member's lease transfers on its own; SKILL-036 decides.
- [ ] GUI batch badge — after GUI-144.
