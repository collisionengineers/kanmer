# Review — GUI-073, PR #55

**I am both author and reviewer of this change. This is a self-review and should
not be read as an independent one.** What follows is what I actually re-checked
against the diff and the installed binary, including two things I got wrong on
the first pass and one defect in neighbouring code that the check turned up.

## Changes (reviewer's reading of the diff)

Seven files, no behaviour change except one added sentence in Connect's output.

- **`providers.ts`** — three edits. (1) `AgentProvider.dispatch`'s doc comment
  stops naming a host and describes what the flag gates. (2) The antigravity
  registry entry gains the workspace-binding condition and loses the refuted
  `agy -p` justification, keeping `dispatch: false` for the measured reason.
  (3) New exported `antigravityBindingNote(projectRoot)` beside `codexTrustNote`.
- **`connect.ts`** — one import, one `if (id === "antigravity")` appending that
  note to the config-file branch's output. Cannot affect the CLI branch, cannot
  throw (pure string), cannot change the `ok` flag.
- **`Settings.tsx`** — badge text and the panel blurb.
- **`providers.test.ts`** — the mislabelled test replaced by one that asserts the
  registry facts, plus a new test pinning the note's content.
- **`docs/manual/connect.md`** + **`chapters.generated.ts`** — the end-user
  chapter, regenerated.
- **`demo.tsx`** — demo bridge data.

## Comments

1. **[blocking, fixed in PR] The blurb's first draft shipped a *new* false claim.**
   I wrote "Every host also gets the AGENTS.md block", taking it from FRD-012 R3
   ("the AGENTS.md managed block is written for **every** provider"). Checking it
   against `connect.ts` before merging: `installSkills` returns at the
   `kind: "marketplace"` branch **before** `ensureAgentsBlock(root)`, so Claude
   Code and codex never get the block. The sentence was rewritten to the true one
   (the block accompanies the project skills copies). On a ticket about false
   capability copy, taking a claim from a governing doc instead of the code would
   have been the exact failure mode ADR-0009's method clause exists to prevent —
   and it nearly happened at the last step.
2. **[non-blocking, filed as ticket] The divergence itself is real.** Either
   `connect.ts` or FRD-012 R3 is wrong, and ADR-0009's contract hierarchy argues
   the code is. Filed as **[[GUI-088]]** with the code excerpt, the requirement
   text, and how it was found. Not fixed here: GUI-073's scope is what Kanmer says
   about *Antigravity*, and hoisting `ensureAgentsBlock` changes what Connect
   *does* for two other hosts. Not linked as blocking — this PR's copy is now
   true either way GUI-088 resolves.
3. **[blocking, fixed in PR] "One write, three hosts" overstated what this entry
   does.** grok reads `.agents/skills/` (FRD-012 R2), but Kanmer writes
   `.grok/skills` for it, so "three hosts" conflated what the hosts read with what
   this line writes. Reworded to two hosts, with grok's redundancy cited to R2 and
   left to MCP-014.
