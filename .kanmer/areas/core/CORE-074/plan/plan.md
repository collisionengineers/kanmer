# Plan

1. Add a pure helper that selects managed rules missing or made ineffective by
   later negations.
2. Append the selected rules in one write, preserving all human/process lines;
   never rewrite a stale snapshot.
3. Prove fresh, existing, later-negation, and concurrent-edit cases with the
   GUI Git rail and full script/typecheck rails.
