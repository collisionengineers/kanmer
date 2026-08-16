A ticket is not just a card with a title. Each one carries a set of documents,
and those documents are the actual work product of thinking about the change —
what you found out, what you decided, and what you can show for it afterwards.

Open a ticket and you will see a row of tabs. The first is **Ticket** — the
fields you would expect, title, stage, area, profile, assignee. The rest are
documents.

## The seven

| Tab | What goes in it |
|---|---|
| `research` | What you **learned**. How the thing works today, where the surprises are, what the options were. |
| `files` | What the change **touches**. The surface area: which files change, which files you need to read first, what ripples out. Not findings — locations. |
| `plan` | The **reasoning**. The approach you chose and why it beat the others, the ordered steps, the risks. |
| `checklist` | The **executable** distillation of the plan. One tickable box per step, each independently checkable. |
| `open-questions` | The things nobody has decided yet. These genuinely block the ticket, which is the point of writing them down. |
| `post-implementation-report` | The author's **claim**, written before the change merges. What was built, what changed, what a reviewer should look at. |
| `proof` | **Evidence**, gathered after the change lands. Not a description of what was built. |

The tabs show a dot when a document exists, so you can see at a glance what a
ticket has. The checklist tab additionally shows how many of its boxes are
ticked.

## The distinctions that matter

Three pairs get confused constantly, and each pair exists because the confusion
is expensive:

- **research vs files.** Research is what you learned; files is where the change
  lands. A files document full of findings is a second research document, and
  nobody reads the same thing twice.
- **plan vs checklist.** The plan is the argument; the checklist is the list of
  moves. If a checklist line needs a paragraph to explain it, that paragraph
  belongs in the plan.
- **report vs proof.** The report is a claim made before merging. Proof is
  evidence from after. A report that says "tests pass" is a claim; proof is the
  output of the run.

## Which ones a ticket owes

Not all seven, and not the same set for every ticket. That is the profile's job
— see **Profiles: what a ticket owes**. The readiness panel at the top of the
Ticket tab shows exactly which documents each upcoming boundary is waiting for,
and clicking a requirement opens the tab where it goes.

A tab you do not need is not a failure. A `chore` that never grows a research
document is a `chore` that did not need one.

## Writing them

Click a tab. If the document does not exist yet you get a **Create** button;
after that it is a plain markdown editor that saves as you go. Checkboxes in a
checklist are live — tick them in the editor and the file changes underneath.

Agents write into the same documents through the same files. That is the whole
point: you are not reading a summary of your agent's work, you are reading the
work.

## When two people write at once

Because you and your agents share the files, you can both be editing when one
of you saves. Kanmer notices instead of silently losing the loser.

For a document, you will see a banner saying the file changed since you opened
it, with **Reload from disk** and **Overwrite anyway**. Your typed text is not
thrown away either way — reloading shows you what arrived so you can re-apply
your change, and overwriting wins deliberately rather than by accident.

For the ticket's own fields, the banner names which fields collided and offers
**Keep mine** or **Take theirs**. Fields you did not touch quietly take the
newer value, so an agent moving a ticket while you retitle it is not a conflict
at all.
