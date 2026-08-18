# Post-implementation report — DOC-010

## Summary

Added the user-facing procedure for connecting a private local Kanmer board to a ChatGPT developer-mode app through OpenAI Secure MCP Tunnel. The supplied tunnel client profile is initialized against the installed packaged stdio server, Windows quoting behavior is measured, the Cloudflare companion is classified precisely, and the manual explains how remote MCP calls directly update Kanmer's Markdown store.

## Changes

| File | Change | Why |
|---|---|---|
| `docs/manual/connect.md` | Added prerequisites, PowerShell configuration, remote-agent instructions, store behavior, security/lifecycle notes, and Cloudflare portability findings. | Give operators one reproducible, non-overengineered private-access path. |
| `README.md` | Added a pointer from manual MCP setup to the remote ChatGPT section. | Make the capability discoverable without duplicating its runbook. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerated the bundled 19-chapter manual. | Ship the authored guidance inside the desktop app. |

## Governing docs

- **FRD-022:** The implementation leaves the 30-tool stdio MCP contract unchanged and documents that remote tools call the same handlers and store as local clients.
- **FRD-024:** The Connect chapter now contains the task-oriented remote access procedure and is regenerated into the in-app manual.

## Exact tunnel and Cloudflare findings

- Profile: `C:\Users\Alex\AppData\Roaming\tunnel-client\kanmer-local.yaml`.
- Tunnel: `tunnel_6a84483eb6a8819180f63c29ee0c94cb`.
- Profile target: installed `Kanmer.exe` plus `resources/mcp/kanmer-mcp.cjs`, board root `.worktrees/kanmer`, and source checkout as `--repo-root`.
- Backslash paths failed v0.0.11 executable preflight; forward-slash absolute paths succeeded.
- The profile stores only `api_key: env:CONTROL_PLANE_API_KEY`; no secret is embedded.
- Bundled companion: cloudflared 2026.7.2, Go module pseudo-version `v0.0.0-20260715110107-8679787525ed`, upstream commit `8679787525edc8575b2948a7c4a50b6292c6d426`; tunnel-client maintainers own security patching.
- Generated production Cloudflare config uses a token file, disables cloudflared autoupdate, binds metrics to `127.0.0.1:20241`, selects automatic protocol/IP mode, retries 5 times, and allows a 30-second grace period.
- Classification: **reusable component only, not a reusable endpoint**. The outer daemon is explicitly an OpenAI control-plane client using `https://api.openai.com`, an OpenAI tunnel id/runtime key, and OpenAI organization/workspace association. No provider-neutral MCP URL is generated. A different provider needs local stdio support, its own bridge, or a separate authenticated HTTP MCP deployment.

## Risks / follow-ups

- `CONTROL_PLANE_API_KEY` was not present. Doctor loaded the profile but correctly failed its control-plane check with exit code 2. Live polling, ChatGPT tool discovery, and a remote ticket mutation remain unverified until the user supplies a runtime key through the environment.
- Kanmer updates replace the installed MCP process, so the tunnel runtime must be restarted afterward.
- No public Cloudflare tunnel was created; doing so would expand scope and require an HTTP MCP/authentication design.

## Verification hand-off

- `node packages/mcp-server/src/smoke.mjs` against the installed runtime/bundle: expect 156/156 checks.
- `npm run check:manual`: expect 19 chapters up to date.
- `npm run test -w @kanmer/gui -- manual.test.ts`: expect 11 passing tests.
- `npm run typecheck -w @kanmer/gui` and `git diff --check`: expect success.
- With `CONTROL_PLANE_API_KEY` set, run `tunnel-client doctor --profile kanmer-local --explain`, then `run`; confirm `/readyz`, connect ChatGPT, and perform create/update/archive calls against a disposable ticket.
