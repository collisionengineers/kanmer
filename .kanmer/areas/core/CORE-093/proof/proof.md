# Proof — CORE-093

## Merged artifact

- PR #235 merged into `main` at `2146887195083de128ff54e38a16c1310ef5a1a2` on 2026-08-24.
- The merged workflow triggers `kanmer-gate` on `pull_request.edited`; the `verify` job explicitly skips that metadata-only action while continuing to run for code-changing events.
- The merged AGENTS guide documents the body/footer mapping, separate board worktree, tracked-ref fetch, gate command, and maintenance contract.

## Merged-main validation

Run in `C:\Users\Alex\Documents\GitHub\kanmer\.worktrees\core-093` detached at `origin/main` (`21468871`):

| Command | Result |
| --- | --- |
| `npm run test:scripts` | PASS, 98/98 |

## Hosted event evidence

- Code-change CI on PR #235 run `32720186025`: `kanmer-gate` PASS (54s); `verify` PASS (3m10s).
- Body-only edit of still-open PR #234 preserved the same head `f52f740661eff73ffaf21fcaefff8a938a3b2ee2` and created run `32720952512`: `kanmer-gate` PASS (49s); `verify` skipped. This proves the scoped trigger refreshes the body-derived gate without rerunning the full verification rail.

No provider configuration, secrets, or board policy semantics changed.
