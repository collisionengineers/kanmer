# Post-implementation report — MCP-049

## Result

Reconciled both existing transports without creating or deleting provider resources. The native OpenAI alias reports process-running, healthy, ready, and non-stale while using an environment-only key reference. A fresh bounded read-only `runtimes status <alias> --json` recheck exited 0 and returned those four states; provider identifiers, paths, PIDs, URLs, and log tails are intentionally not retained here. The installed Kanmer GUI owns the Cloudflare child, protected bearer, autostart, and restart lifecycle; after an exact installed restart it returned ready/connected and public doctor passed 26/26, including bearer-negative probes, authenticated official MCP initialize, project identity, tool policy, session close, DNS/TLS/no redirect, readiness, consistency, redaction, and no board mutation.

The stale incomplete GUI-side OpenAI registration exposed a source defect and was not edited by hand. [[GUI-139]] fixed, reviewed, merged, installed, and proved safe recovery; the redundant incomplete GUI record was then removed through production IPC after native runtime health was confirmed. The canonical native profile/runtime remains.

## Repository changes

Updated `docs/manual/connect.md` to use the stable installed launcher, require both `KANMER_PROVIDER_CWD` and `KANMER_BOARD_BRANCH` in the operator-private wrapper, and distinguish native `runtimes connect/status/stop/remove` supervision from the GUI's `init/doctor/run` controls. Regenerated `apps/gui/src/renderer/src/manual/chapters.generated.ts`. Updated the canonical managed AGENTS body, its installed-skill fenced mirror, and this repository's generated `AGENTS.md` so the new runtime command convention is maintained from one source. No provider credential, identifier, or machine-specific project value is committed.

## Review finding dispositions

- F-001 fixed: the canonical and generated AGENTS instructions now document the native runtime command boundary.
- F-002 fixed: the documented wrapper exports `KANMER_BOARD_BRANCH` as well as `KANMER_PROVIDER_CWD`.
- F-003 fixed: the manual no longer says GUI Initialize executes native runtime commands; it names the GUI's actual `init`, `doctor`, and owned `run` behavior.
- F-004 fixed: a fresh bounded native status query exited 0 with process-running, healthy, ready, and non-stale states.

## Attempts retained

- Manual freshness passed (22 chapters). The first all-workspace typecheck used a stale inherited linked dependency tree and failed on missing current core exports; after `npm ci` and `npm run build:core`, all-workspace typecheck passed. `git diff --check` passed.
- The first exact installed restart public doctors returned intermediary/502 failures because a bounded manual Cloudflare probe launched during diagnosis had remained as a second connector to a deliberately dead origin. That exact owned process was identified by command line and creation time and terminated; after provider propagation the public route returned 401 with a bearer challenge and packaged public doctor passed 26/26. No unrelated process or remote resource was changed.
- The OpenAI GUI settings file initially failed closed as `OPENAI_TUNNEL_SETTINGS_INVALID`; [[GUI-139]] records the full source/review/install resolution.
- After review corrections: managed-block verification passed 31/31, manual freshness passed 22 chapters, script tests passed 111/111, GUI-139 focused recovery tests passed 14/14, all-workspace typecheck passed, and `git diff --check` passed.
- The first rebased hosted rail failed at `plugin:check` because changing the canonical setup body requires regenerating its packaged runtime copy. `npm run plugin:build` updated only `plugins/kanmer/scripts/agents-block-body.mjs`; `npm run plugin:check` then passed with 37 tools, matching bundle bytes, 12 parsed skills, and an isolated 37-tool handshake. The failed hosted attempt remains part of the record.

## Cleanup

The temporary manual Cloudflare connector is stopped. Only the GUI-owned Cloudflare child remains for this named tunnel. The native OpenAI alias remains intentionally running and healthy. Provider tunnel/DNS objects are unchanged, and no secret-bearing output is retained.
