# GUI-114 open questions

## Resolved

- [x] Which provider needs the fix? Claude’s project CLI registration is the
  only current Connect path that interpolates `Invocation.env` into a shell
  command; Codex/OpenCode are file merges and native plugins already use the
  GUI-113 argv/staging path.
- [x] Which execution boundary is authoritative? Production must use discrete
  executable/argv values; a rendered command remains only a human fallback.
- [x] Does the fix need a dependency? No; Node’s existing `execFile` seam is
  sufficient.

## Parked (explicitly deferred)

- [x] Hosted branch protection and a real Claude installation are unavailable
  in this lane; retain deterministic argv evidence and mark live proof
  INCONCLUSIVE.
