# Post-implementation report — GUI-083

## Summary

`.gitignore` had no entry for `.agents/`, `.grok/`, or `.codex/`, so a full
Connect-written skills tree and registration files sat untracked and
unignored in this checkout. Added specific `.gitignore` rules for exactly what
Connect writes — derived from `apps/gui/src/main/providers.ts`'s `copySkills`
`skillsDir`s and `configFile` `configPath`s, not a guessed list — narrow
enough to leave `.agents/plugins/marketplace.json` tracked. Added a
regression test in `providers.test.ts` that fails if a future `copySkills`
destination ships without a matching ignore rule, demonstrated it actually
catching a deliberately-introduced gap before trusting it, and recorded the
`.codex/config.toml` commit-or-ignore judgement call (and its extension to
`opencode.json`) in FRD-012 with reasoning.

## Changes

| File | Change | Why |
|---|---|---|
| `.gitignore` | Extended the existing machine-local-agent-config block: added `.codex/config.toml`, `.grok/config.toml`, `opencode.json`, `.agents/skills/`, `.agents/mcp_config.json`, `.grok/skills/`. Kept `.mcp.json` and `.claude/skills/` as-is. | These are exactly the destinations `providers.ts`'s `copySkills`/`configFile` specs write, minus `.agents/plugins/marketplace.json` which is real repo content and stays tracked. |
| `apps/gui/src/main/providers.test.ts` | Added `describe("copySkills destinations stay gitignored (GUI-083)", ...)`: reads `PROVIDERS`, collects every `copySkills` `skillsDir`, reads the repo-root `.gitignore`, asserts each has a matching `<dir>/` line (`it.each`), plus a guard that the check finds at least one destination, plus a direct test of the ignore-matching helper against a known-bad fake path. | Prevents a new provider (or a new `skillsDir`) from silently reintroducing the untracked-artifact gap. |
| `docs/functional/frd/FRD-012-connect.md` | Added R1c, recording the decision that all five registration files stay gitignored rather than committed, and why — separating "where the registration lives" (ADR-0007, unchanged) from "whether today's file content is fit to commit" (it isn't, because `Invocation` is always machine-absolute paths). | The mission's explicit instruction: don't leave the `.codex/` asymmetry unexplained; decide and record the reason either way. |

No changes to `apps/gui/src/main/providers.ts` — GUI-079 is in flight there; this ticket only reads it, per the mission's hazard note.

## Governing docs

`refs: docs/functional/frd/FRD-012-connect.md`.

- **Meets** R1/R1a/R1b/R2 unchanged — no registration or install behavior changed.
- **Modifies** FRD-012: added R1c (see Changes table above), authorized by the
  ticket's own explicit instruction to record the `.codex/` decision in the
  FRD. This is additive documentation of a decision the FRD's R1 section had
  not yet settled, not a change to any existing requirement's behavior.

## Risks / follow-ups

- `opencode.json` and `.grok/config.toml` (grok's actual current registration
  file, per GUI-079 which had already merged into `origin/main` by the time
  this ticket's worktree was created) are now ignored for the same reason as
  `.mcp.json`/`.codex/config.toml`. Not explicitly named in the ticket body
  (which only lists `.agents/`, `.grok/`, `.codex/`), but reached by the
  Method section's instruction to derive from *all* `configFile`
  `configPath`s, and consistent with the same underlying reason
  (machine-specific absolute paths via `Invocation`). Flagging for the
  reviewer to confirm this reading of scope.
- If `Invocation` ever becomes portable (relative/env-resolved command
  instead of this machine's absolute path), the R1c call is worth revisiting
  — noted explicitly in the FRD note itself so it isn't treated as settled
  for all time.
- Known pre-existing flake in `kanmerGit.test.ts` (GUI-086) was hit during
  the rail run; see Verification hand-off below. Not chased, not a
  regression from this change.

## Verification hand-off

On merged `main`, `kanmer-verify` should run:
- `npm run typecheck` — expect clean across all 4 workspaces.
- `npm test` — expect `@kanmer/core` and `test:scripts` fully green; `@kanmer/gui`
  should be green too, but if `kanmerGit.test.ts` flakes (GUI-086, 5s timeout
  under concurrent git subprocess load), rerun it alone:
  `npx vitest run src/main/kanmerGit.test.ts --testTimeout=30000` (run from
  `apps/gui`) and confirm 7/7 pass — do not chase further, it's pre-existing.
- Manual: `git status --porcelain --untracked-files=all` in a checkout where
  Connect has written its artifacts should be clean of them (the whole point
  of the ticket) — spot-check via `git check-ignore -v .agents/skills/x
  .agents/mcp_config.json .codex/config.toml .grok/skills/x .grok/config.toml
  opencode.json .mcp.json` (all should report an ignore rule) and
  `git ls-files .agents/plugins/marketplace.json` (should still list it).
