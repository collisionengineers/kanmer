// The canonical AGENTS.md managed block — the ONE body, imported by every
// surface that writes one. Pure data: no imports, no side effects, no
// `import.meta`, so it is safe to bundle into the Electron main (built as CJS)
// as well as to run directly under Node.
//
// It lives alone in its own module because it used to live in three places.
// `scripts/agents-block.mjs` (the writer kanmer-setup calls) and
// `apps/gui/src/main/agentsBlock.ts` (the GUI's Connect flow) both re-export from
// here, so those two can no longer disagree. They had: the GUI copy was still a
// v2 body — seven stages, `impact.md`, a skill that no longer exists — and
// Connect wrote it into real repositories, overwriting the current one
// (SKILL-013; detection is CORE-023).
//
// The third copy is the fenced block in
// `plugins/kanmer/skills/kanmer-setup/SKILL.md`, and it cannot import anything:
// it is prose shipped to plugin users who do not have this repo checked out.
// `scripts/verify-agents-block.mjs` asserts it matches this body byte for byte.

export const START =
  "<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->";
export const END = "<!-- kanmer:instructions:end -->";

/** The managed block's body — everything between the two markers. */
export const BLOCK_BODY = `# Kanmer operating instructions

This repo's work is tracked on a Kanmer board in \`.kanmer/\`. In a Git repo set up
through the GUI the board lives in its own worktree, \`.worktrees/kanmer\`, on the
board branch, and MCP is already rooted there — never create, switch or push that
branch yourself. Your own ticket worktree is a separate thing, recorded by
\`take_ticket\`.

The board branch convention is the repository variable \`KANMER_BOARD_BRANCH\`,
falling back to \`kanmer-board\` when it is unset. A branch rename is an
administrator handoff: retarget branch protection and required checks, update
the repository variable, and only then reconcile the board worktree and remove
old refs. Agents must not mutate protected refs, branch protection, or repository
variables; stop and report when the observed branch and configured convention
disagree.

- Start every session with \`get_status\`, then \`list_board\` / \`list_items\` to find your ticket.
- **Which documents a ticket needs depends on its profile, not on a fixed pipeline.** Call \`get_doc_gates <id>\` before every move. Not \`board.yml\` — requirements are injected at resolve time, so its \`profiles:\` block is not the effective set.
- Stages: backlog → preparing → implementing → review → verifying → done. **A move crosses at most one gated boundary**, so walk the stages one at a time; a jump is refused even when every document exists.
- **Gates constrain \`move_item\` and nothing else** — creation in any stage is ungated, and \`gh pr merge\` is outside the engine, so an unmet gate never stops a merge.
- An unticked \`- [ ]\` in \`open-questions/\` blocks a move: tick it, or move it below the literal \`## Parked (explicitly deferred)\` with a reason.
- Read the whole ticket folder before starting — documents are folders (\`research/\`, \`plan/\`, …), so there may be several files per type. If the ticket is in a group, read the group's \`context.md\` too: the constraint binding the batch is written once, there.
- Work each ticket on its own branch and worktree: worktree \`.worktrees/<id>\`, branch \`<id>-<slug>\`; \`take_ticket\` records both and moves the stage.
- Write pipeline documents with \`set_ticket_doc\`. Running notes go to \`append_scratch\` — scratch is the notepad and is never gated, and neither is anything under \`reference/\` or \`assets/\`.
- Proof is written on merged \`main\`, after review and the merge, not before.
- Archive, don't delete. Reference other items with [[ID]] wiki-links.
- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. How far a ticket walks it depends on its profile, so ask \`get_doc_gates\` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).
- Each skill ends by naming what comes next — read that line before improvising a hand-off.

The local MCP convention is \`KANMER_BOARD_BRANCH\` in each project-scoped
provider registration or exported local runtime, falling back to the default
board branch when unset. GUI Connect writes the saved board-branch setting into local
registrations. Hosted Actions should mirror the same value in the repository
variable, but Actions variables are not inherited by local processes.
When a native runtime supervisor launches Kanmer through an operator-private
wrapper, that wrapper must export both \`KANMER_PROVIDER_CWD\` and
\`KANMER_BOARD_BRANCH\` before invoking the stable launcher. Native
The GUI's OpenAI tunnel controls manage the same long-lived native runtime
alias through \`tunnel-client runtimes connect/status/stop/rm\`. Application quit
does not stop that runtime; readiness requires structured non-stale status, and
local removal must confirm the alias is stopped before deleting its metadata.

## Agent conduct

**Scope**

1. **Scope is the brief.** “While I’m here” changes are follow-up tickets, not commits.
2. **Never absorb another ticket’s scope.** Link it and let it be worked on its own record.
3. **Release and remediation work ships no new features.**
4. **The ticket precedes the branch.** No board record, no PR.
5. **Stop at the stop condition.** Never merge your own PR or start the next ticket; report deviations instead of redesigning.

**Build**

6. **Greenfield has no legacy.** Unless the brief names users or data, add no fallback, compatibility, or deprecation path; delete what you replace.
7. **Reuse before build.** Name the helper, port, or route you extend; report a genuinely unfit one instead of silently building a parallel copy.
8. **One list per concept.** A second copy in another layer is duplication, even when it is “just strings”.
9. **Paths are relative.** Use repo-root-relative or injected configuration, never machine-specific paths.
10. **Dependencies are approvals.** Add no package unless the brief lists it.
11. **Concurrency results are never discarded.** Retry, defer, or surface them; a swallowed conflict is data loss.
12. **Errors surface.** No catch-all suppression or empty catch.
13. **No fabricated domain data.** Fixtures use the documented estate.

**Prove**

14. **Done means wired.** New code needs a named production caller; registered-but-unreachable or test-only code is not done.
15. **Runtime dependencies ship in the artifact.** Prove the deployed image carries every required browser, font, or package.
16. **A schema change and its permissions ride the same diff.** Include migration, grants, and bootstrap census together.
17. **Recorded commits must be reachable.** Ticket SHAs must exist on the merge target.
18. **Stubs are not done.** Do not present TODOs, placeholders, or mocks as implementation.
19. **Tests prove the claim.** Never weaken or delete an assertion to pass; a failing test stops and is reported.
20. **Verify with exit codes.** Run stated commands and record outputs; INCONCLUSIVE is not PASS, and a later pass does not erase a failure. Done requires PASS; an explicitly disposed terminal non-PASS stays Verifying, is archived, and is released.
21. **No speculative CI or tests.** Delete a gate that gates nothing.

**Conduct**

22. **Review findings get dispositions.** Fix, reject with reason, accept risk, or defer to a ticket; never silence them.
23. **Secrets never appear in code, tickets, or proofs.**
24. **A PR that changes commands or conventions updates AGENTS.md in the same PR.**`;