4. **[non-blocking, fixed in PR] A quoted command that was not the command run.**
   The comment quoted `--print-timeout 90s` (the original research's invocation);
   mine used 120s. On a ticket whose whole subject is claims that outran their
   evidence, a quoted command must be one that was actually run — reworded to the
   prompt-and-result form, which is what both runs share.
5. **[non-blocking, fixed in PR] The note said "Antigravity reads this file" when
   only `agy` was measured.** Narrowed to "Antigravity's CLI (`agy`)". The IDE
   disclaimer stays.
6. **[non-blocking, won't do] `listProviders()` still exposes one boolean.**
   Declined with reasons in `open-questions` — an IPC-crossing breaking change for
   one consumer, when the badge is fixed by naming what the boolean means. Revisit
   if a second per-host caveat needs a badge.
7. **[non-blocking, won't do] The connect-time wiring is not covered by a test.**
   `connectAgent` has no test today (`connect.test.ts` covers `disconnectAgent`
   and `reconcileSkills`), and the codex note it mirrors is likewise untested at
   the call site; the note *function* is unit-tested. Adding a `connectAgent`
   harness is a fixture job worth more than this one-line branch, and inventing it
   here would smuggle scope into a copy fix.
8. **[non-blocking, noted] `docs/plans/kanmer-v2/**` still says "register-only".**
   Historical planning records of what was believed at the time; correcting them
   would falsify the record. Deliberately left.

## What I checked, and how

- **Report against diff** — every one of the seven files appears in the
  post-implementation report's table with a rationale that matches what the diff
  does. Re-read after the three fixes above; the report's blurb row describes the
  *shipped* sentence, not the withdrawn one.
- **Governing docs** — FRD-012 re-read in full on merged main: R2's Antigravity
  bullet, AC2, R4 and R5 already carry the binding caveat and name MCP-015
  (MCP-009, `c81063e`), so the plan's "met, not modified" holds and the diff moves
  the *code* toward R2 rather than the doc toward the code. ADR-0009 re-read: the
  method clause and the three-host convergence note are already amended; nothing
  here re-amends it, as required. ADR-0013 (not ADR-0012) is the grok decision and
  nothing in this diff cites 0012. No new ADR needed — no new design decision is
  taken, and the one judgement (keep `dispatch: false`, different reason) is a
  recorded fact plus a deferral to MCP-015.
- **Ripple effects from the `files` document** — `dispatchableProviders()` and the
  dispatch menu: unchanged and now *asserted* unchanged by the rewritten test.
  `dispatch.ts:86`'s "doesn't support background dispatch" wording: already
  consistent with the new badge, checked. IPC/preload `ProviderInfo`: untouched,
  since the return shape did not change. `providers.test.ts` / `dispatch.test.ts`:
  both pass. Screenshots/release notes showing the old badge: the manual chapter
  is the only in-repo one and it is updated.
- **Claims re-measured, not inherited** — `agy --version` → 1.1.13;
  `echo hi | agy -p "Reply with exactly: PONG"` → `PONG`, exit 0; and the binding
  gate re-run as a *mechanism* test rather than a listing (token in a SKILL.md
  **body**, so only execution can produce it): bare `agy` inside the folder →
  `NO-SKILL`, `agy --add-dir <folder>` → `ZORBCHECK-8823`. Machine state before
  and after: 13 project records → 13, two config files md5-identical, probe
  directory deleted and its absence verified.
- **Rail** — typecheck clean on all four workspaces after every edit;
  `providers.test.ts` + `connect.test.ts` 68 passed; full `npm test` 253/254 with
  the single failure being `kanmerGit.test.ts`'s known GUI-085 load flake, 7/7
  when rerun alone at `--testTimeout=30000`; `check:manual` up to date.
- **`git diff AGENTS.md`** empty, as instructed.

## Disposition

| # | Comment | Disposition |
|---|---|---|
| 1 | New false claim in the blurb | **Fixed in PR** |
| 2 | AGENTS block not written for marketplace hosts | **Filed as [[GUI-088]]** (non-blocking) |
| 3 | "three hosts" conflated read with write | **Fixed in PR** |
| 4 | Quoted command was not the one run | **Fixed in PR** |
| 5 | "Antigravity" where only `agy` was measured | **Fixed in PR** |
| 6 | `listProviders()` capability record | **Won't do** — recorded in open-questions |
| 7 | No test at the `connectAgent` call site | **Won't do here** — fixture work, matches codex precedent |
| 8 | Historical plan docs still say "register-only" | **Won't do** — falsifying the record |

## Verdict

**Pass.** The diff says only things that were measured, defers exactly what the
adjudication assigned to MCP-015, and leaves FRD-012 and ADR-0009 alone as their
owner requires. The one thing a genuinely independent reviewer should weigh is
comment 1: the failure mode this ticket exists to fix reappeared inside the fix
itself, and was caught by checking the code rather than the doc. It is fixed, and
the underlying divergence is on the board as GUI-088.
