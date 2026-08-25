# Plan — DOC-025

## Governing documents

- FRD-021: the public release and updater need accurate release notes tied to the version.

## Steps

1. Add a new top-level `0.3.8` section to `apps/gui/release-notes.md`.
2. Describe only merged, user-observable behaviour and distinguish already-shipped product capability from pending operational verification.
3. Run the release-notes script tests, full repository verification, and a diff scope check.
4. Open a ticket-bound PR for independent review and protected-branch merge.
5. Verify the rendered merged file and write post-merge proof.
