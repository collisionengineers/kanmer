---
kind: proof-record
merged_sha: "ef0013448c93227aad16549d77a284743cdf01d5"
environment: "detached verification worktree C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/verify-mcp-055-ef001344 at ef0013448c93227aad16549d77a284743cdf01d5 (detached, clean); Windows 11 Pro 26200; node + npm workspaces; kanmer@0.4.0"
verified_at: "2026-09-02T02:25:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-02T01:53:20Z"
    command: "git worktree add --detach .worktrees/verify-mcp-055-ef001344 ef0013448c93227aad16549d77a284743cdf01d5"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "rev-parse HEAD = ef0013448c93227aad16549d77a284743cdf01d5; symbolic-ref --short -q HEAD empty (detached); status --short --branch = '## HEAD (no branch)' with no dirty entries. gh pr view 310 reported state MERGED, mergeCommit.oid ef001344..., baseRefName main, mergedAt 2026-09-02T01:51:08Z; git merge-base --is-ancestor ef001344 origin/main exited 0."
  - attempted_at: "2026-09-02T01:53:40Z"
    command: "npm install"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 0
    result: PASS
    summary: "added 647 packages, audited 652. package-lock.json md5 9a89e4c8b49a69f4ac24eb7bde110c8d before and after - the lockfile did not change; git status --short clean."
  - attempted_at: "2026-09-02T01:54:45Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 1
    result: INCONCLUSIVE
    summary: "Refused before evaluating anything: 'plugin:check refused: @kanmer/core cannot resolve from this checkout ... fix: run npm install in this checkout'. This is the MCP-007 checkout-ownership guard in scripts/check-plugin-sync.mjs, which requires a prior `npm run build` (the script's own header comment states this, and `npm run setup` is `npm install && npm run build`). No bundle, tool-name, frontmatter or manifest assertion was evaluated, so this attempt carries no verdict about the shipped change - it records a verifier ordering slip (the documented prerequisite build had not yet been run in the fresh worktree). Retained per the skill's requirement to keep every non-PASS attempt. The identical command passed at exit 0 twice afterwards at this same SHA."
  - attempted_at: "2026-09-02T01:55:14Z"
    command: "npm run build"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 0
    result: PASS
    summary: "@kanmer/core ESM build success; @kanmer/mcp-server tsup standalone build success (kanmer-mcp.cjs 1.97 MB, remote-cli.cjs 2.10 MB, doctor-cli.cjs 2.20 MB). Documented prerequisite for plugin:check's bundle byte comparison."
  - attempted_at: "2026-09-02T01:55:42Z"
    command: "npm run plugin:check"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 0
    result: PASS
    summary: "plugin-sync OK - 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.0, isolated MCP handshake lists 41 tools. The committed plugins/kanmer/mcp/kanmer-mcp.cjs is byte-identical to a fresh build of this SHA's source, so the packaged bundle really carries the ok() change."
  - attempted_at: "2026-09-02T01:56:02Z"
    command: "node --test packages/mcp-server/src/http.test.mjs"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 0
    result: PASS
    summary: "tests 5, pass 5, fail 0, duration 13626 ms. Includes the ticket's new assert.deepEqual(status.structuredContent.result, statusPayload) inside 'official HTTP and stdio clients expose the canonical policy with remote dispatch excluded'."
  - attempted_at: "2026-09-02T01:56:21Z"
    command: "KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 0
    result: PASS
    summary: "383/383 checks passed against the packaged bundle (build: plugin v0.4.0 sha 52df1b1f). Pre-existing structuredContent.project and WRONG_PROJECT error-shape assertions still pass unchanged; the error result still carries structuredContent.error with no result key."
  - attempted_at: "2026-09-02T01:57:37Z"
    command: "KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs node packages/mcp-server/src/smoke-protocol.mjs"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 0
    result: PASS
    summary: "54/54 checks passed on both negotiated protocol versions. Names the ticket's own regression check: 'PASS get_status structuredContent.result mirrors its text payload on 2024-11-05 (MCP-055) - [result, project]'."
  - attempted_at: "2026-09-02T01:58:03Z"
    command: "raw JSON-RPC probe over stdio: spawn `node plugins/kanmer/mcp/kanmer-mcp.cjs` from the verify worktree with cwd = the board worktree; initialize (2025-06-18) / notifications/initialized / tools/call get_status (read-only only)"
    cwd: "server argv from .worktrees/verify-mcp-055-ef001344; child process cwd = C:/Users/Alex/Documents/GitHub/kanmer/.worktrees/kanmer (board worktree, read-only calls only)"
    exit_code: 0
    result: PASS
    summary: "Server banner: 'kanmer-mcp ready - root: ...\\.worktrees\\kanmer (cwd), repo: ...\\kanmer (derived), build: plugin v0.4.0 sha 52df1b1f'; serverInfo kanmer 0.4.0. assert.deepEqual(Object.keys(structuredContent), ['result','project']) passed and assert.deepEqual(JSON.parse(content[0].text), structuredContent.result) passed. Payload is 3594 bytes with 21 top-level keys (projectRoot, repoRoot, rootSource, repoRootSource, server, repo, kanmerDir, exists, format, boardSource, project, compat, dispatch, leases, delivery, release, deploymentTracking, boardWorktree, boardSync, counts, warningsCount) - the real status payload, not the three-field stamp. The payload's own richer `project` key survives inside `result` while the top-level `project` stamp remains {project_id, board_id, fingerprint}, confirming the plan's reason for nesting under `result` rather than spreading. This reproduces the reported regression scenario against the real board and shows it fixed at the merged SHA."
  - attempted_at: "2026-09-02T01:58:12Z"
    command: "npm run verify"
    cwd: ".worktrees/verify-mcp-055-ef001344"
    exit_code: 0
    result: PASS
    summary: "Full repository rail green end to end, 01:58:12Z to 02:19:46Z (about 21.5 minutes), EXIT=0. Steps executed in order: npm run build; npm run build -w @kanmer/gui; npm test (check:manual, @kanmer/core, @kanmer/gui, mcp-server test:http, test:scripts); npm run typecheck; npm run verify:docs; smoke.mjs; smoke:headless; mcpb:check; smoke:protocol; smoke:discovery; verify:skills; verify:agents-block; plugin:check (final line: 'plugin-sync OK - 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.0, isolated MCP handshake lists 41 tools'). No failing step."
  - attempted_at: "2026-09-02T02:24:00Z"
    command: "manual check - in-host Claude Code rendering of a full tool payload against the packaged bundle"
    cwd: "n/a"
    exit_code: null
    result: NOT_APPLICABLE
    summary: "Deliberately not claimed here. An MCP server is bound at session start, so this verifier's own session is still driving the pre-fix installed v0.4.0 server and cannot observe the rebuilt bundle's rendering. Per review finding F-004 and the checklist's controller-approved adjustment, the in-host Claude Code rendering observation is deferred to CORE-137's promotion acceptance. Its machine-checkable substitute - the raw JSON-RPC probe against the packaged bundle with cwd = the board worktree - is recorded above as PASS."
