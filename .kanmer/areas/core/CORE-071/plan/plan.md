# Plan

1. Keep managed-ignore reconciliation append-only so a concurrent edit cannot
   be overwritten by a stale snapshot.
2. Append missing or re-invalidated rules in one `O_APPEND` operation while
   retaining symlink refusal and newline correctness.
3. Verify the cumulative CORE-071 head after CORE-074, preserving the initial
   failed assertion and corrected 25/25 Git rail evidence.
