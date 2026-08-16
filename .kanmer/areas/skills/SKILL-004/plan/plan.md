# Plan

## One loop, not three modes

Replace the mode table with a reconcile sequence every run performs in order:

1. **Orient** — `get_status`. Report format and counts before doing anything.
2. **Version steps** — apply anything the installed Kanmer requires. This is why
   the run repeats; "run setup after updating Kanmer" is the standing rule.
3. **Migrate if needed** — `migrate_board dry_run: true`, show the preview,
   then apply. Safe to call unconditionally: an already-current board reports
   nothing to do (CORE-012).
4. **AGENTS block** — refresh via `scripts/agents-block.mjs`, or by hand from the
   fenced copy when the repo is not checked out.
5. **Ingest** — whatever exists that the board does not know about.
6. **Report** — what changed, what was skipped, what is owed.

Greenfield does not disappear; it becomes the branch taken at step 5 when there
is nothing to ingest and no board yet. The brief interview is kept verbatim —
it is the one part that works.

## Ingest, in priority order

**GitHub issues** if the repo has them. **Plan documents** if not. **Commit
history** if neither.

Not all three in one run: each is a different answer to "what is the record of
intent here", and mining commits on a repo that has issues produces duplicates
of the same work.

## Closing issues

The single hardest rule in this skill, so it is stated as a sequence with no
discretion:

1. list every issue that will be closed, by number and title;
2. wait for explicit confirmation;
3. close, each with a `migrated to Kanmer (<ID>)` comment;
4. report what was closed.

No "if unsure, ask". It changes state outside the repo, for other people, and it
is irreversible without manual work.

## Idempotency

Before creating a ticket from any source, search for its marker. `refs` cannot
carry a URL — `assertRefs` requires repo-relative paths that exist — so the
marker goes in the body as a stable line (`Source: <url>`), found with
`search_items`. Present → skip and say so.

This is what makes the loop re-runnable, which is the whole premise.

## Historical tickets

One per plan **item**, not per document — the items seed areas and become the
template for future tickets. Created directly in Done with profile `custom` and
an empty requires-map: they have no research or checklist and never will, and
`custom` empty is the only profile that asks for nothing. Plan content lands in
`plan/`, verification content in `proof/`.

Creation is ungated, so this needs no gate exemption and is unaffected by
CORE-011's one-boundary rule, which applies to `move_item`.

## Removed

Stage proposals. Stages are fixed in format 3; the greenfield preview proposes
**areas and profiles** instead.
