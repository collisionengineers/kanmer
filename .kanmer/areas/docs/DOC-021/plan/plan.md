# Plan — DOC-021: document v0.3.4 release notes

## Objective

Land the accurate v0.3.4 user-facing release notes in a normal protected-main documentation PR so CORE-096 can later run the version-release script from a clean checkout.

## Evidence basis

- The v0.3.3 tag predates four merged, user-visible changes already grouped at the top of the current release-notes file: native Grok plugin support, native Antigravity plugin support, Windows launcher repair, and staged external runtime support.
- Current-main additions also cover project-declared source preferences and more resilient Windows connection/remote-access setup.
- The release script verifies the top release-notes heading matches the requested version and refuses a dirty preparation checkout.

## Change

1. Create an isolated DOC-021 branch from current origin/main.
2. Change only apps/gui/release-notes.md:
   - name the top unreleased section 0.3.4;
   - retain the existing post-v0.3.3 notes under it;
   - add concise, accurate sections for source-preference boundaries and Windows connection/remote-access resilience;
   - insert a 0.3.3 heading before prior shipped content.
3. Run the focused release-notes test and git diff --check; then open a normal PR.
4. Stop in Review for independent review and protected-main merge. Do not create tags or run the publish phase.

## Boundaries

- Do not change release script behavior, versions, manifests, generated artifacts, assets, CI, publishing settings, branch protection, or Cloudflare configuration.
- The author does not self-review or merge.
- CORE-096 resumes only after this PR normally merges and records its merge SHA.

## Acceptance checks

- Diff is exactly apps/gui/release-notes.md.
- The focused release-notes test and diff check pass.
- Independent review and required GitHub checks pass before merge.
- Evidence records PR and merge SHA without secrets.

## Stop condition

Stop when the documentation PR is open and the ticket has entered Review.
