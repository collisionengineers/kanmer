## Removed from HZN-003 by the orchestrator — 2026-08-17

Filed into HZN-003 at [[CORE-023]]'s closeout. Moved out, because it contradicts
the decision that created it.

The operator was asked directly whether CORE-023 should ship the GUI surface, and
**chose "MCP only, GUI as a follow-up"** — on the stated grounds that adding IPC +
preload + renderer roughly doubles that ticket. Leaving this ticket inside the
0.3.3 horizon would put the deferred work straight back into the release it was
deferred out of, which makes the deferral meaningless.

Nothing is lost. The ticket keeps its full scope, its link to CORE-023, and its
description of the IPC + renderer work — it simply is not part of 0.3.3. It also
carries a second job worth keeping: inverting the two small lists `staleness.ts`
currently mirrors from `providers.ts`, so provider destinations have one owner.

**When it is picked up, note what CORE-023 shipped underneath it.** `get_status`
now returns `repo: { upToDate, stale: [{ artefact, state, detail, fix }] }` across
five artefact families and four states. The GUI has no MCP client, so that field
does not reach it — the whole point of this ticket. Whoever builds the surface
should render the itemised list, not a boolean: "your repo is stale" without
saying *what* is stale is the failure mode CORE-023 deliberately designed against.

Also inherit its restraint. CORE-023's self-review caught three false positives
before merge, including one that fired on this repo (any repo in a folder named
`kanmer` could have another server's `--root` read as Kanmer's). A GUI banner is
far less forgiving of a false positive than a tool result an agent reads — a
warning a user cannot dismiss or act on trains them to ignore the next one.
