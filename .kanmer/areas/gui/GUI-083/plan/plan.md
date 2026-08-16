# Plan — GUI-083: gitignore the Connect artifacts

## Approach

Derive the exact set of Connect-written destinations from `providers.ts`
(not a guessed list), add specific `.gitignore` rules for each — narrow enough
to leave `.agents/plugins/marketplace.json` tracked — and add a regression
test in `providers.test.ts` that fails if a future `copySkills` destination
ships without a matching rule. Separately, settle the one genuine judgement
call (`.codex/config.toml`, and by the same reasoning `opencode.json`): both
carry machine-specific absolute paths via the shared `Invocation` shape, so
both are ignored like `.mcp.json` already is — recorded with reasoning in
FRD-012, not left as an unexplained asymmetry. This beats blanket-ignoring
`.agents/` or `.codex/` (would swallow the tracked marketplace manifest and
foreclose ever committing project config there) and beats a guessed list
(exactly the kind of oversight that created this ticket).

## Governing docs

`refs: docs/functional/frd/FRD-012-connect.md`.

- **Meets** R1 (registration matrix) and R2 (skill install matrix) implicitly:
  this ticket changes no registration/install behavior, only what git tracks
  of their output, so R1/R2 are unaffected as written.
- **Modifies** FRD-012: adding a short note recording the `.codex/config.toml`
  / `opencode.json` commit-or-ignore decision and its reasoning. This is
  additive documentation of a decision the FRD's own R1 section left open
  ("the project must be trusted" caveat is covered; whether the file's
  *content* is fit to commit is not) — not a change to any requirement or
  acceptance criterion, so no new authorization beyond the ticket's own
  explicit instruction to "record the decision and its reason in FRD-012" is
  needed.

## Steps

1. Add `.gitignore` rules for `.agents/skills/`, `.agents/mcp_config.json`,
   `.grok/skills/`, `.codex/config.toml`, `opencode.json` — extending the
   existing "Machine-local agent config" comment block (near `.mcp.json`)
   rather than a new block, since the reasoning is the same. Leave `.mcp.json`
   as-is.
2. Verify `.agents/plugins/marketplace.json` still shows in `git ls-files`
   and is not matched by `git check-ignore`.
3. Add a regression test to `apps/gui/src/main/providers.test.ts`: collect
   every `copySkills` destination's `skillsDir` from `PROVIDERS`, read the
   repo-root `.gitignore`, assert each has a matching `<dir>/` line.
4. Demonstrate the test actually catches the gap it's meant to catch: add a
   fake `copySkills` provider entry with an unignored `skillsDir`, run the
   test, confirm it fails, then remove the fake entry and confirm the test
   passes clean. Record the fail-then-pass output as evidence (goes in the
   post-implementation report, not committed).
5. Record the `.codex/config.toml` / `opencode.json` decision and its
   reasoning in `docs/functional/frd/FRD-012-connect.md`, near the R1
   registration matrix where the codex caveat already lives.
6. Run the rail (`npm test`, `npm run typecheck`) in the worktree. If
   `kanmerGit.test.ts` flakes (known hazard, GUI-086), rerun that file alone
   with `--testTimeout=30000`, note the result, move on.
7. Confirm `git diff AGENTS.md` is empty before committing (known hazard #3 —
   do not commit any AGENTS.md change).

## Verification

- `npm run test -w @kanmer/gui` (or root `npm test`) green, including the new
  `providers.test.ts` check.
- `npm run typecheck` clean.
- Manual: `git status --porcelain` in the worktree after `.gitignore` change
  shows the Connect artifacts (skills tree, `.agents/mcp_config.json`,
  `.codex/config.toml`) no longer listed, while `.agents/plugins/marketplace.json`
  still appears in `git ls-files`.
- The fail-then-pass demonstration from step 4, pasted into the
  post-implementation report as evidence the check actually checks something.

## Risks / open questions

- Risk: over-broadly ignoring `.agents/` would silently stop tracking
  `.agents/plugins/marketplace.json`. Mitigation: rules target
  `.agents/skills/` and `.agents/mcp_config.json` specifically, never bare
  `.agents/`; step 2 verifies this explicitly.
- Risk: `opencode.json` is not named in the ticket body, only reachable via
  the Method section's instruction to derive from *all* `configFile`
  destinations. Decided to include it (see research/plan reasoning: identical
  machine-specific-path problem as `.mcp.json`/`.codex/config.toml`) rather
  than leave a fourth inconsistent case sitting right next to the three the
  ticket names. No open question to the user — this is the ticket's own
  "decide it, don't dodge it" instruction applied consistently.
- Risk: `kanmerGit.test.ts` flaking under concurrent load (GUI-086, confirmed
  pre-existing by three agents). Mitigation: isolate and rerun with a longer
  timeout if hit; do not chase further.
