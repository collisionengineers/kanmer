# Proof — MCP-009

*The proof. Not the report — this is **evidence** gathered from the merged
result, after the fact.*

Verified on merged `main` at **`c81063e`** ("Provider-parity documentation
corrections: ADR-0009 method clause + FRD-012 install matrix (MCP-009) (#44)"),
in the main checkout `C:\Users\PC\Documents\GitHub\kanmer`, 2026-08-16.
PR https://github.com/collisionengineers/kanmer/pull/44 — merged (squash),
merge commit `c81063e`.

## Scope contract — docs only

```
$ git show --stat --format="" c81063e
 docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md | 14 +++++++++---
 docs/functional/frd/FRD-012-connect.md                        | 18 +++++++++----
 2 files changed, 24 insertions(+), 8 deletions(-)
```

Exactly the two governing documents. No file under `apps/`, `packages/`,
`plugins/` or `scripts/` was touched, which is the whole scope contract for this
ticket after the operator's split — MCP-013, MCP-014, MCP-015 and GUI-079 own
the code.

## Rail

```
$ npm run build
  ESM ⚡️ Build success in 322ms      (core)
  DTS ⚡️ Build success in 5371ms     (core)
  ESM ⚡️ Build success in 51ms       (mcp-server)
  CJS ⚡️ Build success in 1135ms     (mcp-server standalone)

$ npm run typecheck
  @kanmer/core        tsc --noEmit — clean
  @kanmer/mcp-server  tsc --noEmit — clean
  @kanmer/ui          tsc --noEmit — clean
  @kanmer/gui         tsc --noEmit -p tsconfig.node.json && -p tsconfig.web.json — clean

$ npm run check:manual
  manual: up to date (11 chapters)
```

`check:manual` is the load-bearing one for this change and it passes: FRD-012 is
**not** among the curated FRDs in `scripts/build-manual.mjs`'s `FROM_FRD`, so
`chapters.generated.ts` needed no regeneration. Established by reading the array
rather than assuming it — the array now holds eight entries (002, 007, 003, 001,
006, 004, 010, 020) and no 012.

**Chapter count moved during this ticket, and not because of it.** It measured
12 chapters / nine curated FRDs on the original base `9ac20af`, and 11 / eight
after rebasing onto `2f06713` — GUI-070 ("remove the separate Backlog view")
dropped `FRD-011-backlog-list-view` from `FROM_FRD` in that commit
(`git show 2f06713 --stat` shows `scripts/build-manual.mjs | 1 -`). The
assertion that matters is not the number but that FRD-012 is absent from the
array and the manual is up to date; both hold.

```
$ npm test
  @kanmer/core   Test Files  9 passed (9)     Tests  193 passed (193)
  @kanmer/gui    Test Files  1 failed | 20 passed (21)
                 Tests       3 failed | 214 passed (217)
```

## The `@kanmer/gui` failures are pre-existing and were proven so, not assumed

All failures are in `apps/gui/src/main/kanmerGit.test.ts`, a Windows `EPERM`
flake in the `afterEach` `rmSync` of a temp git worktree:

```
Error: EPERM, Permission denied: \\?\C:\Users\PC\AppData\Local\Temp\kanmer-git-JcFkMP
 ❯ src/main/kanmerGit.test.ts:49:3
   48| afterEach(() => {
   49|   rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
```

Non-deterministic — a different subset failed on every run: 2 failures, then 1
(a *different* test), then 3.

Two arguments that it is not this change, one weak and one decisive. The weak
one: the merge commit contains only Markdown, and the file was last modified by
`b3fc42d` ("fix(gui): migrate the board worktree when the branch is renamed"),
not by this branch. That is an inference from absence — and this ticket exists
to retire inferences from absence, so it is not the evidence relied on.

The decisive one, by the method this ticket just shipped into ADR-0009 — verify
the mechanism, do not reason about a proxy. A throwaway worktree was checked out
at **`2f06713`**, the commit immediately *before* the merge, with this change
absent from the tree entirely, and the suite run there:

```
$ git worktree add <temp> 2f06713 && cd <temp>/apps/gui
$ npx vitest run src/main/kanmerGit.test.ts
  FAIL  ensureBoardWorktree reconciliation > moves a worktree left on the old branch onto the configured one
  Test Files  1 failed (1)     Tests  1 failed | 6 passed (7)
```

**It fails without this change present.** Pre-existing, unrelated, and
reproduced on a tree that has never contained the diff. Reported to the
operator; not filed as a ticket, since filing is outside this ticket's docs-only
scope. (Temp worktree removed and `git worktree prune` run.)

## The retired lesson is gone from `docs/`

```
$ grep -rn "go stale in weeks\|current host documentation" docs/
(no output)

$ grep -rc "current host docs" docs/functional/frd/FRD-012-connect.md
1
```

Zero hits for the two phrases that carried the wrong lesson normatively. The
single remaining `current host docs` hit is the phrase quoted *inside* FRD-012
R5 as the thing being retired — intended, and the reason the check is stated as
"one quoted hit, no unquoted normative use" rather than "zero".

## The shipped text says the right thing

Read back from merged `main`. `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md`
now carries `### Method: how a provider capability claim is established`, whose
first paragraph opens:

> Provider capability claims are established **against the installed binary, not
> the documentation**, and are **never inferred from the absence of evidence**. A
> statement that a host cannot do something is admissible only with the command
> that was run and its output; "the docs do not mention it" is not a finding.

The clause's key claims, all present in the merged file:

1. Establish against the installed binary; never infer from absence of evidence;
   the command and its output are the admissible evidence.
2. Prefer the host's own resolved-configuration dump (`grok inspect`,
   `opencode debug skill`, `codex plugin list`, `claude plugin details`) over
   docs and over narrower subcommands — `grok mcp list` reports "none
   configured" for servers `grok inspect` shows active.
3. Read a config file the tool itself wrote, not a documented example.
4. A probe needs a positive control.
5. **A positive control is not sufficient — verify the mechanism you are
   actually testing, not a proxy for it**, carried by the worked example: the
   `agy` probe that was wrong twice over. The session was not workspace-bound
   (bare `agy` binds to `default-cli-project`, `"projectResources": {}`, so no
   folder and cwd irrelevant; only `--new-project`, `--project <id>` with a
   `folderUri`, or `--add-dir <path>` bind — **trust is not the gate, a git root
   does not auto-bind, project existence does not bind**), and a workspace MCP
   server never surfaces as a named top-level tool, appearing as the generic
   `call_mcp_tool` / `list_resources` / `read_resource` triad, so a tool-list
   grep is a **false negative even when the server is connected**.
6. An unchecked CLI is a finding, never a default.
7. The original failure was **not** decay — stated explicitly, since the
   staleness reading is what propagated.
8. **Convergence holds and gains a third host**: one project-scoped write to
   `.agents/skills/` serves opencode, grok and Antigravity, making grok's
   separate `.grok/skills` write redundant — with the caveat that `agy` reads it
   only in a workspace-bound session and Kanmer establishes no binding today, so
   the write is correct and currently inert. MCP-015 owns making it live.

**The overturned clause is not in the shipped text.** Confirmed by reading the
merged file: `.agents/skills/` is stated to serve Antigravity, not to exclude
it. The research's original draft said the opposite and was falsified by the
adjudication before it shipped.

`docs/functional/frd/FRD-012-connect.md` on merged `main` carries the corrected
R2 per-host matrix with an owning ticket on every divergence, the widened R4
shared-directory clause, R5 as a pointer to the ADR clause rather than a
paraphrase, AC2 with the workspace-binding precondition and the
call-the-tool check, and the `Related:` open-work list. GUI-080's R2a, R4 body
and AC5 survive intact.

## The binding claim was re-verified locally, not inherited

The ADR now asserts as fact that Kanmer establishes no `agy` workspace binding.
Shipping an unverified claim inside the clause that forbids unverified claims
would be self-refuting, so it was re-run rather than taken from the
adjudication:

```
$ grep -rn -- "--new-project\|--add-dir\|--project" apps/ packages/
(no output)

$ grep -rn "\bagy\b" apps/ packages/ --include=*.ts --include=*.tsx
apps/gui/src/main/providers.ts:451:    // `agy -p` is known-broken piped (GH #318/#76) → register-only in v1.
```

No binding flag anywhere in either tree; the only `agy` string is a stale
comment. Confirmed.

## Ticket verification items

- [x] **ADR-0009's staleness clause is replaced with the absence-of-evidence
      rule and the check-the-binary method.** Shipped, plus the
      verify-the-mechanism rule the adjudication showed was also needed.
- [x] **FRD-012's install matrix matches reality**, with each divergence from
      shipped code naming its owning ticket.
- [x] **Every capability claim cites the command run against the real CLI.**
      The evidence lives in `research`; the governing docs carry the conclusions
      and the method rather than duplicating transcripts.
- [x] **Any CLI that could not be checked is named as unchecked, not assumed.**
      None were unchecked — all five binaries were present (`agy` is
      Antigravity's CLI; there is no `antigravity` executable). The Antigravity
      *IDE* is recorded as **parked**, explicitly distinguished from unchecked.
- [ ] **Each of the five providers installs from a documented path, tested
      rather than asserted** — tested (all five install; recorded in `research`),
      but the *shipped* paths are not yet corrected. **MCP-013/014/015**, out of
      scope here by the operator's split.
- [ ] **The manifests agree with each other and with `providers.ts`** — the
      disagreements are documented (Finding 6); reconciling them is
      **MCP-011** and **MCP-013**.

The two unticked items are code, deliberately not this ticket's after the split.
Both are recorded in FRD-012's `Related:` open-work list so they are findable
from the document rather than only from the board.
