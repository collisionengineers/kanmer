# Plan — MCP-049: Reconcile Kanmer remote access runtimes and tunnel supervision

## Objective

Leave one correct, supervised OpenAI Secure MCP Tunnel runtime and one healthy Kanmer-managed Cloudflare connector for this board, with no credentials committed and no new transport or provider resources.

## Starting state

- The operator-selected OpenAI profile authenticates successfully under Infisical, but its MCP command targets deleted temporary evidence roots and no native runtime alias exists.
- A stale older OpenAI profile also passes when its environment alias is manually mapped, creating an avoidable wrong-tunnel choice.
- The Cloudflare named tunnel and DNS route exist, and its locally managed credential plus executable are on device, but the intended tunnel has zero connectors because Kanmer’s GUI remote manager has no configuration.
- Kanmer already ships the required Cloudflare process/secret/autostart manager. Tunnel-client already ships the required native runtime supervisor.

## Governing docs

- **Meets** `docs/functional/frd/FRD-025-remote-access.md`: retain mandatory bearer authentication, a loopback-only HTTP MCP origin, exact hostname routing, provider-neutral Kanmer transport, redacted diagnostics, and owned-process cleanup. No FRD modification is needed.

## Required changes

- Rewrite the canonical OpenAI profile through tunnel-client’s supported profile workflow so it targets the real board/repository through the stable installed Kanmer launcher, retains an environment-only Infisical key reference, and uses its distinct loopback health port.
- Create one native managed runtime alias for that profile under Infisical injection. Require `process_running`, `healthy`, and `ready` from `runtimes status --json`; do not claim success from doctor alone.
- Retire the stale local profile/alias only after the canonical runtime is healthy. Do not delete the remote tunnel.
- Configure the shipped Kanmer GUI remote manager for the existing locally managed Cloudflare tunnel, existing credential file, downloaded executable, and `mcp.rivetandrelay.co.uk`; generate/store its bearer through Kanmer’s protected secret flow and enable autostart.
- Run local and public doctor checks, confirm the public route rejects missing/wrong bearer, completes MCP initialize with the expected project fingerprint, and remains healthy after one controlled Kanmer restart.
- Update the generic connection manual so future operators use the stable launcher, Infisical/environment mapping, and native `runtimes connect/status` supervision instead of a foreground-only, version-coupled command. Regenerate the committed manual mirror.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `docs/manual/connect.md` | Document the supported stable-launcher and native runtime-supervision path without project-specific values. |
| Regenerate | `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Keep the packaged manual byte-for-byte aligned with source. |
| Inspect/test | `apps/gui/src/main/remoteAccess/manager.ts` | Existing production caller; no new implementation unless execution proves a reproducible defect. |

Operational profile, runtime, GUI settings, protected secret, credential, and tunnel state stay outside Git.

## Do not modify

- Cloudflare tunnel/DNS resources, the unrelated healthy Cloudflare tunnel, OpenAI remote tunnel objects, release tags/assets, FRD-025, auth policy, or provider code unless a reproducible source defect blocks the existing production route.
- Never write secret values, provider identifiers, credential contents, bearer values, or machine-specific paths into the repository, ticket, logs, PR, or proof.

## Constraints

- Target is the existing personal OpenAI/Cloudflare accounts and this local Windows project only; no new tenant, project, region, or billable resource.
- Use only the already authenticated operator identities and least-privilege runtime/API tokens injected by Infisical.
- Infrastructure diff is zero: reconcile processes/configuration against existing resources. Pre-apply evidence is doctor plus redacted provider inventory.
- Expected incremental cost is zero. Rollback is to stop/remove the local runtime alias, stop/disable Kanmer remote access, and restore the previous profile file; remote resources remain unchanged.
- Preserve every failed attempt and exit code. No timeout/assertion weakening.

## Ordered steps

1. Create the ticket worktree/branch from current `origin/main`; confirm it is clean and read all ticket documents.
2. Back up only the two local profile files to an operator-private temporary location, then rewrite the canonical profile with the selected existing tunnel, stable installed launcher, real board/repository roots, Infisical environment reference, and unique health port. Validate with doctor.
3. Start/reuse one native runtime alias under `infisical run`; inspect JSON status and loopback readiness/UI. If status is not running+healthy+ready, stop and retain diagnostics.
4. Configure Kanmer’s existing Cloudflare manager through its production GUI/IPC path, using the on-device executable/credential and existing hostname/tunnel. Generate its bearer through the one-time protected flow and enable autostart.
5. Run Kanmer config/local/public doctor; verify bearer-negative behavior, authenticated SDK initialize, project identity, canonical tool policy, and session close. Restart Kanmer once and prove both the GUI-managed Cloudflare connector and OpenAI native runtime return healthy.
6. After the canonical OpenAI runtime passes, stop/remove only stale local profile/runtime metadata. Do not delete remote tunnels.
7. Update the generic manual with the measured supervision path and stable launcher; regenerate the manual mirror.
8. Run focused manual freshness/tests, full script tests relevant to launcher/remote access, typecheck, and diff checks. Write the post-implementation report with operational evidence and retained failures; open the bounded PR.

## Acceptance checks

- Production callers are tunnel-client native runtime supervision for OpenAI and `RemoteAccessManager.autoStart/start` for Cloudflare.
- OpenAI JSON status reports process running, healthy, and ready against the real Kanmer board; its local admin UI is loopback-only.
- Cloudflare API reports the intended tunnel healthy with at least one connection; public DNS remains on that tunnel; unauthenticated access is rejected and authenticated MCP returns the expected project.
- A controlled Kanmer restart re-establishes Cloudflare autostart and leaves the stable installed MCP launcher functional; no secret appears in repository diff, ticket docs, or captured output.
- Manual source and generated mirror are current; relevant tests and typechecks pass without weakened assertions.

## Commands

- `tunnel-client doctor --profile <canonical> --explain` under Infisical injection.
- `tunnel-client runtimes connect ...`, `runtimes status <alias> --json`, and loopback `/readyz` under Infisical injection.
- Kanmer GUI config/local/public doctor through the production IPC surface; installed MCP SDK `get_status` smoke.
- Redacted Cloudflare API inventory before/after (tunnel name/status/connection count and DNS target only).
- `node scripts/build-manual.mjs --check`, focused remote/manual tests, `npm run typecheck`, and `git diff --check` from the ticket worktree.

## Failure and deviation rules

Stop and record any auth, identity, provider readiness, public doctor, restart, cleanup, or test failure. Do not create replacement cloud resources, disclose secrets, edit provider code, widen bind/auth policy, lengthen deadlines, or add dependencies. A reproducible product defect becomes a separately dispositioned source change or follow-up ticket rather than silent redesign.

## Stop condition

Stop when both existing tunnel paths are supervised and verified, the minimal runbook correction is committed on MCP-049’s branch, the post-implementation report is complete, and the PR is open in Review. Do not merge during execution.
