# Plan

1. Read/lstat the ignore file and merge managed entries.
2. Re-read before write; retry on changed content rather than overwriting.
3. Add deterministic race coverage and run rails.
