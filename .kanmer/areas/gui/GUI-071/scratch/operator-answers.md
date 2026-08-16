## OPERATOR ANSWER — 2026-08-16

**Q2 — do tab counts respond to the active search/filters?
ANSWERED: NO. A tab's count ignores filters. The tab describes the tab.**

The operator's reasoning, as selected: a tab badge says how much lives in that
view; a filter is a temporary lens. So with a filter active the Board tab may read
131 while the columns beneath it sum to 6 — and that is correct, not a bug.

**Two things follow, and both are required work:**

1. **Document the difference deliberately.** The Board's per-column counts DO
   respond to filters (`Board.tsx:145-150`). Two numbers in the same header area
   answering different questions will read as a defect to the next person unless
   the FRD says why. `docs/functional/frd/FRD-019-gui-shell.md` R5 lists the views
   and is currently **silent on badges** — that silence is what made this
   ambiguous. Write the meaning there: tab badge = everything in that view;
   column count = what matches the current filter.

2. **The verification criterion is now writable.** "The count equals the number of
   rows the view shows" was ambiguous under an active filter, which is why the
   test could not be written. It now means: equals the rows the view shows **with
   no filter applied**.

**Earlier operator decision, still binding, do not re-open:** the Board count
means **all non-archived tickets**, not "not-done". Board 131, Backlog 24. Board's
number was already correct; only Backlog's was wrong, by a factor of ~5.

**The bug itself:** `App.tsx:1067-1073` — `v` appears only in the `archived` test,
so every other tab renders the identical board-wide expression. A missing branch,
not a drifted filter.

**Do not "just reuse `allViewItems`".** Research found the rule duplicated four
times (`App.tsx:956-962`, `:1069-1071`, `:1152`, `:1186`) and **`allViewItems` is
itself wrong for Backlog** — it returns all non-archived tickets and the
`status === "backlog"` restriction is applied downstream of `applyFilters`. Reusing
it would not have fixed the count.

**Watch the empty states** (`App.tsx:1241-1263`) — the same bug means a
zero-backlog board showed no empty state in the Backlog view. Likely regression
site when the predicate is corrected.

**Archived counting non-tickets is correct** — the Archived view renders them.
Preserve that asymmetry with Board rather than "fixing" it.

**Extract the predicate into `lib/`** (matching `lib/board.ts`'s pattern). There
are no component tests in `apps/gui` — no vitest config, no jsdom, no
testing-library — so a `(view, items)` function in `lib/` is the only way the
criterion is assertable. Do not add a DOM environment.

**Sequence: GUI-069 → GUI-070 → GUI-071. You are last.**
When GUI-070 merges it will have **struck your first verification criterion**
(the Backlog tab count) because it deletes that view. `View` becomes
`ticket | standup | archived` — write **no `backlog` case**. Every line number in
your research docs will have moved; your `files` doc already says "re-locate
before editing". Do that.
