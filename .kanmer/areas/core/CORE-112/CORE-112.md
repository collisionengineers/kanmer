---
id: CORE-112
type: ticket
title: >-
  Replace hand-written Codex registration TOML scanner with semantic TOML
  parsing
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - codex
  - toml
  - staleness
  - follow-up
groups:
  - HZN-010
links:
  - GUI-142
refs:
  - docs/functional/frd/FRD-012-connect.md
archived: false
created: '2026-08-26T18:29:27.041Z'
updated: '2026-09-05T02:15:10.629Z'
---

## Why

GUI-142 repaired the generated Windows Codex launcher contract, but its dependency-free hand-written TOML scanner cannot reliably classify every semantically equivalent user-formatted registration. Operator-authorized residual P2 findings from PR #281 are deferred here as one parser-class correction rather than more isolated regex patches.

## Outcome

Use the repository's existing `smol-toml` dependency to semantically parse the Codex registration and compare the complete effective contract. Cover quoted and bare table keys; comments and trailing commas; unrelated normal tables; unrelated arrays of tables; inline, dotted, and child-table environment encodings; exact command and argument comparison; the sole permitted `KANMER_BOARD_BRANCH` environment entry; and rejection of every other behavior-changing field. Remove the hand-written grammar scanner this supersedes rather than maintaining parallel parsers.

## Verification

Equivalent TOML encodings produce one semantic registration value and no false stale warning, while changed command/args, forbidden environment keys, cwd, roots, or other behavior-changing fields remain behind. Existing GUI-generated registration, reconnect, non-Windows, explicit-root, and plugin bundle tests remain green.

## Origin

Deferred non-blocking P2 findings from PR #281 / [[GUI-142]] under explicit operator authorization. This ticket is not a blocker for merging GUI-142.
