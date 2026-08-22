# CORE-040 files

## Scope

- scripts/release-notes.test.mjs cutoff argument only.
- No production release publishing or board behavior changes.

## Evidence

- PR #145 hosted verify run 32543948316 / job 96959018333 reached scripts tests after CORE-039.
- Node 20 clean shallow checkout failed because git could not resolve tag v0.3.2; release-notes.test.mjs was 79/80.

## Out of scope

- CORE-039 disposable board fixture and KANMER_BOARD_ROOT seam.
- CORE-038 scripts glob enumeration and MCP-041 supervisor changes.
