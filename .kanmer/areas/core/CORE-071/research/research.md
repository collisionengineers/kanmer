# Research

Review thread 3836307988 at CORE-058 head `f0de2628` found that `ensureIgnore` can overwrite a concurrent human/process edit between read and write. Reconciliation must compare-and-retry or merge safely.
