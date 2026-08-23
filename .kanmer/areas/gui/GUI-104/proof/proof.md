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
