# Plan — MCP-016

## Profile: `spike` → **`fix`**, and why

`get_doc_gates MCP-016` reported the ticket as `spike`: one boundary,
`enter-done`, needing `research` + `questions-resolved`. That was the right
profile while this ticket was purely "decide something" — MCP-011 deliberately
left the decision to a separate ticket because *changing what a shipped plugin
advertises is a product decision, not a manifest fix*.

The decision has now been made by the operator (option 2), so what remains is
**not** a decision: it deletes a file from the shipped plugin, removes a key from
a manifest, inverts a rail assertion, amends a governing requirement and changes
user-facing README copy. Under `spike` that would reach Done on a research
document alone — **no `proof`, no `files`, no `plan`, and nothing on the board
that records the shipped behaviour was checked**. For a change that alters what
every future codex and Antigravity install receives, that under-evidences it,
and the specific thing it would skip (`proof`) is exactly the artefact this
ticket's own verification rule demands: a command log from calling a tool on the
host.

`fix` is the honest match — `leave-preparing` needs `files` + `plan` +
`questions-resolved`, `enter-done` needs `proof`. It is a *stricter* profile than
`spike` on both boundaries, so this is not a gate being dodged; it adds the proof
gate rather than removing one. `feature` was considered and rejected: there is no
new capability and no new user-facing surface — a capability is being withdrawn —
and its `governing-doc` gate is already satisfied by `refs` anyway.

The `research` document that `spike` would have required is written regardless
and carries the decision record, so nothing is lost by the switch.

## Approach

**Stop advertising, on both hosts, at the file each host actually reads.**

The research established that the two hosts reach the advertisement by different
routes, so removing it takes two edits, not one:

- **codex** resolves `.codex-plugin/plugin.json` and follows its
  `"mcpServers": "./.mcp.json"` key → **remove the key**.
- **`agy`** reads `plugins/kanmer/.mcp.json` at the plugin root *regardless of
  what any manifest points at* — measured, not assumed: it reported
  `source: "claude-code"` while copying the root `.mcp.json` verbatim → **delete
  the file**.

Either edit alone leaves one host still advertising a server that cannot run.

### Alternatives considered and rejected

- **Keep it (status quo, option 1 in the ticket).** Rejected by the operator, and
  the research supports it: the entry has never once launched on any release,
  and Connect already writes the working codex registration, so it is redundant
  even in principle rather than merely broken today.
- **Rescue it by editing the manifest.** Not possible. `cwd: "."` makes codex
  *start* the server, but discovery then runs from
  `~/.codex/plugins/cache/…` and correctly finds no board: locating the script
  needs cwd = plugin root, finding the board needs cwd = the workspace, and codex
  expresses only one. `agy` joins the relative path to the session cwd
  (`Cannot find module '…\agyprobe\mcp\kanmer-mcp.cjs'`), so no committed content
  reaches it at all.
- **Remove only the manifest key, keep `.mcp.json`.** Rejected on Finding 2 —
  `agy` would go on advertising it.
- **Empty `{"mcpServers":{}}` instead of deleting.** Rejected: it leaves the file
  a future contributor fills back in, and `agy`'s installer would still report an
  MCP component. Absence is the assertion the rail can hold.

## Steps

1. Worktree `.worktrees/mcp-016`, branch `mcp-016-plugin-mcp-scope`, off
   `origin/main`.
2. Delete `plugins/kanmer/.mcp.json`.
3. Remove `"mcpServers": "./.mcp.json"` from
   `plugins/kanmer/.codex-plugin/plugin.json`; leave every other key.
4. `scripts/check-plugin-sync.mjs` — invert the rail:
   - the manifest loop stops requiring the codex manifest to declare an
     `mcpServers` key, and instead **asserts it has none**;
   - **assert `plugins/kanmer/.mcp.json` does not exist**, with the reason
     inline (`agy` reads it regardless of the manifest);
   - drop `.mcp.json` from the no-`--root` loop; keep every `mcp/claude.mcp.json`
     rule unchanged;
   - rewrite the explanatory comment block, which currently states the two
     configs "must not be unified" as a pairing — after this ticket there is one.
5. Demonstrate each new assertion **failing** on a deliberately restored
   manifest/file, then restore.
6. `docs/functional/frd/FRD-012-connect.md` — amend **R6** (matrix rows and the
   reasoning), correct **R2**'s codex bullet, and close the MCP-016 entry in the
   "Open work" line.
7. `README.md` — reword the codex paragraph and add the Antigravity sentence.
8. Rail from the **main checkout**: `npm test`, `npm run typecheck`,
   `npm run plugin:check`, `npm run check:manual`, `npm run verify:agents-block`.
9. Host verification (below), then PR.

## Governing docs

`refs`: `docs/functional/frd/FRD-012-connect.md`.

