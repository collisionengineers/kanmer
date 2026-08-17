# MCP-013 — Plan: give the marketplace command the marketplace root, and stop hiding when it fails

Built from this ticket's `research` and `files`. Every command quoted below was
run before this plan was written, in an isolated profile, and its exit code is
recorded there.

## The approach, and why it beat the alternatives

### 1. Derive the marketplace root from the plugin root, rather than adding a second independent path function

`pluginRoot()` already knows both layouts (`<repo>/plugins/kanmer` in dev,
`<resources>/plugins/kanmer` packaged). The marketplace root is the same
directory minus exactly two segments, in **both** layouts. So:

```ts
function marketplaceRoot(): string { return resolve(pluginRoot(), "..", ".."); }
```

*Rejected:* a parallel `if (app.isPackaged) … else …` block. That is how these
two paths came apart in the first place — two functions each independently
correct about a layout, free to disagree the moment one is edited. Deriving one
from the other makes the invariant `<marketplaceRoot>/plugins/kanmer ===
pluginRoot()` structural rather than remembered, and a comment states it.

### 2. Report the failure through `ok: false` + the failing command, not a new field

The renderer already has the shape: `Settings.tsx:443-457` renders `ok: false` as
"Couldn't connect … **Run this yourself:**" with the exact command and a copy
button — which is FRD-012 **AC-4**, the copy-paste fallback the marketplace path
has never honoured. So the fix is to *use* the contract rather than extend it: no
renderer change, no new IPC surface, and the affordance that was already
specified starts working for these two hosts.

*Rejected:* keeping `ok: true` and merely appending "FAILED" to the note. The
user still gets a green tick, and the whole point of this ticket (per its body:
"the swallowing is the more important half") is that a green tick is the defect.

*Rejected:* throwing out of `installSkills`. `connectAgent` already wraps it in
`.catch()` at line 440, and unpicking that would lose the distinction that the
**registration succeeded** — which the output must still say, or the user will
reasonably conclude nothing worked.

Registration stays authoritative: the returned `output` says the server was
registered *and* which install command failed. Partial success is reported as
partial, not rounded in either direction.

### 3. Ship the two marketplace JSONs into `resources/`

Validated before planning (research Finding 3): a mirror of the proposed layout
was installed from, on both hosts, and a tool answered from inside it. The
relative `source: "./plugins/kanmer"` in each manifest resolves because the
packed layout preserves the same two segments the invariant above depends on.

### 4. Add codex's missing `codex plugin add`

`codex plugin marketplace add` leaves the plugin `not installed` (Finding 2).
codex's verb is `add`; there is no `install`. Twelve skills reach a codex session
once it runs. This is the same defect as the root — an install command that does
not install — and is skills-only, so it does not touch what [[MCP-016]] owns.

### 5. Rails, one per defect that could return

| Defect | Rail | Where |
|---|---|---|
| A hard-coded `kanmer@kanmer` drifting from its manifest | a test reads both marketplace manifests off disk and asserts each provider's `<plugin>@<marketplace>` string matches the one that defines it | `providers.test.ts` (`npm test`) |
| A marketplace manifest whose `source` stops resolving | assert `plugins[].source` → `plugins/kanmer` exists, for both schemas | `check-plugin-sync.mjs` (`plugin:check`) |
| `extraResources` dropping a manifest again | assert the block packs both JSONs **and** the plugin dir | `check-plugin-sync.mjs` (cheap, config-level) |
| The packed artifact missing them anyway | assert `resources/.claude-plugin/marketplace.json` and `resources/.agents/plugins/marketplace.json` exist in `win-unpacked` | `check-updater-package.mjs` (`dist:check`) |
| The swallow returning | a test whose marketplace command really exits non-zero, asserting `ok: false` and the command in the result | `connect.test.ts` (`npm test`) |

The last one is deliberately driven through the **real** `exec`, using a command
that genuinely fails (`node -e "process.exit(1)"`-shaped), not a mocked runner: a
stubbed seam can be satisfied by code that would still swallow a real subprocess
error. That is a proxy, and this ticket is about not accepting proxies.

## Steps

