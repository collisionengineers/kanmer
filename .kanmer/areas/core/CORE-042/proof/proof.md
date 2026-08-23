---
kind: proof-record
merged_sha: "e141dca74bec48e7e8068b767f6db9e7a5c41322"
prs:
  - "160"
result: PASS
verified_at: "2026-08-22T08:12:00Z"
---

## Verification

Verified merged main at e141dca74bec48e7e8068b767f6db9e7a5c41322 after PR #160.

- npm run build:core: PASS.
- npm run test:scripts: 88/88 PASS on merged main.
- node --check scripts/release.mjs: PASS.
- node --check scripts/release-flow.mjs: PASS.
- git diff --check HEAD^1..HEAD: PASS.
- Hosted run 32561171744: kanmer-gate PASS (97002806183), authoritative verify PASS (97002806329).
- Independent re-review at head 9ab4af5a7341f0e16ff3748880e4f2c16f58292e: PASS; findings F-001–F-003 fixed; attestation version 86837874670fb59e.

The release flow now keeps preparation on release/v<version>, uses the operator's gh auth session, writes a dynamic standalone Kanmer: <id> footer, and requires the full post-merge SHA before tag publication. No tag or release asset was created during this proof.

### External boundary

Authorized PR merge is evidenced by merge commit e141dca7. Public tag publication, publisher/upload integrity, latest-release visibility, and a real two-version installed updater cycle remain INCONCLUSIVE because this verification did not run a production release or disposable installed-host cycle. No external success is claimed.


## Public release integrity repair — 2026-08-23

- The protected-main release flow was exercised against the existing exact tag v0.3.3 at 240e269d5ce1ac05c4e74ac30cc45eeb75968151. A clean tagged checkout produced a coherent Windows package (npm run dist:check, updater package 7 checks).
- Public verify-release-assets.mjs initially detected mismatched published installer/blockmap/manifest bytes. Exact tag-built assets were then uploaded with gh release upload --clobber, temporary duplicate upload names were removed, and the public check was rerun.
- Final public asset verification exited 0 with the expected three assets and matching size/SHA-256 metadata. No source or branch-protection bypass was used.
- A two-version installed updater cycle and protected disposable-repository proof remain INCONCLUSIVE; CORE-042 stays Verifying.

## Independent merged-main rerun — 2026-08-23T14:04Z

Verification ran in detached worktree at origin/main `8554c733aac5817e99909622e062d022d6c12be3`; PR #160 remains MERGED at `e141dca74bec48e7e8068b767f6db9e7a5c41322`.

- `node --test scripts/release-flow.test.mjs`: PASS, 5/5; `node --check scripts/release.mjs`: PASS; `node --check scripts/release-flow.mjs`: PASS.
- `npm run test:scripts`: PASS, 98/98; `npm run typecheck`: PASS (all workspaces); `npm run build:core` and `npm run build:server`: PASS; `npm run dist:check`: PASS, updater package 8/8; `git diff --check`: PASS.
- Authoritative `npm run verify`: FAIL (exit 1) at five unrelated Windows timing/cleanup core tests (io stale-lock; docs profile matrix; migrate folded-id and migrated-board; store area-id), including ENOTEMPTY cleanup.

The protected release-flow code is current and deterministic rails pass. The two-version installed updater cycle and protected disposable-repository proof remain INCONCLUSIVE; CORE-042 stays Verifying and is not moved or closed.
