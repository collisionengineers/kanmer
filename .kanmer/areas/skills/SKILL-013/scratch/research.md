**Research phase complete, 2026-08-16.** `research`, `files`, `open-questions` written; ticket in Preparing.

`get_doc_gates` confirms `leave-preparing` correctly unmet on `plan`, `checklist` and `questions-resolved` — the last is intended: two ⚠️ OPERATOR ONLY questions are live and block planning.

Two things the next agent must not re-derive:

- The derive-vs-restate rule is **not new**. It is SKILL-014's committed-nowhere check 7, at
  `C:\Users\PC\AppData\Local\Temp\claude\C--Users-PC-Documents-GitHub-kanmer\33647913-f142-4e23-a6f7-d5729b9ba896\scratchpad\verify-skill-014.mjs:113-125`.
  Copy that file into `scripts/` before it is garbage-collected — it is uncommitted and it is the only copy.
- The R1 argument's evidence is `.kanmer/data/board.yml:30-57` — this repo's own `profiles:` block, with `questions-resolved` absent from it while `get_doc_gates` reports it at three boundaries. `resolveProfiles` (`board.ts:85-106`) injects it at read time.
