# Open questions — GUI-066

## OPERATOR ONLY — both ANSWERED 2026-08-16 (verbatim in `scratch/operator-answers.md`)

Both were about what the script does to a **public, already-tagged** release when
it is still broken after the one permitted repair pass. `14f2715` moved
`git push --tags` ahead of the publish, so by the time verification runs the
release is live and `/releases/latest` already points at it.

- [x] **When the second (post-repair) verification still finds a gap, should the
      script demote the release so `/releases/latest` stops pointing at it — mark
      it `prerelease` or `draft` via the API — or leave it published and merely
      refuse?**
      **ANSWERED: NO demotion. Fail loudly, leave it published.** The script
      refuses and says precisely what is wrong and what to do — *including the
      manual demote command as a suggestion*. It does not rewrite a public
      artifact unattended. Release state is a judgement call and the operator
      wants to be told, not second-guessed. Use the house `refuse(why, fix)`
      idiom at `release.mjs:41-45`; a refusal that does not say what to do is
      half a refusal.

- [x] **Is a missing or corrupt `.exe.blockmap` a hard failure, or a loud
      warning?**
      **ANSWERED: HARD FAILURE.** Treat it like any other missing asset —
      verify, re-publish once, re-verify, then fail loudly. Making it a warning
      re-creates exactly the quiet failure this ticket exists to kill, which is
      how v0.3.0 shipped without one.

## Planner decisions (recorded and now decided in `plan.md`)

- [x] **Where the test for the pure verifier lives, and what runs it.**
      **DECIDED: `node:test` + `node:assert/strict`, as
      `"test:scripts": "node --test scripts/"` folded into the root `"test"`
      script.** Rationale in `plan.md` § "Test-runner decision": every file in
      `scripts/` states it is deliberately dependency-free, so a runner needing a
      root devDependency plus a root config contradicts the directory's one
      explicit rule; it avoids `package-lock.json` churn, which matters because
      `release.mjs:111-116` refuses on a dirty tree; `engines.node` is already
      `>=20`. Rejected: root vitest + devDep + `vitest.config.mjs` (lockfile
      churn, first-ever root devDependencies block, new config file), and a
      `--self-test` flag (mixes fixtures into a file that runs during a real
      release, and needs extra wiring to reach `npm test` anyway).
- [x] **Behaviour when GitHub's `digest` field is absent on an asset.** Degrade
      to `state` + `size` checks and say so loudly in the output, rather than
      crash or silently skip. Unit-tested.
- [x] **Whether `latest.yml`'s recorded `sha512`/`size` are cross-checked against
      the local installer.** Yes — in scope. Cheap, and it catches a manifest
      that describes a different build. Note the algorithm mismatch:
      `latest.yml` records sha512-base64 while GitHub's `digest` is sha256-hex,
      so the local file is the bridge and is hashed both ways.
- [x] **Verification transport.** REST `/repos/{owner}/{repo}/releases/tags/v<v>`
      with the token the script already requires, keeping the existing
      `/releases/latest` `tag_name` check (it tests a different thing: draft /
      prerelease invisibility).

## Parked (explicitly deferred)

- Backfilling v0.3.0's blockmap — **declined by the operator**; accepted gap,
  recorded in `plan.md` § "Accepted gap", not a task. Re-confirmed still missing
  on GitHub during planning.
- Extracting a shared local↔GitHub artifact-name helper between
  `check-updater-package.mjs` and the new verifier — optional cleanup, not
  required by this ticket.
- Verifying assets on *older* releases (a "no release has ever lost an asset"
  sweep) — attractive, but v0.3.0 would be permanently red by decision, so it
  needs an allowlist concept that this ticket does not owe.
- mac/linux/arm targets — none exist in `electron-builder.yml`; the expected-set
  derivation reads the disk rather than hardcoding, so adding them later does not
  silently narrow the check.