1. `connect.ts`: add `marketplaceRoot()` beside `pluginRoot()`, with the
   invariant stated in the comment.
2. `connect.ts`: rewrite `installSkills`'s marketplace branch to collect
   per-command outcomes instead of collapsing them to a note; return them so the
   caller can distinguish success from failure.
3. `connect.ts`: `connectAgent` — on a marketplace install failure return
   `ok: false`, `command` = the failing command, `output` = registration
   succeeded + the command's own stderr. `updateSkills` inherits it.
4. `providers.ts`: rename `localDir` → `marketplaceRoot` in `InstallSpec`; add
   `codex plugin add kanmer@kanmer-plugins`.
5. `electron-builder.yml`: pack both marketplace JSONs; fix the false comment.
6. Tests: the swallow test (real subprocess), the success test, and the
   manifest/marketplace-name test.
7. `check-plugin-sync.mjs` + `check-updater-package.mjs` rails.
8. FRD-012 R2: replace the two "Owner: MCP-013" bullets with what shipped; update
   the closing open-work list. R6/R7 are MCP-011's — untouched.
9. Rail: `npm test`, `npm run typecheck`, `npm run plugin:check` (**from the main
   checkout** — it refuses inside a linked worktree by design, MCP-007),
   `npm run verify:agents-block`.
10. Re-run the real install end-to-end in a clean profile against the branch and
    capture it for `proof`, verified **by calling a tool**.

## How proof will be produced

Not from an install success line — that is the proxy that hid this bug class.
`proof.md` carries, on merged main:

- `claude plugin marketplace add <repo root>` + `claude plugin install
  kanmer@kanmer` in a **fresh** `CLAUDE_CONFIG_DIR`, with exit codes;
- a `claude -p` call of `mcp__plugin_kanmer_kanmer__get_status` returning real
  board counts and `build: "plugin"`;
- the codex two-command install and `codex exec` reporting the 12 skills;
- the negative half: the old argument still failing, so the fix is shown to be
  the fix;
- the new test failing on the baseline (a swallow the assertion would have to
  catch), demonstrated rather than asserted;
- rail output.

## Risks

| Risk | Mitigation |
|---|---|
| A loud failure fires on a benign re-Connect | Measured: all five idempotent re-runs exit 0 (research Finding 4), including re-pointing a same-named marketplace at a different path — the packaged-app-after-repo-checkout case |
| A machine without `claude`/`codex` on PATH now shows a failed Connect | Correct and intended: the registration note still says the server was registered, and the copy-paste command is exactly what the user needs. This is FRD-012 AC-4 working |
| `plugin:check` refuses inside the worktree | Known (MCP-007); run it from the main checkout, recorded in proof |
| `kanmerGit.test.ts` flake under load | Pre-existing (GUI-085/GUI-089) — not chased, only noted if it appears |
| Editing `AGENTS.md` inadvertently | `git diff AGENTS.md` checked before every commit |

## Governing docs

- **FRD-012 (Connect)** — `refs`. R2's Claude and codex bullets currently
  *document this defect as open* and name MCP-013 as owner; this plan closes both
  and rewrites them to record what shipped, including codex's second command and
  the packaged-app marketplace source. The closing open-work list drops MCP-013.
  **R5** (ADR-0009's method clause) is met by the way every claim here was
  established: isolated profile, command + exit code, and the mechanism (a tool
  call, a skill roster in a live session) rather than a listing. **AC-4** (a
  failed command yields the exact copy-paste fallback) is *newly satisfied* for
  the two marketplace hosts — it was specified and unimplemented for them.
  **R6/R7** are MCP-011's and are not edited.
- **ADR-0009** — followed, not amended. Its amended rule is what made the
  research reject `codex mcp list`-style evidence and the install success line
  alike, and what forced the packaged-layout simulation before the packaging edit.
- **ADR-0007** (project scope) — unaffected: a plugin marketplace is a host-global
  install by the host's own design, unchanged by this ticket.
- **No new ADR.** Nothing here is a design decision without precedent: the path
  fix restores a stated invariant, the packaging change implements a written v2
  decision (`docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:30`), and the
  error surfacing implements an existing acceptance criterion.
