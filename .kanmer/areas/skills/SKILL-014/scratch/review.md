# Review — SKILL-014 (PR #34)

**Author and reviewer are the same agent.** This is not an independent review and
should not be read as one. It is recorded because the alternative — no review at
all — is worse, and because the finding below is real.

## 1. Changes

18 files, +237 −42, prose only; no `packages/` source, so the shipped MCP bundle
is untouched and `plugin:build` is not implied.

- **Twelve `SKILL.md`** — an ordered workflow and a closing hand-off in each.
  Four skills (`setup`, `auto`, `groom`, `closeout`) already used numbered `## N.`
  headings as their structure and correctly gained only the ending.
- **`scripts/agents-block.mjs` + `kanmer-setup/SKILL.md`** — one roster line
  becomes two: the pipeline order, and "each skill ends by naming what comes
  next". Byte-identical in both copies; `AGENTS.md` regenerated from the script.
- **`tool-reference.md`** — the six stale prose passages. Tool table untouched.
- **Three asset files** — `impact` → `files`.
- **`kanmer-review` / `kanmer-auto`** — the false gate claims corrected;
  `get_doc_gates` added to review's Gather.

## 2. Comments

**BLOCKING — the folder diagram was wrong, twice.** In the new `## Item types`
diagram in `tool-reference.md`:

- `post-implementation-report/…` — an ellipsis where every sibling shows a real
  filename. The actual file is
  `post-implementation-report/post-implementation-report.md`.
- `scratch-notes.md` shown as a **file at the ticket root**. It is not. Scratch is
  a folder like every other document type — `scratch/notes.md`,
  `scratch/review.md` — verified against `SKILL-012/scratch/execute.md` and
  `GUI-064/scratch/`.

This is precisely the defect class the ticket exists to remove: a reference
document confidently describing a layout that is not on disk. It was introduced
*by the fix*, which is the uncomfortable part and the reason it is written down
rather than quietly patched.

Root cause: the diagram was written from the doc-type list in `profiles.ts`
rather than from `ls` of a real ticket folder. The rest of the sweep was checked
against the code; this one paragraph was not.

**NON-BLOCKING — the `list_items` field paragraph now wraps awkwardly**
(`order` … `blocked` split mid-sentence). Pre-existing shape, made slightly worse
by inserting two fields. Not worth a reflow that would obscure the diff.

**NON-BLOCKING — the verification script is not committed.** It lives in the
scratchpad, so the seven checks are reproducible only by hand. Deliberate:
whether the rail should own it belongs to [[CORE-025]], not to a prose ticket.

## 3. Disposition

- Folder diagram — **fixed in PR**. Both lines corrected, plus a new note that
  scratch's doc id (`scratch-review`) and path (`scratch/review.md`) differ,
  which is the one place in the layout where they do. Verified against two real
  ticket folders this time, not against the type list.
- Field-list wrap — **won't do.** Cosmetic; a reflow costs diff legibility.
- Uncommitted script — **filed already** as part of [[CORE-025]]'s scope, and
  named in the report and `open-questions` rather than left implicit.

## 4. Verdict

**Pass, after the in-PR fix.**

Checked: the report against the diff (every claim matches — the "tool table
untouched" claim was verified by diffing the extracted `| \`tool\`` set against
`main`, which is identical); the plan's Governing-docs section against the change
(FRD-023 R1 re-measured *after* the edits and net-improved, 8 boundary mentions
down to 5, none a per-profile requirement list; R3 honoured, with the two
reference skills changing by one word and five lines as the plan predicted); and
the two corrected claims against [[SKILL-012]]'s measured per-profile table.

The one thing I cannot check is the thing an independent reviewer would be for:
whether the twelve endings actually read well to someone who did not write them.
