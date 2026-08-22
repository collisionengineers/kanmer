# Plan

1. Guard `ensureBoardWorktreeIgnore` after local/remote/orphan attachment once `boardRoot` is known.
2. Return paused/error status with the resolved root on failure.
3. Add deterministic local and remote attachment coverage, then run the full verification rails.
