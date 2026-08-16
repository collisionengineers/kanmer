Review — GUI-083. I am both author and reviewer on this ticket; this is not an independent review and should not read as one.

## Changes (in my own words, from `gh pr diff`)

1. `.gitignore`: extends the existing machine-local-agent-config block with
   `.codex/config.toml`, `.grok/config.toml`, `opencode.json`, `.agents/skills/`,
   `.agents/mcp_config.json`, `.grok/skills/`. `.mcp.json` and `.claude/skills/`
   unchanged. Comment rewritten to explain all entries by one shared reason
   (machine-specific absolute paths via `Invocation`) and to explicitly note
   why `.agents/plugins/marketplace.json` is NOT covered.
2. `apps/gui/src/main/providers.test.ts`: new `describe` block reading
   `PROVIDERS`, deriving every `copySkills` `skillsDir`, and asserting each has
   a matching `.gitignore` rule via `it.each`; plus a "found something to
   check" guard and a direct test of the matcher against a known-unignored
   fake path.
3. `docs/functional/frd/FRD-012-connect.md`: new R1c recording the
   commit-or-ignore decision for all five registration files, with reasoning
   that separates "where" (ADR-0007, untouched) from "is today's content fit
   to commit" (no, and why).

## Comments

1. (non-blocking) `opencode.json` and `.grok/config.toml` are ignored even
   though the ticket body names only `.agents/`, `.grok/`, `.codex/`. This is a
   deliberate scope reading from the Method section's instruction to derive
   from *all* `configFile` `configPath`s, not a guessed list, applied for
   consistency (identical machine-specific-path problem). Flagged in the
   post-implementation report's Risks section rather than silently expanded.
   Disposition: kept — the alternative (leaving `opencode.json` as a fourth
   inconsistent case right next to the three the ticket names) would recreate
   the exact asymmetry this ticket exists to close.
2. (non-blocking) The verification checklist item "After a Connect for each
   provider, `git status --porcelain` in a clean repo is empty" is not
   exercised by an actual Connect run in this diff (that would need a GUI/e2e
   harness this ticket doesn't add). Evidence instead: `git check-ignore -v`
   against the literal destination paths, which is the direct git-level proof
   that `git status` would omit them. Disposition: accepted as sufficient for
   a tight fix-profile ticket; full Connect-driven e2e is out of scope here.
3. (non-blocking) Discovered mid-execute that GUI-079 had already landed on
   `origin/main`, moving grok's `configPath` from `.mcp.json` to
   `.grok/config.toml`. The plan/research were written against a pre-fetch
   checkout and didn't anticipate this, but the worktree's actual
   `providers.ts` was re-read before editing `.gitignore`, so the shipped
   rules are correct against current `main`, not the stale assumption.
   Disposition: no fix needed, course-correction recorded in scratch/notes.

## Governing docs

FRD-012's R1c (added by this PR) is internally consistent with R1/R1a — it
doesn't change registration behavior, only documents a gitignore decision.
Plan's Governing docs section correctly characterizes this as a `Modifies`
under the ticket's own explicit authorization (the mission instructed
recording the decision in the FRD), not an unauthorized change.

## Code check

- `.gitignore` rules verified directly: `git check-ignore -v` matches every
  target path and does NOT match `.agents/plugins/marketplace.json`.
- Regression test verified end-to-end, not just read: temporarily added a
  fake `copySkills` provider with an unignored `skillsDir`, ran the suite,
  saw it fail (`expected false to be true`), reverted, saw it pass (4/4).
  `providers.ts` confirmed back to byte-identical with origin/main after
  revert (`git diff --stat` empty).
- `providers.ts` untouched — confirmed via the PR diff (only the 3 files
  above appear).
- `AGENTS.md` untouched — confirmed via `git diff AGENTS.md` before commit
  (empty) and absence from the PR diff.
- Rail: `npm run typecheck` clean (4/4 workspaces). `npm test`:
  `@kanmer/core` 193/193, `test:scripts` 41/41, `@kanmer/gui` 235/236 with the
  one failure being the pre-existing `kanmerGit.test.ts` flake (GUI-086,
  confirmed by rerunning that file alone with `--testTimeout=30000` → 7/7).

## Verdict

**Pass.** Diff matches the report, ripple effects (regression test, FRD note)
are present and demonstrated working, no scope creep into `providers.ts`, no
AGENTS.md contamination. Proceeding to merge and move to Verifying.
