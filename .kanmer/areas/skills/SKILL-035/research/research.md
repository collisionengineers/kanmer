# Research — terminal verification failures

## Question

Why did CORE-103 remain visibly active in Verifying after its immutable v0.3.8 release failed and CORE-107 took ownership of recovery?

## Findings

1. `plugins/kanmer/skills/kanmer-verify/SKILL.md` explicitly says every `FAIL`, `INCONCLUSIVE`, `NOT_APPLICABLE`, or unavailable external check stays in Verifying. It defines only the successful handoff to Done/closeout; there is no terminal-failure disposition.
2. FRD-007 correctly reserves Done for verified work and defines no seventh failed stage. Adding another stage would contradict the fixed-stage architecture and is unnecessary because FRD-015 already defines archive as reversible retirement that removes a ticket from the live board while preserving it.
3. CORE-103 has truthful failed-release evidence and an immutable published v0.3.8 tag/release state that cannot be repaired in place. CORE-107 owns the successor attempt. Keeping both live is therefore not a retry signal; it is stale workflow state caused by missing guidance.
4. `kanmer-closeout` handles verified Done tickets and abandoned unmerged PRs, but not a merged ticket whose post-merge acceptance is irrecoverably failed. `kanmer-auto` treats any failed verification as a mandatory stop but gives no deterministic resume/disposition path.
5. The existing model is sufficient: truthful non-PASS proof, explicit operator or successor disposition, wiki/structured successor link where applicable, an Outcome retirement note, archive, safe git cleanup, and `take_ticket action: release`. No new stage, schema field, or parallel status list is needed.

## Implication

The smallest complete fix is a documented terminal-retirement branch across verify, closeout, auto, governance, and the managed AGENTS contract, protected by prose regression tests. Retryable failures remain active in Verifying; only explicitly irrecoverable/superseded work is archived, never moved to Done.
