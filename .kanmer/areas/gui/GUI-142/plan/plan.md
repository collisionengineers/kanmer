# Plan

## Objective
Repair GUI Connect's Windows Codex registration so Codex can start Kanmer's installer-owned local STDIO launcher with ordinary argv serialization.

## Starting state
The current descriptor invokes cmd.exe with a quoted launcher argument. In Codex this reaches cmd.exe as a literal quoted executable path and fails before MCP initialization. A portable PowerShell invocation using Join-Path with LOCALAPPDATA has been manually proven to return the launcher health response and a valid MCP initialize/get_status response.

## Governing docs
- docs/functional/frd/FRD-012-connect.md — Connect must generate and reconcile a portable project-scoped Codex registration.

## Required changes
1. Replace codexPortableInvocation in apps/gui/src/main/providers.ts with command powershell.exe and arguments -NoProfile, -ExecutionPolicy, Bypass, -Command, and & (Join-Path $env:LOCALAPPDATA 'Kanmer\bin\kanmer-mcp.cmd'). Retain an empty invocation environment and never substitute an absolute username path.
2. Keep codexPortableProbeInvocation derived from the canonical descriptor so its probe command appends --probe without changing the base portable path.
3. Update provider, Connect, and staleness recognition/tests to treat the PowerShell form as current and the cmd.exe form as legacy/replaced on reconnect.
4. Add an execution-level Windows test that launches the exact generated descriptor through normal Node child-process argument serialization, writes MCP initialize/initialized/tools/list/get_status frames, and asserts a valid Kanmer result. Skip only on non-Windows platforms with an explicit platform condition. Use a temporary LOCALAPPDATA path containing spaces and a copied test launcher or fixture so it cannot pass because of this developer's username.
5. Update the manual example, README, and AGENTS.md command-convention text.

## Constraints
- Use the installer-owned %LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd path through runtime environment expansion only.
- Do not alter remote HTTP, tunnel, OAuth, Cloudflare configuration, or application identity.
- Preserve unrelated user changes already present on main.
- No dependencies.

## Ordered steps
1. Create the ticket worktree from origin/main and take GUI-142.
2. Implement the portable PowerShell invocation and adjust derived probe logic.
3. Update merge/reconnect and staleness behavior plus unit expectations.
4. Add the Windows subprocess MCP handshake regression test.
5. Update user and contributor documentation.
6. Run focused GUI/core tests, build, plugin sync, and installer package checks; record exact exits.
7. Write the implementation report, commit only ticket files, push, and open a PR with Kanmer: GUI-142.

## Acceptance checks
- A generated registration uses PowerShell and no cmd.exe quoting wrapper.
- Normal serialized execution can initialize the MCP server and call get_status.
- Reconnect produces the new descriptor and staleness sees it as current.
- Docs and example match generated output.

## Commands
- npm run test --workspace @kanmer/gui
- npm run test --workspace @kanmer/core
- npm run build
- npm run plugin:check
- npm run package --workspace @kanmer/gui (or the repository's packaging check if this script is named differently)

## Failure and deviation rules
Stop and record any failure. Do not weaken assertions. If the installer packaging command differs or existing unrelated dirty files prevent an isolated commit, report the exact conflict rather than absorbing those files.

## Stop condition
Stop after one GUI-142 PR is open and the ticket is moved to Review; independent review and merge are required before OAuth work starts.

## Review correction set
- Preserve the launcher's non-zero exit status in the PowerShell probe with `exit $LASTEXITCODE` and cover it with a Windows process test.
- Update FRD-012 R1e to approve the PowerShell contract and its exact probe semantics.
- Restrict descriptor staleness judgement to Windows and compare the full TOML command/args contract.
- Re-run the PR only after the board has been synchronized through Kanmer so CI can resolve GUI-142.
