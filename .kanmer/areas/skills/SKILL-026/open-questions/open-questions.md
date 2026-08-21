# Open questions — SKILL-026

## Resolved

- [x] What constitutes setup in this integration proof? The existing sequence: copy the canonical skeleton when absent, then invoke `writeManagedBlock()` with its canonical conduct body.
- [x] What should tampering prove? The real staleness detector must return `agents-block: behind`, preserving ADR-0015's discovered content-hash model.
- [x] What does removal preserve? All user-owned skeleton/human prose outside the marker span; only the managed block is removed.
- [x] Does this require a new product behavior? No. It is a durable regression test of already shipped behavior.

## Parked (explicitly deferred)

- None.
