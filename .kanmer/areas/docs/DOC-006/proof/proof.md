# Proof

PR [#27](https://github.com/collisionengineers/kanmer/pull/27), merged
(`6d1f4d1`). Verified on the merged base. Documentation only.

| Check | Result |
|---|---|
| `grep -c "Open design question"` | **0** — the question is closed |
| The sequence-vs-causation paragraph | present, `FRD-002:39` |
| Numbered rules intact | G1, G2, G2a, G2b, G3, G4, G5 |
| `verify:agents-block` | 26/26 — AGENTS.md next door, untouched |
| Diff size | 1 file, +11 −1 |

## What replaced it

Three things a reader now gets instead of an invitation to build:

1. **Why the timestamp rule has nothing to compare** — no write time recorded,
   board commits batched per sync, no mtimes in git.
2. **Why the branch check is aimed wrong** — it sees only the ticket's own
   branch, so main-checkout work before the branch exists is invisible. Recorded
   with the concrete evidence that this is not hypothetical: it is how this
   repository's own tickets went wrong while adopting v3.
3. **That gates prove sequence, not causation.** The point the section never
   made.

The measured 147 is kept deliberately. The naive `rev-list --count <branch>`
looks correct and is not, and a reader who sees the number will not try it.

## Not proven

**Nobody has read it cold.** The test of this paragraph is whether the next
person to wonder "why doesn't the gate catch code-then-plan" comes away without
trying either approach. That cannot be verified by the person who wrote it.

**The parked ticket is the only home for the full measurement.** [[CORE-021]] is
archived; its research carries the seven-scenario table and the call-graph
findings. If someone reads the FRD and wants the detail, they have to know the
ticket exists — the FRD points at "the parked ticket" by description, not by id.
