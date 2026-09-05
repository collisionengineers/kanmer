---
id: CORE-143
type: ticket
title: One heavy local verification permit with fencing
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - leases
  - verification
  - host-local
groups:
  - HZN-010
links:
  - CORE-134
refs:
  - docs/functional/frd/FRD-030-renewable-workspace-leases-and-batches.md
  - docs/functional/frd/FRD-029-logical-project-identity-and-endpoints.md
archived: false
created: '2026-09-05T02:13:28.532Z'
updated: '2026-09-05T02:13:28.532Z'
---

## Problem

Two agents on one host can each start a whole-repository build, integration suite or packaging run at the same time. In 0.4.2 this is controlled procedurally: the managed block names one heavy verification owner per host, implementers run scoped checks only, and `kanmer-verify` waits on an in-progress CI run rather than duplicating it. Nothing enforces it in software.

## Outcome

A thin host-local permit, reusing the existing lock primitive, that makes two heavy requests on one host serialize, lets identical requests share one result, and makes late or stale completions unable to publish an authoritative result. Lightweight file checks do not queue behind it. Hosted runners are a separate budget.

## Acceptance

- Two heavy requests do not overlap on one host; identical evidence keys attach to the running owner; different SHAs/profiles queue.
- Expired heartbeat with a live owner is not stolen; PID reuse is detected via process creation identity; a completion carrying an old fencing token is refused and retained as diagnostic only.
- Cancellation targets only the owned process tree; an interrupted runner leaves a recoverable persisted state; identity that cannot be established fails closed and asks for bounded operator intervention.
- Adversarial tests for each case above (pack acceptance rows AT-15 to AT-18).

## Out of scope

A network service or distributed lock; replacing ticket leases (a ticket lease controls work ownership, a permit controls machine resources); age-based cleanup.

## Technical seam

State file `~/.kanmer/permits/<projectFingerprint>.json` (precedent: `~/.kanmer/endpoints.json`, FRD-029), guarded by `withExclusiveFileLock` in `packages/core/src/io.ts` with `staleAfterMs`, `processAlive`, `processIdentity`. Fields: `version, fence, owner{pid,startedAt,processIdentity}, evidenceKey, commandProfile, state (queued|running|completed|failed|canceled|interrupted), heartbeatAt, expiresAt, consumers[]`. Wrapper `scripts/with-heavy-permit.mjs -- <command>`. Depends on [[CORE-134]] landing first so the identity probe is cheap and cached for self.
