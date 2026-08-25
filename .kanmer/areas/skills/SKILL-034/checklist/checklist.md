# Checklist — SKILL-034

- [x] Create and validate the dedicated SKILL-034 worktree/branch from current origin/main.
- [x] Preserve the v0.3.7 installed-layout missing-script failure.
- [x] Copy the canonical writer/body through the existing plugin build.
- [x] Commit the generated plugin scripts.
- [x] Make plugin:check reject missing or byte-drifted setup scripts.
- [x] Add exact installed-layout command and second-run idempotence coverage.
- [x] Preserve malformed-marker refusal coverage.
- [x] Update setup prose only if required for unambiguous relative resolution. (Not required: the existing relative command resolves correctly once the runtime ships.)
- [x] Update AGENTS.md for the packaging/check convention.
- [x] Run plugin build/check, agents-block verification, script tests, skill verification, and diff checks with exit 0.
- [x] Commit, push, open PR with `Kanmer: SKILL-034`, and record traceability.
- [x] Write/read the post-implementation report.
- [x] Move only to Review and stop for independent review.
