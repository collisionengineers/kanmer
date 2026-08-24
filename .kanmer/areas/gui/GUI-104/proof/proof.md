---
kind: proof-record
merged_sha: "ed4831b302e2310d319815be9c36d6fb34adb2fe"
prs:
  - "157"
result: PASS
verified_at: "2026-08-22T08:34:00Z"
---

## Merged-main verification

Verified on detached origin/main at merge commit ed4831b3, containing PR #157 and source head a663a62f. Hosted run 32559337159 completed with verify PASS (96998404249) and kanmer-gate PASS (96998404340).

Final detached rails on merged main: GUI vitest 41 files / 375 tests PASS; workspace npm run typecheck PASS; GUI electron-vite build PASS; npm run check:manual PASS with 22 chapters; npm run dist:check PASS with updater package 8/8; git diff --check PASS. The detached worktree used an explicit local @kanmer/core junction so the build resolved the merged-main core artifacts rather than the older root checkout artifacts.

## Preserved boundaries

Two concurrent OpenAI project profiles reaching only their intended live boards remains INCONCLUSIVE without disposable credentials, projects, and a documented listener probe. The implementation and proof claim no live control-plane or listener result, and no API-key value or tunnel identifier is recorded.

The production caller chain is GUI Settings → OpenAITunnelManager → packaged tunnel-client lifecycle and existing stdio MCP target.

## External operator evidence — 2026-08-23

The official OpenAI tunnel-client Windows amd64 release v0.0.12 was downloaded to a disposable temp directory and SHA-256 verified against its published SHA256SUMS.txt. With the project runtime credential supplied only through the Infisical-injected environment, doctor --config passed config/profile/tunnel-id/API-key-reference/packaged-stdio-target/health-listener checks (exit 0). A detached run --config instance reached /readyz and /healthz with HTTP 200, fetched tunnel metadata, started the OpenAI control-plane poller, launched the packaged Kanmer stdio target with ELECTRON_RUN_AS_NODE=1, and reported the tunnel client started. The exact owned process and child were then stopped; readiness disappeared and no long-lived verification process remained. The ticket's two-concurrent-project distinct-board proof remains INCONCLUSIVE because only one provisioned project/tunnel profile was available; no API-key value or tunnel identifier is recorded.

## Live two-profile and ChatGPT-link verification — 2026-08-24

- Two independently configured OpenAI tunnel-client profiles ran at the same time on distinct loopback health ports. Each passed `doctor --explain` with an environment key reference only, and both `/readyz` endpoints returned HTTP 200.
- The exact packaged-MCP command configured for the live profile resolved the real Kanmer board (`8 Verifying / 294 Done`). The exact command configured for the second profile resolved an isolated disposable verification board (`1 Review / 7 Verifying / 294 Done`). This is direct evidence that the concurrent profiles target different boards rather than merely occupying different ports.
- In the signed-in ChatGPT workspace, developer mode was already enabled. A developer-mode **Kanmer** app was created with the live tunnel selected, no separate MCP OAuth setting, and the user completed ChatGPT’s final Connect confirmation. ChatGPT then listed Kanmer under Installed apps.
- The second tunnel was intentionally not linked as a permanent ChatGPT app because it targets only the disposable verification board. No ChatGPT tool call was made as part of this verification; this record does not claim one.
- No runtime credential value or tunnel identifier was written to repository-tracked state, Kanmer documents, or this proof.

The previously INCONCLUSIVE two-profile local listener/board boundary is now PASS. The live ChatGPT app association is PASS; only a future explicit remote tool-call test remains optional operational evidence.
