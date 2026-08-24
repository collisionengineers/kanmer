# v0.3.6 publisher result — 2026-08-24

Role: separate publisher only. No ticket take, review, merge, proof, status move, closeout, retry, tag repair, manual asset upload, or release edit was performed.

## Preconditions

One newly-created clean normal clone with GitHub origin was at protected `main` and full merge SHA `4c327f6c557541669b98fbb8e9981a984e0c91c4`; the SHA was reachable from `main`. All six release manifests were `0.3.6`, the release notes had a `0.3.6` heading, the tree was clean, and `v0.3.6` tag and GitHub Release were absent. Existing records remained: `v0.3.4` tag `102ba3b120cc3065943089d122a6172de8934ece` with no release, and `v0.3.5` tag `8a4b7d982b0c94c71a843782d0b6fb1db160025e` with no release. `npm ci --ignore-scripts` exited 0.

## One authorized invocation

The one process-scoped publisher invocation—credential kept only in that process and canonical `KANMER_ROOT` bound—ran:

`npm run release -- 0.3.6 --publish --release-commit 4c327f6c557541669b98fbb8e9981a984e0c91c4`

It completed the shared verification rail and GUI build, created/pushed `v0.3.6`, then exited **1**. Its internal one-time exact-file recovery was part of that sole invocation; no external retry or manual repair followed.

## Exact stop condition and public snapshot

The publisher refused the release as incomplete because expected asset `Kanmer-Setup-0.3.6.exe` was absent, while the release contained `Kanmer.Setup.0.3.6.exe`; the corresponding blockmap likewise has the dot form. The public release is non-draft and non-prerelease: https://github.com/collisionengineers/kanmer/releases/tag/v0.3.6

Read-only snapshot after exit:
- `v0.3.6` points to `4c327f6c557541669b98fbb8e9981a984e0c91c4`.
- Expected-name blockmap, `kanmer-0.3.6.mcpb`, and `latest.yml` are present; the installer and a duplicate blockmap use `Kanmer.Setup.0.3.6.*`.
- Release verification workflow is in progress: https://github.com/collisionengineers/kanmer/actions/runs/32785754328

No separate `verify-release-assets` command was run and no workflow wait/retry was performed after this stop condition.
