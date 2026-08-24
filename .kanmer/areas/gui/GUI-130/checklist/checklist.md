# GUI-130 implementation checklist

## Implementation

- [x] Create the dedicated GUI-130 branch and worktree only after the ready execution packet is acknowledged.
- [x] Change only `apps/gui/package.json` so the existing GUI `test` script adds Vitest `--no-file-parallelism`.
- [x] Update `AGENTS.md` with the GUI package-local serial-file test convention and its Windows real-Git rationale.
- [x] Confirm no timeout, assertion, fixture, retry, root-runner, core, GUI-129, or production source change is present in the diff.
- [x] Commit the scoped change and record the full SHA: `8c7ae11128936c62f9996db5342933a6e6008706`.

## Verification

- [x] Run the explicit-prefix isolated-worktree install and core build; record resolved worktree path and exit codes.
- [x] Run the focused `index.sync.test.ts` command with the explicit prefix; record exit code and output.
- [x] Run the full GUI workspace test command with the explicit prefix; record exit code and output.
- [x] Run GUI typecheck and GUI build with the explicit prefix; record exit codes and output.
- [x] In a clean normal clone, run the explicit-prefix authoritative `npm run verify`; record resolved normal-clone path, exit code, and all failure output if any.
- [x] Preserve the prior failing normal-clone verification as separate evidence; do not relabel it as passed.

## Handoff

- [x] Write the post-implementation report with the exact diff, command outputs, prior failure disposition, commit, and PR URL.
- [x] Create a PR with the `Kanmer: GUI-130` footer only after the normal-clone verification exits 0.
- [x] Move GUI-130 from Implementing to Review only after rechecking document gates and recording the PR.
- [x] Stop for independent review; do not self-review, merge, write proof, or advance the ticket further.
