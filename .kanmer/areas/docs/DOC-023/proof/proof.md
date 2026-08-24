# Verification proof — DOC-023

## Merged target

- PR [#249](https://github.com/collisionengineers/kanmer/pull/249) merged normally at `d1d61506435151b73dc04c9fcff18c74656ab4a8` on 2026-08-24.
- A disposable clean clone of protected `main` resolved `HEAD` to that exact SHA; `git merge-base --is-ancestor d1d61506435151b73dc04c9fcff18c74656ab4a8 HEAD` exited 0.

## Evidence

| Check | Result |
|---|---|
| Hosted PR `verify` | PASS — run 32783264493, 4m10s |
| Hosted `kanmer-gate` rerun | PASS — same run after the pre-Review snapshot was preserved |
| Merge diff scope | PASS — exactly `apps/gui/release-notes.md`; the merged diff adds only the v0.3.6 pre-tag GUI-build/non-publishing-workflow wording |
| `git diff --check <merge>^ <merge>` | PASS — exit 0 |
| `npm ci --ignore-scripts` in clean clone | PASS — exit 0; package audit warnings reported by npm but no install failure |
| `npm run build -w @kanmer/core` | PASS — exit 0 |
| `node --test scripts/release-notes.test.mjs` | PASS — exit 0, 1/1 |
| Clean clone status after checks | PASS — no tracked changes |

The rendered merged text states that the governed local publisher builds the Windows GUI before creating/pushing a release tag, so a GUI-build failure stops before a tag or GitHub Release; it separately says the tag workflow is non-publishing package verification. This meets FRD-021 R3's release-notes discipline and does not claim v0.3.4/v0.3.5 became public releases.

## Preserved verification limitations

- First clean clone used depth 1; `git diff <merge>^ <merge>` exited 128 because the parent was unavailable. The clone was extended to depth 2 before retrying the diff/test sequence; no source, board, tag, release, or asset changed.
- The first diff-scope invocation used `git diff --exit-code` on the intended nonempty merge diff and exited 1, correctly printing the one-file change. The corrected assertion used `--name-only` plus `--check` and passed. The exit-1 result is retained rather than treated as a product failure.
- This verification does not publish, tag, create a GitHub Release, or create assets. Those actions remain solely in [[CORE-099]].
