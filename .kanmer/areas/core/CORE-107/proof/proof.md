---
kind: proof-record
merged_sha: "1034f6cfde7a61348da5dcc4db8bd8691bde0c7b"
environment: "fresh Windows exact-main publisher; GitHub draft release id 376364285"
verified_at: "2026-08-25T12:44:00.000Z"
result: FAIL
attempts:
  - attempted_at: "2026-08-25T11:43:00.000Z"
    command: "npm run release -- 0.3.9 --publish --release-commit 1034f6cfde7a61348da5dcc4db8bd8691bde0c7b"
    cwd: ".worktrees/core-107-release"
    exit_code: 1
    result: FAIL
    summary: "The canonical publisher built and uploaded all four assets to draft release 376364285, but tag-route draft verification returned 404 and publication stopped fail-closed."
  - attempted_at: "2026-08-25T11:46:00.000Z"
    command: "authenticated read-only inspection of GitHub draft release 376364285"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Confirmed the draft exists with all four canonical assets uploaded and SHA-256 digests; this diagnoses the failed verifier route but does not make the unpublished release successful."
  - attempted_at: "2026-08-25T11:47:00.000Z"
    command: "installed update, Codex Connect, Cloudflare, and OpenAI tunnel acceptance matrix"
    cwd: "installed Kanmer"
    exit_code: null
    result: INCONCLUSIVE
    summary: "Not executed because v0.3.9 remained an unpublished immutable draft and could not serve as the required public updater release."
---

# Verification outcome

FAIL. v0.3.9 is an immutable unpublished draft. The complete artifact upload succeeded, but the governed publisher correctly stopped when its tag-specific lookup could not inspect the draft. [[CORE-108]] fixed the defect for a higher release; [[CORE-109]] owns that successor. This ticket must remain a historical non-success and must not move to Done.
