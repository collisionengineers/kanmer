---
kind: review-attestation
pr: "261"
head_sha: "21e7828e0827b5268c235390404d12bdfd78d4af"
verdict: needs-changes
reviewer: "codex-doc021-review"
independent: true
plan_hash: "ec8f86d87ee55e01"
ticket_updated: "2026-08-25T04:48:41.274Z"
findings:
  - id: F-001
    severity: major
    summary: "The manager can resolve startup as ready before the corrected loopback ready event is processed."
    disposition: open
---

# Independent review — GUI-136 / PR #261

I reviewed the full packet, HZN-007 context, FRD-025, exact PR diff, hosted check state, and GitHub review/comments/threads. The reviewed head is 21e7828e0827b5268c235390404d12bdfd78d4af; the PR had no review threads or general comments at review time.

## Scope assessment

The additive localEndpoint result preserves the public endpoint return contract, and the child ready event now carries the loopback endpoint. The host and direct ready-event tests pass, but they do not exercise the full emitted-status sequence.

## F-001 — open major finding

KanmerRemoteHost emits status changes while its supervisor starts. When the provider reaches running, remote-cli emits a kanmer-mcp-remote-status line before remote.start() returns and before it writes the corrected kanmer-mcp-remote-ready line. The manager currently maps any status with provider === "running" to state ready, retaining the previous endpoint when the status endpoint is absent or public. startNow() resolves as soon as it observes any ready status. Therefore startup can resolve with a null/rejected public endpoint before the later canonical loopback ready event arrives, leaving the doctor race from the reproduction intact.

The new manager test writes only the final ready event, so it cannot expose this order. Fix the manager protocol transition so a provider-running status alone cannot resolve startup without a canonical loopback endpoint, and add a regression that emits the real status-before-ready sequence and proves both start() and doctor input use the loopback origin. Preserve the public endpoint contract and the fail-closed trust check.

No Cloudflare, credential, storage, tunnel-resource, or dependency change is warranted. The stated focused build, remote-host test, manager test, full typecheck, and diff check completed successfully, but they are insufficient to justify a pass because F-001 remains open.
