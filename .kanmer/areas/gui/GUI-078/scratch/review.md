# Review — GUI-078 (PR #35)

**Author and reviewer are the same agent.** Not an independent review; recorded
because the alternative is none.

## 1. Changes

Two files, +276 −65, all in `packages/ui/src`. Seed data ported to format 3; the
three reshaped payloads corrected; twelve absent `ProjectClient` methods
implemented as in-memory fakes; `addColumn`'s unreachable branches deleted;
`getGateStatus` stops guessing; core's constants mirrored locally with a comment
explaining why.

## 2. Comments

**NON-BLOCKING — the demo is not observed to render, and the report says so.**
The ticket's last verification box asks for it. `packages/ui` has no test harness
and no story runner, so there is nothing to run it in. The report states the box
is unmet rather than reinterpreting it, which is the correct handling — but the
box stays unticked and that should be visible on the board, not only in prose.

**NON-BLOCKING — `getDocsInfo.counts` returns 1-or-0 per type**, not a real
recursive count. Honest for the data shape: the demo stores one string per doc
type, so there is nothing multi-file to count. A consumer exercising format 3's
"a type may hold several files" gets nothing useful from the demo. Called out in
the report rather than hidden behind a plausible-looking number.

**NON-BLOCKING — the mirrored constants are a known regression against the
plan.** The plan argued for importing; the build proved importing impossible.
[[CORE-027]] carries the real fix and names [[SKILL-013]] as the change that will
break the copy, so the debt has an expiry date rather than being open-ended.
Accepting it here rather than blocking: the alternative is a package that does
not build.

**Checked and clean:** no `as any` or `as unknown as` introduced — the one match
is the pre-existing `window` bridge cast at the bottom of the file. Every payload
shape was read from `types.ts` / `ipc.ts` rather than guessed. `dist/` was built,
inspected, and removed; it is gitignored and not in the diff.

## 3. Disposition

- Render evidence — **won't do here.** Needs a harness, which is parked in
  `open-questions` and is its own work.
- `counts` fidelity — **won't do.** Fabricating multi-file counts against
  single-string data would be the "compiles and lies" failure this ticket exists
  to remove.
- Mirrored constants — **filed** as [[CORE-027]], with the mechanism, the
  measured error output, and the expiry date.

## 4. Verdict

**Pass.**

Checked: the report against the diff — every claim matches, including the
baseline claim (`npx tsup` on unmodified `main` reports 0 errors, so the
resolution failure was introduced by the import change and not inherited).
Governing docs — `docs_todo: true` is right; this is conformance to ADR-0002,
ADR-0006, FRD-001, FRD-002 and FRD-003, none of them modified. The code — the
twelve new methods were read against `client.ts:38-87` member by member, and the
group fake derives membership from tickets rather than storing it, which is the
model FRD-001 actually specifies.

The thing a reviewer should be most suspicious of is the plan reversal, and it is
the thing most fully documented: the error output is quoted, the mechanism named,
the mitigation bounded, and a ticket filed. That is the right shape for a
discovery that invalidates your own plan mid-flight.
