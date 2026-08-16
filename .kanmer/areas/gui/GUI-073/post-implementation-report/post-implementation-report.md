# Post-implementation report — GUI-073

## Summary

Antigravity's Connect row said **"· register-only"**, which was wrong in both
directions: it denied the project skills install the host does receive, and it
asserted a dispatch limitation whose recorded cause — "`agy -p` is known-broken
piped (GH #318/#76)" — is **refuted** against the installed binary. This change
corrects every place Kanmer says something untrue about Antigravity, and records
the thing that is actually broken: `agy` reads a workspace's `.agents/skills/`
and `.agents/mcp_config.json` **only in a session bound to that folder**, Kanmer
establishes no binding, so what Connect writes is *correct and currently inert*.
The badge now names the real limitation, Connect says the binding condition out
loud at the moment it writes the file, and the manual tells the user the flag
that makes it work. **No binding was implemented and `dispatch` was not flipped
— [[MCP-015]] owns both**, and flipping the flag without the binding would have
put a host in the dispatch menu that cannot see the board it was registered with.

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/main/providers.ts` (`AgentProvider.dispatch`) | modified | The doc comment was "Headless dispatch supported in v1 (Phase 7)? antigravity is register-only." — a host-capability claim embedded in a type comment, and the origin of the label. It now states what the flag *gates* (`dispatchableProviders()` → the menu; `dispatchTicket` refuses) and warns that a `false` here is never a capability tier. |
| `apps/gui/src/main/providers.ts` (antigravity entry) | modified | The `.agents/skills` comment's true half is kept and the **binding condition** added, with the measurement behind it: bare `agy` binds to `default-cli-project` (`"projectResources": {}`), so there is no folder to read from and cwd is irrelevant; `--new-project` / `--project <id>` / `--add-dir` each bind; trust is not the gate, a git root does not auto-bind, project existence does not bind. The refuted `agy -p` comment is replaced by the real reason `dispatch` stays `false` — no binding, `dispatch.ts` spawns with `cwd: root` only, so a dispatched agent would be blind to the MCP server Connect just registered. GH #318/#76 recorded as **never fetched** (behaviour tested instead — ADR-0009). |
| `apps/gui/src/main/providers.ts` (`antigravityBindingNote`) | added | The `codexTrustNote` pattern applied to the second host that has a *conditional* on whether its registration is read. Pure, exported, unit-tested. Unconditional by nature, and the comment says why: codex's trust is on disk and can be checked, Antigravity's binding is a per-session command-line flag, so there is nothing to inspect. Explicitly silent about the Antigravity IDE, which was never exercised. |
| `apps/gui/src/main/connect.ts` | modified | One `if (id === "antigravity")` beside the existing codex block, appending that note to the connect output. "Registered Kanmer in `.agents/mcp_config.json`" is true and, alone, misleading; the condition belongs where the user is told the file was written, not only in a code comment. |
| `apps/gui/src/renderer/src/components/Settings.tsx` (blurb) | modified | The panel said skills reach "opencode, Antigravity" via "the shared AGENTS.md block for hosts that only read skills globally". Both get a project `.agents/skills` tree; the AGENTS block goes to *every* host (FRD-012 R3). Rewritten to the three real delivery mechanisms. |
| `apps/gui/src/renderer/src/components/Settings.tsx` (badge) | modified | `· register-only` → `· no background dispatch`, with a hover title spelling it out. Still derived from `!p.dispatch`, the same source as `dispatchableProviders()`, so badge and dispatch menu **cannot** disagree — the ticket's second verification item. |
| `apps/gui/src/main/providers.test.ts` | modified | `it("antigravity is register-only (no dispatch)")` asserted the boolean alone, so the suite made a wrong claim look verified. Now asserts the evidenced capability: registers via `.agents/mcp_config.json` **and** installs project skills into `.agents/skills`, is absent from `dispatchableProviders()`, `dispatchArgs` undefined. A second test pins the binding note's content (names `--add-dir`, quotes a path with spaces, says the IDE was not tested, never says "register-only"). |
| `docs/manual/connect.md` | modified | End-user prose carried the same mislabel in a table row and a whole `## "Register-only"` chapter. Replaced by an accurate "No background dispatch" section and a new **"Antigravity: bind the folder"** section with the two flags, the reason a plain `agy` sees nothing, and the warning that a connected workspace MCP server never appears under its own name in a tool list — the exact false negative that produced the original contradictory research. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | regenerated | `npm run build:manual`; `check:manual` is on the rail. |
| `packages/ui/src/demo.tsx` | modified | The demo bridge mocked `opencode … dispatch: false` to exercise the badge — a false capability claim about a real host, in the same class as the one being removed. Now Antigravity carries it and opencode is `true`. Demo data only. |

## Governing docs

- **`docs/functional/frd/FRD-012-connect.md` (ref) — MET, not modified.** R2's
  Antigravity bullet already states both files are read only in a workspace-bound
  session, that Kanmer binds nothing, that the write is "correct and currently
  inert", and names MCP-015. This diff brings `providers.ts`, `Settings.tsx` and
  the manual **into line with R2** — it is the code catching up to the doc, not
  the doc changing. AC2 already restricts the Antigravity check to a bound session
  and states it cannot pass until MCP-015 lands; **this ticket does not claim
  AC2** and the manual repeats AC2's own warning about tool-list greps. R5
  (capability claims follow ADR-0009's method clause) is the standard this diff
  was held to.
- **`docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` — MET, and
  deliberately NOT amended.** MCP-009 (`c81063e`) owns it and has shipped: the
  method clause and the convergence note (three hosts + binding caveat) are
  already correct. Every claim written here traces to a command and its output,
  re-run at implementation time rather than copied from research (see the
  checklist's progress notes); nothing is asserted about the untested IDE, which
  is the clause's "an unchecked host is a finding, never a default".
- **ADR numbering:** grok's `.grok/config.toml` decision is **ADR-0013** (the
  duplicate ADR-0012 was renumbered). Nothing in this diff cites ADR-0012.
- **No new ADR.** No new design decision: the one judgement (keep `dispatch:
  false` for a different, measured reason) is a fact recorded in a comment, and
  the decision it defers belongs to MCP-015.

## Risks / follow-ups

- **[[MCP-015]] owns the actual fix** — the workspace binding (`--add-dir` is the
  cheapest candidate; it persists nothing, re-confirmed here), the `agy plugin
  install` path, and flipping `dispatch`. Until it lands, a user who clicks
  Connect for Antigravity and runs a bare `agy` gets neither the board nor the
  skills. That is now *said* in three places (connect output, manual, code) and
  fixed in none — which is this ticket's scope, and the risk a reviewer should
  weigh deliberately rather than discover.
- **When MCP-015 flips `dispatch`**, the badge disappears for Antigravity with no
  copy change, and `antigravityBindingNote` becomes the thing to delete or narrow
  — one exported function with one call site, deliberately.
- **`listProviders()` still exposes one boolean.** Considered and declined (see
  `open-questions`): a breaking IPC-crossing type change for one consumer, when
  the mislabel is fixed by naming what the boolean means. Revisit if a second
  badge-worthy per-host caveat appears.
- **The Antigravity IDE is untested.** All copy is scoped to `agy` 1.1.13 and says
  so. If someone verifies the IDE, it belongs on MCP-015.
- **`kanmerGit.test.ts` flakes under parallel load** — pre-existing, [[GUI-085]],
  unrelated to this diff (it touches no git code); passes 7/7 alone at
  `--testTimeout=30000`.

## Verification hand-off

On merged `main`, from the main checkout:

1. `npm run typecheck` — clean across `@kanmer/core`, `@kanmer/mcp-server`,
   `@kanmer/ui`, `@kanmer/gui`.
2. `npm test` — expect 254 passing. If `kanmerGit.test.ts > renameBoardBranch >
   keeps the history, the path and the remote consistent` times out at 5000ms,
   that is GUI-085 under load: rerun
   `npx vitest run src/main/kanmerGit.test.ts --testTimeout=30000` from
   `apps/gui` and expect 7/7.
3. `npm run check:manual` — "manual: up to date (19 chapters)".
4. `grep -rn "register-only" apps docs plugins packages scripts` — the only hits
   should be the four comments/sentences that *quote* the old label to explain it,
   plus the historical `docs/plans/kanmer-v2/**` documents. No live UI string.
5. Ticket verification items:
   - **1 — the row no longer implies reduced project support:** the badge reads
     "· no background dispatch"; the blurb no longer says Antigravity reads skills
     globally only.
   - **2 — the label matches the dispatch menu:** both come from `p.dispatch` /
     `dispatchableProviders()`; asserted in `providers.test.ts`.
   - **3 — Connect still writes `.agents/mcp_config.json` AND `.agents/skills`:**
     asserted in `providers.test.ts` (config path + install spec) and unchanged by
     this diff. Verified live at implementation time that a **bound** `agy` reads
     such a tree and a bare one does not — the mechanism (skill body executed),
     not a tool listing.
6. Optional, cheap: `echo hi | agy -p "Reply with exactly: PONG" --print-timeout 120s`
   → `PONG`, exit 0, if `agy` is on the verifying machine.

## Addendum — review fixes (self-review, PR #55)

Four corrections were made to this diff during review; the table above describes
the **shipped** state, and this records what changed after the first commit.

- **A new false claim was caught before merge.** The blurb's first draft read
  "Every host also gets the AGENTS.md block", taken from FRD-012 R3. `connect.ts`
  does not do that: `installSkills` returns at the `kind: "marketplace"` branch
  before `ensureAgentsBlock(root)`, so Claude Code and codex never receive the
  block. The sentence now says what the code does (the block accompanies the
  project skills copies). On a ticket about capability claims that outran their
  evidence, sourcing a claim from a governing doc rather than the code was the
  precise failure mode ADR-0009's method clause names — caught by checking.
- **The divergence itself is filed as [[GUI-088]]** (non-blocking): either
  `connect.ts` or FRD-012 R3 is wrong, ADR-0009's contract hierarchy suggests the
  code is, and hoisting `ensureAgentsBlock` changes Connect's *behaviour* for two
  hosts — out of scope for a copy fix.
- **"one write, three hosts" → "two hosts."** grok reads `.agents/skills/`
  (FRD-012 R2) but Kanmer writes `.grok/skills` for it; the original wording
  conflated what hosts read with what this registry line writes. grok's redundancy
  is cited to R2 and left to MCP-014.
- **A quoted command was normalised to one actually run** (`--print-timeout 90s`
  was the earlier research's invocation, not this branch's), and the connect note
  now says "Antigravity's CLI (`agy`)" rather than "Antigravity", since only the
  CLI was measured.
