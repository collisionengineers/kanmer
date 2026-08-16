# Proof — GUI-083

Verified on merged `main` (fast-forwarded from `19244f6` to `6c3ae77`, PR #50,
merge commit `6c3ae7745bc0b224b716a2646c8be8871ed175ce`) in the **main
checkout** — the same checkout the ticket's own evidence was measured in, and
where Connect had already written the untracked artifacts this ticket exists
to fix.

## `git status --porcelain` — the whole point of the ticket

```
$ cd C:\Users\PC\Documents\GitHub\kanmer && git pull origin main
Fast-forward 19244f6..6c3ae77
 .gitignore                              | 27 +++++++++---
 apps/gui/src/main/providers.test.ts     | 49 +++++++++++++++++++++-
 apps/gui/src/main/providers.ts          |  6 +--
 docs/architecture/adr/...ADR-0013...    |  4 +-
 docs/functional/frd/FRD-012-connect.md  |  7 ++--

$ git status --porcelain
?? icon.png
?? logo.png
```

Before this ticket, the same checkout's `git status --porcelain` listed
`.agents/mcp_config.json`, the full `.agents/skills/` tree (12 skill folders +
`.kanmer-skills-version`), and `.codex/config.toml` — all Connect artifacts.
After merge, none of them appear. `icon.png`/`logo.png` are pre-existing,
unrelated untracked files (present before this ticket too), not Connect
artifacts.

## Ignore-rule coverage, checked directly

```
$ git check-ignore -v .agents/skills/kanmer-auto/SKILL.md .agents/mcp_config.json \
    .codex/config.toml opencode.json .mcp.json .grok/config.toml
.gitignore:56:.agents/skills/       .agents/skills/kanmer-auto/SKILL.md
.gitignore:57:.agents/mcp_config.json  .agents/mcp_config.json
.gitignore:52:.codex/config.toml    .codex/config.toml
.gitignore:54:opencode.json         opencode.json
.gitignore:51:.mcp.json             .mcp.json
.gitignore:53:.grok/config.toml     .grok/config.toml
```

Every Connect-written destination is matched by an explicit rule.

## The tracked marketplace manifest is untouched

```
$ git ls-files .agents/plugins/marketplace.json
.agents/plugins/marketplace.json
```

Still tracked — confirms the rules did not blanket-ignore `.agents/`.

## Rail, on merged main

```
$ npm run typecheck
> @kanmer/core, @kanmer/mcp-server, @kanmer/ui, @kanmer/gui — all clean, no errors.

$ npm test
@kanmer/core:    9 files, 193/193 passed
@kanmer/gui:     21 files, 240/240 passed (includes the new
                 "copySkills destinations stay gitignored (GUI-083)" suite —
                 55 assertions across the it.each rules, the "found something
                 to check" guard, and the fake-path matcher test — all green)
test:scripts:    6 suites, 41/41 passed
```

No `kanmerGit.test.ts` flake this run (GUI-086 is load-dependent — it flaked
once during execute-phase testing in the worktree under concurrent agent
load, confirmed pre-existing and unrelated by rerunning that file alone with
`--testTimeout=30000` → 7/7 passed there too).

## Regression-test demonstration (from execute phase, reproduced here as evidence)

Before committing, a fake `copySkills` provider entry
(`skillsDir: ".totally-unignored-fake/skills"`) was temporarily added to
`PROVIDERS` in `providers.ts` and `npx vitest run src/main/providers.test.ts -t
"gitignore"` was run: 1 test failed (`expected false to be true`) on the fake,
unignored destination. The fake entry was then removed and the same command
re-run: 4/4 passed. This is the proof the check catches a real gap rather than
trivially passing — see the post-implementation report and checklist progress
notes for the full transcript.

## Verdict

All four items in the ticket's own Verification checklist hold:
- `git status --porcelain` is clean of Connect artifacts in a checkout where
  Connect has run — shown above.
- `.agents/plugins/marketplace.json` is still tracked — shown above.
- The regression test fails on an unignored `copySkills` destination and
  passes once fixed — demonstrated during execute, reproduced in this proof's
  reasoning.
- The `.codex/` (and `opencode.json`) decision is recorded with its reason —
  FRD-012 R1c.
