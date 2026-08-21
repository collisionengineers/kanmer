# Independent review — GUI-100

## Changes

- The diff switches only Codex project registration to the installer-owned portable cmd shim, adds a bounded explicit-argv probe before config mutation, and preserves Electron-as-Node invocation for other providers.
- Provider/config tests cover byte-identical rootless serialization, probe argv/options, failed-probe no-write behavior, and existing-provider compatibility.
- ADR-0012, FRD-012, the example config, and staleness regression are updated to describe the portable contract; no GUI-101/102 or real-host proof is smuggled into this PR.

## Comments and dispositions

- Blocking: none.
- Non-blocking: real packaged/update and cross-machine host proof remains explicitly downstream in GUI-101/GUI-102; accepted as scoped follow-up and not claimed here.
- No untracked root helper or unrelated source change remains on the author worktree.

## Verdict

PASS. PR #126 is clean, the report matches the diff and governing docs, open questions are resolved, and independent focused tests passed: providers/connect 91/91. Standing user delegation authorizes merge; author lane did not review or merge.
