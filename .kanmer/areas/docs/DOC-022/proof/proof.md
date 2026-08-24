# Proof — DOC-022: v0.3.5 release notes

## Merged artifact

- Pull request: [#246](https://github.com/collisionengineers/kanmer/pull/246)
- Reviewed head: `8a71a423c9dd3e210367af5a26357a6c52e6f364`
- Merged `main` commit: `e63a1090bfbda89f473a422817629eaadd1ed264`
- GitHub confirms the PR is `MERGED` at 2026-08-24T20:47:30Z.
- Verification used a clean disposable detached clone at the merge commit. After fetching, `origin/main` resolved to the same SHA. The root checkout and the Kanmer board worktree were not used for build output.

## Shipped scope and wording

`git diff-tree --name-only -r e63a1090bfbda89f473a422817629eaadd1ed264` reports exactly one changed path:

```text
apps/gui/release-notes.md
```

The first version headings are `## 0.3.5` then `## 0.3.4`. The new 0.3.5 entry says that tag-triggered release verification builds and checks the Windows updater package in explicit non-publishing mode; it separately names the governed local publisher as responsible for release creation/publication, and says verification never creates or repairs a GitHub Release or its assets. This accurately preserves the distinction and makes no v0.3.4 publication claim.

## Evidence

| Command / check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Exit 0 |
| `npm run build:core` | Exit 0 |
| `node --test scripts/release-notes.test.mjs` | Exit 0: 1/1 passed |
| `git diff --check e63a1090bfbda89f473a422817629eaadd1ed264^ e63a1090bfbda89f473a422817629eaadd1ed264` | Exit 0 |
| Merge path census, exact detached-SHA/origin-main ancestry, heading/wording contract, and tracked-clean check | Exit 0 (`DOC022_CONTRACT_ASSERTION_EXIT_0`) |

### Verification observation retained

The first focused repository test passed after the Core build. Three preliminary, local inline assertions then returned exit 1 before adding acceptance evidence: one wrongly expected a level-two title at byte zero, one over-escaped its regular expression, and one searched for a sentence that Markdown had wrapped across lines. Those were verifier-input mistakes, not repository test or source failures; no source or test was changed. The final structural assertion checks the actual document shape and permits Markdown whitespace in the sentence, then passed as recorded above.

## Result

**PASS.** The merged change is release-notes-only, puts 0.3.5 first, and accurately distinguishes explicit non-publishing tag verification from the separate governed local publisher. No tag, release, asset, publisher, workflow, or CORE-098 action was invoked during this verification.
