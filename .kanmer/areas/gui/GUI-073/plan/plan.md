# Plan — GUI-073: stop saying "register-only"; say what is actually true

*Written from `research`, `files`, and — decisively — `scratch/conflict-with-mcp-009.md`,
whose **adjudication verdict** settled the fact this ticket was scoped around.*

## What the adjudication changed about this ticket

Ten measured runs with positive controls, corroborated by the probe MCP server's
own process log, established:

- `.agents/skills/` and `.agents/mcp_config.json` at the workspace root **ARE**
  read by `agy` 1.1.13 — functionally: the skill body executed and the MCP
  server's tool returned a value.
- **The gate is a bound workspace folder, and nothing else.** Bare `agy` binds to
  `default-cli-project`, whose record is `"projectResources": {}` — no folder, so
  there is nothing to read `.agents/` from; cwd is irrelevant. `--new-project`,
  `--project <id>` with a `folderUri`, and `--add-dir <path>` each bind; only the
  flag on the command line binds, and `--add-dir` persists nothing.
- Trust is **not** the gate; a git root does **not** auto-bind; project
  *existence* does **not** bind; and a workspace MCP server **never** surfaces as
  a named top-level tool (it is `call_mcp_tool` / `list_resources` /
  `read_resource`), so a tool-list grep is a false negative even when connected.

So the ticket's third verification item — "Connect still writes
`.agents/mcp_config.json` **and** `.agents/skills`" — **passes**, and always did.
That was never the defect. The defect is that Kanmer writes **correct files into
a session shape that never reads them**, and then describes the host with a word
("register-only") that denies the half it does do while asserting a dispatch
limitation whose stated cause is refuted.

## Approach

**Correct what is said; implement nothing that changes what Kanmer does to a
host.** Every wrong sentence in code, UI and manual is replaced by one that
matches the measurement, and the *reason* Antigravity is not dispatchable is
replaced with the true one — no workspace binding, so a dispatched agent would
run blind to the very MCP server Connect just registered — with [[MCP-015]]
named as the ticket that fixes it.

