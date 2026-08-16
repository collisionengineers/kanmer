# Open questions — GUI-066

## OPERATOR ONLY — these cannot be decided by the planner or implementer

Both are about what the script does to a **public, already-tagged** release when
it is still broken after the one permitted repair pass. `14f2715` moved
`git push --tags` ahead of the publish, so by the time verification runs the
release is live and `/releases/latest` already points at it.

- [ ] **When the second (post-repair) verification still finds a gap, should the
      script demote the release so `/releases/latest` stops pointing at it — mark
      it `prerelease` or `draft` via the API — or leave it published and merely
      refuse?** Demoting means installed clients fall back to the previous *good*
      release and keep updating; leaving it published means every client sees a
      release whose manifest or installer 404s (the 0.3.1 state). Demoting is also
      destructive-ish and rewrites a public artifact without a human present.

- [ ] **Is a missing or corrupt `.exe.blockmap` a hard failure, or a loud
      warning?** The installer and `latest.yml` missing means clients are broken.
      A missing blockmap only means clients pay a full ~78 MB download instead of
      a differential one — degraded, not broken (this is exactly what 0.3.0
      shipped as, and the operator has accepted that gap). Making it fatal could
      block an otherwise working release after the tag is public; making it a
      warning re-creates the quiet failure this ticket exists to kill. Needs a
      severity call, not a coin flip.

## Planner decisions (recorded, not blocking — the plan should pick and justify)

- [x] **Where the test for the pure verifier lives, and what runs it.** There is
      no root vitest config, no root `devDependencies`, no test of any
      `scripts/*.mjs`, and no `node:test` usage in this repo; both vitest suites
      are workspace-scoped (`packages/core`, `apps/gui`). Options: (a) root
      `vitest.config.mjs` + root `vitest` devDependency + `test:scripts` folded
      into `npm test`; (b) `node:test` kept dependency-free, matching the other
      scripts' house style; (c) a `--self-test` mode on the script itself. (a)
      gets the fixtures into the release GATE for free; (b) preserves the
      dependency-free rule the scripts directory is explicit about. Plan picks.
- [x] **Behaviour when GitHub's `digest` field is absent on an asset.** Recorded
      default: degrade to `state` + `size` checks and say so loudly in the output,
      rather than crash or silently skip.
- [x] **Whether `latest.yml`'s recorded `sha512`/`size` are cross-checked against
      the local installer.** Cheap and catches a manifest that describes a
      different build; recorded as in scope for the plan.
- [x] **Verification transport.** REST `/repos/{owner}/{repo}/releases/tags/v<v>`
      with the token the script already requires, keeping the existing
      `/releases/latest` `tag_name` check (it tests a different thing: draft /
      prerelease invisibility).

## Parked (explicitly deferred)

- Backfilling v0.3.0's blockmap — **declined by the operator**; accepted gap,
  recorded in the plan, not a task.
- Extracting a shared local↔GitHub artifact-name helper between
  `check-updater-package.mjs` and the new verifier — optional cleanup, not
  required by this ticket.
- Verifying assets on *older* releases (a "no release has ever lost an asset"
  sweep) — attractive, but v0.3.0 would be permanently red by decision, so it
  needs an allowlist concept that this ticket does not owe.
- mac/linux/arm targets — none exist in `electron-builder.yml`; the expected-set
  derivation reads the disk rather than hardcoding, so adding them later does not
  silently narrow the check.
