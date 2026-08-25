# Post-implementation report — MCP-049

## Result

Reconciled both existing transports without creating or deleting provider resources. The native OpenAI alias `kanmer-board` reports process-running, healthy, ready, and non-stale while using an environment-only key reference. The installed Kanmer GUI owns the Cloudflare child, protected bearer, autostart, and restart lifecycle; after an exact installed restart it returned ready/connected and public doctor passed 26/26, including bearer-negative probes, authenticated official MCP initialize, project identity, tool policy, session close, DNS/TLS/no redirect, readiness, consistency, redaction, and no board mutation.

The stale incomplete GUI-side OpenAI registration exposed a source defect and was not edited by hand. [[GUI-139]] fixed, reviewed, merged, installed, and proved safe recovery; the redundant incomplete GUI record was then removed through production IPC after native runtime health was confirmed. The canonical native profile/runtime remains.

## Repository changes

Updated `docs/manual/connect.md` to use the stable installed launcher, environment/Infisical key reference, and native `runtimes connect/status` supervision. Regenerated `apps/gui/src/renderer/src/manual/chapters.generated.ts`. No provider code, dependency, secret, identifier, or machine-specific project value is committed. Commit `4b20eab9f0a2c0a4bba141ddeb21afee6e42b373`.

## Attempts retained

- Manual freshness passed (22 chapters). The first all-workspace typecheck used a stale inherited linked dependency tree and failed on missing current core exports; after `npm ci` and `npm run build:core`, all-workspace typecheck passed. `git diff --check` passed.
- The first exact installed restart public doctors returned intermediary/502 failures because a bounded manual Cloudflare probe launched during diagnosis had remained as a second connector to a deliberately dead origin. That exact owned process was identified by command line and creation time and terminated; after provider propagation the public route returned 401 with a bearer challenge and packaged public doctor passed 26/26. No unrelated process or remote resource was changed.
- The OpenAI GUI settings file initially failed closed as `OPENAI_TUNNEL_SETTINGS_INVALID`; [[GUI-139]] records the full source/review/install resolution.

## Cleanup

The temporary manual Cloudflare connector is stopped. Only the GUI-owned Cloudflare child remains for this named tunnel. The native OpenAI alias remains intentionally running and healthy. Provider tunnel/DNS objects are unchanged, and no secret-bearing output is retained.