- **FRD-012 R6** — *amended*, which is this ticket's stated job ("Update FRD-012
  R6 (the runtime matrix MCP-011 added) to match"). R6 today records that the
  bundled `.mcp.json` exists and is as correct as codex permits, and that "a
  codex plugin install still does not yield a working board … Tracked as
  MCP-016". After this ticket the matrix rows for codex and `agy` say **no server
  is advertised**, and R6 carries the reasoning the operator accepted: no `${…}`
  expansion on either host; unrescuable because the two required working
  directories are mutually exclusive; and **redundant in principle**, because
  Connect already writes `<repo>/.codex/config.toml` with absolute paths.
- **FRD-012 R2** — its codex bullet currently says "MCP-016 owns whether the
  plugin should keep advertising that server at all". Corrected to state the
  outcome.
- **FRD-012 R7** ("neither plugin manifest pins a board") — unaffected in
  substance; its wording narrows to the one remaining config.
- **ADR-0009**'s method clause — *followed, not amended*. Every claim below is
  established against the installed binary by calling a tool, with a positive
  control.
- **ADR-0012** (board discovery) — unaffected; `mcp/claude.mcp.json` still passes
  no `--root`.
- **No new ADR.** What is being recorded is a change to *what the product ships
  on which host* — a requirement, whose home is FRD-012 R6 where the matrix it
  amends already lives. It is not a new architectural constraint: the constraint
  ("the plugin does not advertise what it cannot deliver") is a consequence of
  ADR-0009's evidence rule applied to R6's measurements, not a new axis of
  decision. MCP-011 reached the same conclusion for the same reason. This also
  keeps the ticket clear of `check-doc-numbering`, which has caught three ADR
  number collisions today — a reason to prefer the FRD, not the reason.

## How proof will be produced

Per the ticket's own rule and ADR-0009: **call a tool on the host**, never read a
config listing. `codex mcp list` printing `enabled` for a server with zero tools
is the exact proxy that hid this defect, and the research reproduced it again on
the pre-change tree.

| Claim | Established by |
|---|---|
| **Before**: codex advertises a kanmer server that yields no tool | isolated `CODEX_HOME`, real `plugin marketplace add` + `plugin add`, then `codex exec` asked to call `get_status` → `NO_KANMER_MCP_TOOL`, beside `codex mcp list` → `enabled` (the proxy, recorded to show the contrast) |
| **After**: codex advertises none | same install, fresh `CODEX_HOME`; `codex exec` → `NO_KANMER_MCP_TOOL`, **and** `codex mcp list` now empty — the listing agreeing with the mechanism is itself the change |
| **After**: codex still gets 12 skills | `codex exec` asked to name the kanmer skills it can see (the positive control that the plugin still installs something) |
| **Before/After**: `agy` | `agy plugin install ./plugins/kanmer` → `mcpServers : 1 processed` becomes `skipped (not found)`; a session bound to a **Connect-free** folder goes from `Cannot find module …` to no `kanmer` server at all |
| **After**: Connect still works | `<repo>/.codex/config.toml` unchanged; `codex exec` in the repo with the **default** `CODEX_HOME` calls `get_status` → real board JSON. This is the positive control for the whole exercise: the same binary, the same tool, answering. |
| Rail | the five commands, from the main checkout |

Machine state: `~/.gemini/config` and `~/.gemini/skills` are snapshotted before
the `agy` probes and diffed after the uninstall; the codex probes run entirely in
a scratch `CODEX_HOME` and never touch `~/.codex`.

## Risks

| Risk | Mitigation |
|---|---|
| The `agy` probe measures Connect's identically-named `kanmer` server instead of the plugin's, and reports success either way | Probe only from a folder with **no** `.agents/mcp_config.json`. This already happened once during research and is written up as Finding 4. |
| `codex mcp list` used as the after-check | It is recorded, but never alone and never as the claim; the claim is always the `codex exec` tool call. |
| A future contributor recreates `.mcp.json` "to fix codex" | `plugin:check` asserts its absence by name with the reason inline, and each new assertion is demonstrated failing before it is trusted. |
| `plugin:check` refuses inside a linked worktree (MCP-007) and `npm install` there does not satisfy it (MCP-006) | Run the rail from the **main checkout** after the branch is available there. |
| MCP-013 touched the marketplace manifests, `electron-builder.yml` and possibly `.codex-plugin/plugin.json` | It merged as `f5c370e` before this work started; still `git fetch && git rebase origin/main` and re-read both manifests post-rebase before opening the PR. |
| `kanmerGit.test.ts` flakes under load (GUI-085) | Known pre-existing; not chased, and recorded if seen. |
| An `AGENTS.md` change slips in | `git diff AGENTS.md` before committing; the known-stale repo-map line is filed as a follow-up ticket instead. |