`dispatch` **stays `false`**, deliberately. The alternative — flipping it now,
which the evidence about `agy -p` alone would justify — was rejected: `dispatch.ts:115`
spawns with `cwd: root` and no binding, so `dispatchableProviders()` would put
Antigravity in the "Dispatch to agent →" menu and the dispatched agent could not
see the board. Shipping a dispatch that silently cannot see the board is a worse
defect than the label this ticket exists to fix. What changes is that
`dispatch: false` stops being justified by a refuted claim (`agy -p` "known-broken
piped, GH #318/#76") and starts being justified by the measured one.

The one addition beyond copy is a **connect-time note for Antigravity**, built on
the precedent already in the file: `codexTrustNote` (`providers.ts:369`) surfaces
a per-host conditional as a sentence in Connect's output rather than as a
capability tier, and `connect.ts:429-438` wires it. Antigravity's binding
condition is the same shape and the same moment — the user has just been told
"Registered Kanmer in `.agents/mcp_config.json`", which is true and, on its own,
misleading. Telling them there and then is the difference between "Kanmer records
the binding requirement" and "Kanmer records it somewhere the user will not look".

### Rejected alternatives

- **Flip `dispatch: true` with `--new-project` / `--add-dir` in `dispatchArgs`.**
  That is the binding, i.e. [[MCP-015]]'s scope, and it also decides dispatch
  configuration ([[GUI-075]]). Out.
- **Widen `listProviders()` to a capability record** (`{register, skills,
  dispatch, caveat}`). Tempting — the ticket asks, and the mislabel really is the
  renderer interpreting one boolean as a tier. Rejected as unearned here: it is a
  breaking change to an IPC-crossing return type with exactly one consumer
  (`Settings.tsx`) plus the `packages/ui` demo mock, and the badge is fixed
  correctly by naming what the boolean means ("no background dispatch") instead
  of what the renderer guessed it meant. When [[MCP-015]] flips `dispatch`, the
  badge disappears for Antigravity and the question dissolves; if a second
  per-host caveat ever needs a badge, the `codexTrustNote` pattern already shows
  where it goes. Recorded in `open-questions` as decided, not deferred silently.
- **Amend FRD-012 and ADR-0009.** Both were re-read at plan time against the
  merged tree: [[MCP-009]] (`c81063e`) already rewrote FRD-012 R2/R4/R5 and
  ADR-0009's method clause + convergence note, and both now carry the binding
  caveat and name MCP-015. There is nothing left for this ticket to say in
  either, and re-amending ADR-0009 is explicitly MCP-009's. See **Governing docs**.

## Governing docs

- **`docs/functional/frd/FRD-012-connect.md` (linked ref) — MEETS, unmodified.**
  - R2's Antigravity bullet already reads: both files "**are** read by `agy`, but
    **only in a session bound to a workspace folder**, and Kanmer establishes no
    binding today, so the write is correct and currently inert", owner **MCP-015**.
    That is exactly what this ticket must make the code and UI say; the change
    brings `providers.ts` and `Settings.tsx` **into line with R2** rather than
    changing R2.
  - AC2 already restricts the Antigravity check to a workspace-bound session,
    requires it be checked by invoking a skill and calling the MCP tool rather
    than grepping a tool list, and states it cannot pass until MCP-015 lands.
    This ticket does not claim AC2 for Antigravity and must not imply it does.
  - R5 (capability claims follow ADR-0009's method clause) is what this ticket is
    judged against — see below.
  - R1's "Antigravity — `.agents/mcp_config.json` (as shipped)" names the path and
    R2 carries the condition, so the research's earlier "R1 is incomplete" note is
    already answered. **No edit to FRD-012 in this ticket.**
- **`docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` — MEETS, and
  explicitly NOT amended.** Its method clause ("established against the installed
  binary, never inferred from the absence of evidence; a positive control is
  necessary but **not sufficient** — verify the mechanism, not a proxy for it")
  is repo policy, and its worked example *is* this ticket's adjudication. Every
  claim this ticket writes into code, UI or manual traces to a command that was
  run and its output; nothing is asserted about the Antigravity **IDE**, which was
  never exercised. The convergence note already carries the binding caveat.
  MCP-009 owns this file and has shipped; this ticket cites it and adds nothing.
- **ADR numbering:** grok's move to `.grok/config.toml` is **ADR-0013** (the
  duplicate ADR-0012 was renumbered). Nothing in this diff cites ADR-0012.
- **No new ADR.** Nothing here is a new design decision: the one judgement call
  (keep `dispatch: false` for a different, measured reason) is recorded in the
  code comment and owned as a *whole decision* by MCP-015.

## Steps

1. **`providers.ts:71`** — replace the `AgentProvider.dispatch` doc comment
   ("Headless dispatch supported in v1 (Phase 7)? antigravity is register-only.")
   with what the flag means and what it gates (`dispatchableProviders()` → the
   menu; `dispatch.ts` refuses non-dispatchable hosts), with no host-capability
   claim embedded in a type comment.
2. **`providers.ts:720-725`** — the antigravity entry:
   - keep the `.agents/skills` comment's true half and **add the binding
     condition** (it is read only in a workspace-bound session; one write still
     serves opencode and grok unconditionally);
   - delete "`agy -p` is known-broken piped (GH #318/#76) → register-only in v1"
     and replace it with the measured position: `agy -p` piped returns cleanly on
     1.1.13 (ten runs, two independent agents), so that justification is
     **refuted**; `dispatch` stays `false` because Kanmer establishes no workspace
     binding and `dispatch.ts` spawns with `cwd: root` only, so a dispatched agent
     would not see the board — [[MCP-015]] owns both. Record that GH #318/#76 were
     never fetched, per ADR-0009 (the behaviour was tested instead, which is the
     stronger check).
3. **`providers.ts`** — add `antigravityBindingNote()`, a pure exported function
   returning the one-sentence Connect caveat, sited beside `codexTrustNote` and
   documented as the same pattern. It states the measured CLI fact and the two
   binding flags, and says the Antigravity IDE was not tested rather than
   guessing about it.
4. **`connect.ts`** — append that note to the Antigravity branch of
   `connectAgent`'s config-file output, mirroring the existing `id === "codex"`
   block (one `if`, no control-flow change).
5. **`Settings.tsx:385`** — the panel blurb: opencode and Antigravity do **not**
   "only read skills globally"; both get a project `.agents/skills/` copy. Rewrite
   the sentence to describe the three delivery mechanisms truthfully (marketplace;
   project skills dir; project `.agents/skills` shared by opencode/Antigravity),
   keeping the AGENTS.md block as the universal orientation layer it is (ADR-0009,
   FRD-012 R3).
6. **`Settings.tsx:393`** — badge: `· register-only` → `· no background dispatch`.
   Same `!p.dispatch` source, so it cannot disagree with `dispatchableProviders()`
   — which is the ticket's second verification item.
7. **`providers.test.ts:132`** — retitle and rewrite the test so the suite states
   the *evidenced* capability instead of locking in the refuted one: Antigravity
   registers via `.agents/mcp_config.json` **and** installs project skills into
   `.agents/skills` (the two halves "register-only" denied), and is not
   dispatchable — with the reason in the test's comment. Keep
   `dispatchArgs === undefined`. Keep every existing config-path assertion.
8. **`docs/manual/connect.md`** — the host table's "Register-only — see below" and
   the whole `## "Register-only"` section are the same mislabel in end-user prose.
   Replace with: the table note "No background dispatch", a section naming that
   limitation accurately, and a short Antigravity section telling the user what
   Kanmer wrote and that `agy` reads it only in a folder-bound session (the
   actionable flags). Then regenerate `chapters.generated.ts` with
   `npm run build:manual` so `npm run check:manual` passes.
9. **Rail + proof**: `npm test`, `npm run typecheck`, `npm run check:manual`; a
   final `grep -rn "register-only"` over `apps/`, `docs/` and `plugins/` returning
   only historical plan documents; and a **live re-verification against the
   installed `agy` 1.1.13** of the two claims this diff newly asserts (piped
   `-p` returns; a bound session sees a workspace `.agents/` server that a bare
   session does not), with any machine state touched restored and the restore
   verified.

## Verification

`proof.md` is produced from, in order:

- `npm test` (includes `check:manual`), `npm run typecheck`, `npm run check:manual`
  — full output, from the **merged main** checkout at verify time.
- `apps/gui/src/main/providers.test.ts` — the rewritten Antigravity test, named
  for the capability rather than the label.
- The grep for `register-only` across shipped surfaces.
- The `agy` re-verification commands and their output (ticket verification item 3:
  Connect still writes both paths, and they are read under a binding).
- The ticket's three verification boxes, each answered with the artefact that
  answers it.

**Not claimed:** that a Kanmer-connected Antigravity session works out of the box.
It does not, and this ticket's whole point is that Kanmer now says so.

## Risks / open questions

- **Risk: fixing the label while leaving Kanmer inert reads as a whitewash.**
  Mitigated by steps 3-4 — the binding requirement is surfaced *in Connect's own
  output at connect time*, not only in a comment.
- **Risk: the new copy outlives its truth** (MCP-015 lands and "no background
  dispatch" becomes stale). Mitigated by deriving the badge from `dispatch` alone
  — MCP-015 flips the flag and the badge disappears with no copy edit — and by
  keeping the binding sentence in one exported function with one call site.
- **Risk: `kanmerGit.test.ts` flakes under parallel load** (pre-existing,
  [[GUI-085]]). Mitigation: rerun that file alone with `--testTimeout=30000`; do
  not treat a load flake as a signal from this diff.
- **Risk: touching machine state during `agy` re-verification.** Mitigation: probe
  in a throwaway directory, prefer `--add-dir` (persists nothing), and diff any
  `~/.gemini` file touched before and after.
- **Left to [[MCP-015]] and not attempted here:** establishing the binding
  (Connect and/or dispatch), the `agy plugin install` path, and flipping
  `dispatch`. **Left to [[MCP-009]]:** FRD-012 and ADR-0009, both already shipped.
