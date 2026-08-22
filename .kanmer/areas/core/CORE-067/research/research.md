# Research

## Finding

At cumulative CORE-058 head `b8d8a191`, `ensureIgnore` reads and writes `boardRoot/.gitignore` through a symlink if one is present. A tracked link can redirect reconciliation into board data or another target.

## Expected behavior

Reconciliation must inspect the ignore path without following symlinks and refuse or safely replace a symlink before writing. The behavior must be deterministic and leave the target untouched.

## Constraints

Keep the protection in the shared ignore helper, use platform-neutral filesystem inspection, and add deterministic coverage.
