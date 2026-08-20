# Plan — SKILL-023: put the conduct canon in every managed AGENTS block

## Approach

Extend the existing single source of truth instead of introducing a new distribution path: add a compact `## Agent conduct` section to `BLOCK_BODY`, with MASTERPLAN §4’s 24 rules retained as one line each under the same four groups. Copy the resulting fenced span exactly into the standalone setup skill, refresh this repository’s block via the writer, and strengthen the established verifier/staleness fixtures. The current content-hash detector already makes an old body `behind`; testing that behaviour explicitly is safer and smaller than changing its algorithm.

## Governing docs

- **No linked governing document yet:** `docs_todo: true` is intentional. The approved source for this seeded work is `MASTERPLAN.md` §4 and §6.4 S-27; [[DOC-014]] owns the future canonical authoring guidance. This implementation must not claim to modify a PRD/FRD/ADR without explicit authorization.
- **Meets `docs/functional/frd/FRD-013-setup-as-reconciliation.md` R1/AC4:** setup continues to refresh the managed block, and `verify-agents-block` remains the post-refresh rail.
- **Meets `docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md`:** body comparison remains discovered from the bundled setup skill and content-hash-based; no version stamp, baked manifest, new state, or automatic repair is introduced.
- **Meets `docs/functional/frd/FRD-023-agent-skills-system.md` R3/R5:** the orientation essentials gain the canon through the managed block and the skills release rail validates the change.

## Steps

1. Transcribe MASTERPLAN §4 rules 1–24 into `scripts/agents-block-body.mjs` under a compact `## Agent conduct` heading, preserving Scope, Build, Prove, and Conduct grouping and one concise line per rule; retain all marker and existing orientation content.
2. Replace only the corresponding fenced span in `plugins/kanmer/skills/kanmer-setup/SKILL.md` with a byte-identical copy of the canonical body. Use the existing equality check as the drift guard; do not create another source or generator.
3. Extend `scripts/verify-agents-block.mjs` with explicit E2E assertions that a created/refreshed block contains the conduct heading and all expected canonical rule markers, alongside its current full-body checks.
4. Add/update core and/or MCP smoke regression fixtures to use a structurally valid old body without `## Agent conduct` and assert the public/repository staleness result reports `agents-block` as `behind`; leave `staleness.ts` unchanged.
5. Run the canonical writer against this repository so `AGENTS.md` updates only between its managed markers. Verify the setup skill fence, GUI import, and local block match the canonical value.
6. Run `npm run verify:agents-block`, targeted staleness tests and MCP smoke as applicable, `npm run verify:skills`, then the main-checkout plugin build/check rail. Record all outputs and confirm the block change does not alter human-owned prose outside markers.

## Verification

- `npm run verify:agents-block` passes its existing lifecycle checks plus named conduct checks and exact setup-skill/GUI/local-body consistency.
- Targeted core staleness test and MCP `get_status.repo` smoke demonstrate a managed block that lacks the conduct section is `behind`, not `unstamped`, `unknown`, or silently current.
- `npm run verify:skills` passes; `npm run plugin:build` followed by `npm run plugin:check` from the main checkout passes, proving skills prose/tool reference/bundle rail compatibility.
- A diff of `AGENTS.md` changes only the marker-delimited body; rerunning the writer yields no second diff.

## Risks / open questions

- **Risk — accidental semantic loss while compacting.** Mitigate by mapping each of MASTERPLAN’s 24 numbered rules one-to-one, preserving group headings, and adding explicit verifier markers/count checks.
- **Risk — the fenced skill copy drifts.** Mitigate with existing byte-for-byte check 7, retained and run in the E2E rail.
- **Risk — a detector regression is masked by generic stale text.** Mitigate with a conduct-less former body fixture through the public `get_status.repo` path.
- **Open questions — none.** The MASTERPLAN canon is explicit and the group approval contract fixes the outcome.
