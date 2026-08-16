# Checklist — GUI-066

*Derived from plan.md, one box per step.*

- [ ] Write `scripts/verify-release-assets.mjs`: `expectedAssets({version, localDir})` (version-filtered, space→dash renamed, `latest.yml` always required-present, sanity floor), `verifyAssets({expected, assets})` pure → `{ok, problems[]}`, `fetchReleaseAssets({owner, repo, tag, token, fetchImpl})` with distinct 404 / rate-limit / malformed-JSON error kinds, `formatProblems()`. Dependency-free.
- [ ] Add the CLI entry: `node scripts/verify-release-assets.mjs <version> [--dir <localDir>]`, non-zero exit on hard failure.
- [ ] Write `scripts/verify-release-assets.test.mjs` (`node:test`): golden fixtures v0.3.0 FAIL / v0.3.1 PASS / v0.3.2 PASS, plus `state:"starter"`, 412-byte exe, size mismatch, digest mismatch, `digest:null` degrade, space-named asset, extra asset informational, empty-set sanity floor, and stubbed `fetchImpl` for 404 / rate-limit / malformed JSON.
- [ ] Wire the runner: root `package.json` gains `"test:scripts": "node --test scripts/"`, folded into `"test"`. No devDependency, no lockfile change, no new config file.
- [ ] Rewrite `release.mjs` §9 to use the module; keep the `/releases/latest` `tag_name` check; on a gap run exactly ONE repair `npx electron-builder --win --publish always` in `guiDir`, re-verify, then `refuse()` with the problem list and the manual demote command as the fix. Do not demote.
- [ ] Set `process.env.EP_GH_IGNORE_TIME = "true"` near the top of `release.mjs`, before both packs, with the comment explaining why it is load-bearing.
- [ ] Update the dry-run narration (step 7 line) and the residual manual checklist so neither promises the weaker behaviour.
- [ ] Update `AGENTS.md` §6 (command table) and §8 gotcha 11.
- [ ] Add an "Amended — GUI-066" section to `docs/functional/frd/FRD-021-auto-update.md` recording R3's as-built behaviour.
- [ ] Verification run: `npm test`, `npm run typecheck`, plus `node scripts/verify-release-assets.mjs 0.3.2` (PASS) and `node scripts/verify-release-assets.mjs 0.3.0` (FAIL: blockmap) — this box produces proof.md. DO NOT run the release script.

## Progress notes
