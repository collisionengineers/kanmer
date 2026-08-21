# Research — SKILL-026: AGENTS.md ownership integration verification

## Question

How can the complete ownership contract be verified on disposable repositories: setup materialises the canonical user-owned skeleton and managed conduct block; stale managed content becomes visible as `agents-block: behind`; a repeat is byte-identical; and removal deletes only Kanmer-owned markers while retaining human prose?

## Findings

- `plugins/kanmer/skills/kanmer-setup/SKILL.md` already specifies the missing, partial, complete, and malformed-marker branches. In the missing-file branch it copies `kanmer-docs/assets/agents-template.md` before calling the managed-block writer; it preserves existing human prose and makes the later documentation debt idempotent. Source: setup skill §4.
- `scripts/agents-block.mjs` is the setup writer. `writeManagedBlock()` uses the single `BLOCK_BODY` from `agents-block-body.mjs`, and `applyManagedBlock()` refreshes only the marker span, preserves surrounding bytes, and refuses malformed markers. `scripts/verify-agents-block.mjs` already exercises its lifecycle and canonical-body parity.
- The required user-owned skeleton is one source: `plugins/kanmer/skills/kanmer-docs/assets/agents-template.md`. It contains Commands, Architecture map, Conventions, Gotchas, and Verification, including deterministic checks before manual checks. Source: template and [[SKILL-024]].
- Public repository staleness compares the managed span to the canonical body discovered from the bundled `kanmer-setup` skill. It reports any differing valid body as `agents-block: behind`; it does not contain a duplicate literal or a version marker. Source: `packages/core/src/staleness.ts`, ADR-0015, and [[SKILL-023]].
- GUI Connect owns the inverse operation. `apps/gui/src/main/agentsBlock.ts:removeManagedBlock()` removes the marker-delimited span and returns the remaining human content (or `null` only when no content remains); `connect.ts:dropAgentsBlock()` applies it on disconnect. Existing provider tests cover pieces of add/remove behavior but do not combine the setup skeleton, canonical conduct body, stale detection, repeat run, and removal in one disposable scenario.
- EPIC-012's approval contract defines completion as a disposable-repo integration proof. [[SKILL-023]] and [[SKILL-024]] are Done, so their dependency edges no longer block this work. HZN-006 has no context document.

## Implications

- Add a focused, durable integration test that creates a temporary repository from the canonical skeleton, invokes the real managed-block writer, verifies every required skeleton heading plus `## Agent conduct`, tampers only inside the block, and checks the real core staleness detector reports `agents-block: behind`.
- The same test should run setup twice and assert byte-identical output, then invoke the GUI's real `removeManagedBlock()` and prove no markers remain while the original skeleton bytes remain. It must not assert that removal deletes the user-owned skeleton.
- Use current sources directly; do not add a second block/template copy or introduce a new runtime setup path. The change is test-only and should preserve the plugin bundle.

## Open questions

- None requiring a user decision. The ticket wording, EPIC-012 contract, and completed predecessor tickets define the expected behavior.

## Execution discovery

The first real disposable run failed before block creation: the canonical `agents-template.md` embeds the exact closing marker text in its explanatory comment, while it does not embed the writer's longer start marker. `applyManagedBlock()` therefore sees an end marker without a start marker and correctly refuses the file as malformed. This makes the documented no-file setup path impossible. The minimal in-scope repair is to change that template prose so it describes the managed marker block without containing either exact sentinel; no writer relaxation is safe or warranted.
