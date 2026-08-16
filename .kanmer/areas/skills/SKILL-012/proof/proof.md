# Proof — SKILL-012

PR [#33](https://github.com/collisionengineers/kanmer/pull/33), merged
`2026-08-16T17:35:56Z` as **`e002498`**. Commits `74a7240` (the gate) and
`6eadb04` (resolve-time injection). ADR-0011 landed first as `c7ba074` (PR #30).

Everything below was run on merged `main`, not on the branch.

## The gate works, demonstrated against real data

Fixture is a **copy** of this board, subject [[GUI-064]] — chosen because its
`open-questions/` is a real document with a real `Parked` section, which is the
shape the feature exists for. A copy, because a demonstration must not park a
live ticket.

```
as it stands, all 4 ticked:   leave-preparing=OK       enter-review=OK       enter-done=OK
one question re-opened:       leave-preparing=BLOCKED  enter-review=BLOCKED  enter-done=BLOCKED
same question, parked:        leave-preparing=OK       enter-review=OK       enter-done=OK

GUI-064 cannot move from "preparing" to "implementing": leaving Preparing requires
questions-resolved (profile "feature"). Write the missing document(s) with
set_ticket_doc. "questions-resolved" is not a document: open-questions/ still has
unticked "- [ ]" lines. Answer them and tick the box, or move them under
"## Parked (explicitly deferred)" with a reason for deferring, then move.
Call get_doc_gates for the full picture.

Control — GUI-069 has no open-questions document: not blocked
```

`command-log`. Four claims in one run, each falsifiable:

1. One unticked box blocks **all three** boundaries.
2. Ticking it clears them.
3. **Parking clears them too** — so the escape is real, not theoretical.
4. A ticket that raised no questions is untouched. `leave-backlog` never appears,
   because it is deliberately not gated.

The refusal names what `questions-resolved` is *not* (a document) and both ways
out, which was the point of putting the advice in the refusal rather than in the
report's `warnings` channel.

## The shipped artifact carries both features

```
$ npm run plugin:check
plugin-sync OK — 29 tools match, bundle bytes match
$ grep -c questions-resolved plugins/kanmer/mcp/kanmer-mcp.cjs
1
$ grep -c 'filter.group'      plugins/kanmer/mcp/kanmer-mcp.cjs
1
```

Read from the committed bundle rather than a fresh build, deliberately:
[[SKILL-011]] shipped a bundle that did **not** contain its feature while every
other signal reported green. That is now checked, not assumed. The bundle here
was built at the repo root; [[MCP-007]] is the mechanical fix.

## Rail, on merged `main` (`e002498`)

```
npm test                            core 182 passed (8 files)   ← was 159
                                    gui  202 passed (21 files)  ← was 201
npm run plugin:check                29 tools match, bundle bytes match
npm run smoke:protocol              26/26 checks passed
npm run verify:agents-block         26/26 checks passed
npm run typecheck -w @kanmer/gui    clean
npm run check:manual                up to date (12 chapters)
```

24 of those tests are new: the parser (case, bullet style, parked cutoff, several
files, absent document, prose without boxes), the exact-string test on
`## Parked` that ADR-0011 demanded, the gate at each boundary and on each
profile, the `blockedBy` message, the no-warning rule, and the resolve-time
injection including its two limits.

## Two defects found by this demonstration, not by the tests

Both existed with a fully green suite. Recording them because they are the
argument for demonstrating against real data at all.

1. **"Existing boards inherit" was false.** `resolveProfiles` is
   `board.profiles ?? DEFAULT_PROFILES`, and every board written by setup or
   migration carries its own `profiles:` block — so editing `DEFAULT_PROFILES`
   reached new boards only, while ADR-0011 and the release note both said
   otherwise. Escalated rather than guessed; the operator chose resolve-time
   injection.
2. **The first injection gated `leave-backlog`** — backwards, since questions are
   raised during research and this trapped tickets outside the stage where they
   get worked. It also had to be stopped from adding boundaries a profile never
   declared, or `spike`'s Backlog → Done jump would go from one gated boundary to
   three and be refused.

## What this run does NOT prove

- **No ticket has yet been stopped by this gate in ordinary use.** The refusal is
  demonstrated on a fixture; the first real interruption is the honest test, and
  it has not happened.
- **The skill prose is untested**, as skill prose always is. The `kanmer-review`
  rule — do not apply fixes while questions are open — is **unenforceable by
  construction**, since review fixes cross no boundary. It will hold exactly as
  well as the skill is followed, and nothing will report when it is not.
- **ADR-0011 does not yet record the two limits above.** They belong in it; the
  merged ADR was left stable rather than amended mid-flight.
- **The one real gap is at *review*, not at Done.** An earlier draft of this
  document called the `fix`/`chore` coverage "a narrower guarantee"; that was
  wrong, and the operator caught it. Measured on all four profiles, with an
  unticked question and every other document present:

  ```
  fix      implementing -> review   ALLOWED
  fix      review       -> done     REFUSED: entering Done requires questions-resolved
  chore    implementing -> review   ALLOWED
  chore    review       -> done     REFUSED: entering Done requires questions-resolved
  feature  implementing -> review   REFUSED: entering Review requires questions-resolved
  spike    implementing -> review   ALLOWED
  spike    review       -> done     REFUSED: entering Done requires questions-resolved
  ```

  `enter-done` carries the requirement on **every** profile, so **nothing reaches
  Done with an open question** — the headline guarantee holds without exception.
  What differs is only *when* the stop lands: `fix`, `chore` and `spike` may sit
  **in Review** with a question open, where `feature` cannot enter Review at all.

  That residue is genuine but small, and worth naming precisely: Review owns the
  merge point, so on those three profiles a **PR can be merged** while a question
  is unanswered. The ticket still cannot close — but the code ships first. Only
  the `kanmer-review` prose convention covers that window, and prose is
  unenforceable, which is the honest description of the exposure.

---

**Merged:** PR [#33](https://github.com/collisionengineers/kanmer/pull/33) —
`MERGED` 2026-08-16T17:35:56Z, merge commit `e002498`. Governed by ADR-0011
(`c7ba074`), FRD-009 R5 and FRD-002 P4a, both amended here.