---

# Proof — MCP-055

Verified at the exact GitHub merge SHA `ef0013448c93227aad16549d77a284743cdf01d5`
(PR [#310](https://github.com/collisionengineers/kanmer/pull/310), `state: MERGED`,
merged 2026-09-02T01:51:08Z into `main`, confirmed an ancestor of `origin/main`).
All work ran in the disposable detached worktree
`.worktrees/verify-mcp-055-ef001344`; the mutable `main` checkout, the board
worktree `.worktrees/kanmer`, and the implementation worktree `.worktrees/mcp-055`
were never modified, pulled, or switched.

## Result

`PASS`. Every named check ran and passed at the merged SHA: `npm run plugin:check`,
`node --test packages/mcp-server/src/http.test.mjs`, both smokes against the
packaged bundle (`KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`), the
ticket-specific raw JSON-RPC `get_status` probe, and the full `npm run verify` rail.

## Acceptance checks from the plan

| Acceptance check | Evidence |
|---|---|
| `content[0].text` and `structuredContent.result` are the same JSON for every successful call the smokes exercise | `smoke.mjs` 383/383, `smoke-protocol.mjs` 54/54 (named MCP-055 check on both protocol versions), `http.test.mjs` 5/5 |
| No existing `structuredContent.project` or `structuredContent.error` assertion changed value or location | Pre-existing project-stamp and `WRONG_PROJECT` assertions pass unchanged in both smokes; the probe shows the top-level `project` is still `{project_id, board_id, fingerprint}` |
| An error result's `structuredContent` has no `result` key | `smoke.mjs` `WRONG_PROJECT` case passes with `{error, project}` only |
| `npm run plugin:check` passes after the build | exit 0 — "bundle bytes match", so the committed bundle equals a fresh build of this SHA |
| A live client shows the full `get_status` payload | Substituted per the controller-approved checklist adjustment: raw JSON-RPC against the packaged bundle with cwd = the board worktree returns a 3594-byte, 21-key payload in `structuredContent.result`, not the 3-field stamp. See the deferral note below. |

## One non-zero exit, retained

The first `npm run plugin:check` (01:54:45Z) exited 1. It **refused before
evaluating any assertion** — the MCP-007 checkout-ownership guard requires a prior
`npm run build` so the bundle byte-comparison is made against an artefact built
where the check runs. That was a verifier ordering slip, not a property of the
shipped change: the documented prerequisite (`npm run setup` is `npm install &&
npm run build`) had not yet been run in the fresh worktree. It is classified
`INCONCLUSIVE` rather than `FAIL` because no check produced a verdict about the
artefact. The same command then passed at exit 0 twice at this same SHA — standalone
at 01:55:42Z and again as the final step of `npm run verify` at about 02:19:46Z. The
attempt is retained in full above; a later pass does not erase it.

## Deferred, not claimed

The in-host **Claude Code rendering** observation (review finding **F-004**, and the
ticket body's "a Claude Code session on the built bundle shows the full `get_status`
payload") is **explicitly not claimed by this proof**. An MCP server is bound at
session start, so this verifier's session is still driving the pre-fix installed
v0.4.0 server and structurally cannot observe the rebuilt bundle's rendering. That
observation is deferred to **CORE-137's promotion acceptance**. What this proof does
establish is the server-side half it depends on: the packaged bundle, run with the
real board as its root, returns the complete payload in `structuredContent.result`
alongside the `project` stamp — so any client that prefers `structuredContent` now
receives the whole result.
