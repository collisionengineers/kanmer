# Files — SKILL-012

## Where the change lands

### Core — the requirement itself

| Path | Why |
|---|---|
| `packages/core/src/profiles.ts:47` | New pseudo-type constant beside `GOVERNING_DOC`. |
| `packages/core/src/profiles.ts:176-207` | `validateProfileMap` must accept it — today anything that is not `governing-doc` and not a `DOC_TYPES` member is rejected with "unknown document type" (`:188-190`). Miss this and every board carrying the new requirement fails validation. |
| `packages/core/src/profiles.ts:117-137` | `DEFAULT_PROFILES` — the shipped table. **The riskiest edit in the ticket**: it changes what every existing board demands. See Ripple effects. |
| `packages/core/src/gates.ts:58-67` | `EvidenceProbe` gains a method (`unresolvedQuestions(): Promise<number>` or similar). It is an interface, so every implementer must be updated — tests included. |
| `packages/core/src/gates.ts:78-99` | `statusOf` gains a branch before the `hasType` path, mirroring the `GOVERNING_DOC` branch at `:79-81`. |
| `packages/core/src/store.ts:1045-1060` | The existing checkbox loop. Extract it so `open-questions/` reuses it rather than growing a second regex — with the one behavioural difference that counting stops at the `## Parked` heading. |
| `packages/core/src/store.ts` (probe construction) | Wire the new probe method wherever `EvidenceProbe` is built. |

### GUI

| Path | Why |
|---|---|
| `apps/gui/src/renderer/src/lib/profileDraft.ts:25-26` | `GOVERNING_DOC` is **duplicated** here and this module validates requirement strings for the Settings profile editor. Not updating it means Settings rejects a profile core accepts. |
| `apps/gui/src/renderer/src/components/Editor.tsx` | Renders boundary requirements. Verify the new type renders sensibly — it has no document to link to, exactly like `governing-doc`. |

### Skills — obeying the gate, not restating it

| Path | Why |
|---|---|
| `plugins/kanmer/skills/kanmer-research/SKILL.md:41-45,52-54` | Step 6 writes `open-questions`; the closing paragraph already says "answered or explicitly parked". Point that at `get_doc_gates` instead of asserting it. |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md:39-40` | Step 6 shows contested plans to the user. This is where "ask, then revise the plan" belongs — the requested behaviour, in the skill that owns the moment. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md:25` | The **only** stop that cannot be a gate (research F8): review fixes happen inside the stage with no `move_item`. Must be prose, and must say it is a convention rather than an enforced gate. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md:37-43` | §2 parks tickets whose *research* surfaces questions; nothing covers questions raised later. Extend to the whole run — and note this file is also SKILL-011's target, so the two tickets share a lane. |
| `plugins/kanmer/skills/kanmer-research/assets/open-questions-template.md` | `## Parked (explicitly deferred)` becomes **normative** — it is now the boundary the parser stops at, not a suggested heading. |

### Docs

| Path | Why |
|---|---|
| `docs/architecture/adr/ADR-00XX-…` | **New.** The first gate that reads inside a document (research Implications). A design decision per `kanmer-plan` step 3. |
| `docs/functional/frd/FRD-009-interrogative-workflow.md` | Currently four requirements, all about *asking*. Needs the enforcement point, and R3 restated to say the gate implements the headless rule rather than fighting it. |
| `docs/functional/frd/FRD-002-requirement-profiles.md` | Governs profiles and the requirement vocabulary; both change. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/core/src/gates.ts:154-193` | The design rationale you are departing from — anti-collapse was made structural so it "needs no timestamps and so has nothing to be wrong about". Read before writing a content parser, and make the ADR answer it. |
| `packages/core/src/gates.ts:88-97` | The soft-validation precedent: visual proof with no image is a **warning, never a block**, because "an image check cannot tell a screenshot from a decorative logo". If the ADR concludes the parser judges badly, this is the shape of the fallback. |
| `.gitignore:41` | `.claude/skills/` is gitignored — an install artifact, and stale. Skill edits go in `plugins/kanmer/skills/` only. |
| `docs/functional/frd/FRD-023-agent-skills-system.md:33,48-52` | R1 "derive, don't restate", and the verification note that R1 is *not yet true*. This ticket must not add restatements. |
| `.kanmer/areas/gui/GUI-064/open-questions/` | A real unresolved instance on a Done ticket — the fixture the parser should be tried against. Four unticked boxes plus a `Parked` section. |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md:46-48` | One gated boundary per move — relevant because adding requirements to more boundaries changes which single-call moves remain legal. |

## Ripple effects

- **Every board on the shipped profiles.** Changing `DEFAULT_PROFILES` changes
  what existing tickets owe, and gates re-evaluate immediately. A ticket sitting
  in Preparing with an unticked question becomes unmovable the moment this ships.
  Intended — but it must be in the release notes, and the migration question
  (does an existing board inherit the requirement, or only new boards?) is an
  open question, not an assumption.
- **Tests.** `gates.test.ts` (satisfied/unsatisfied/absent-document), `store.test.ts`
  (the parser: unticked, ticked, mixed case `[X]`, questions under `## Parked`
  ignored, multiple files under `open-questions/`, no document at all),
  `docs.test.ts` (profile validation accepts the new type), and
  `profileDraft.test.ts` in the GUI, which today asserts `ok("governing-doc")`.
- **Committed build artifact.** `plugins/kanmer/mcp/kanmer-mcp.cjs` bundles core
  (AGENTS.md §8 gotcha 8) — `plugin:build` must run and the bundle be committed.
- **`get_doc_gates` output** gains a requirement type. `smoke:protocol` and the
  tool reference may both need it (FRD-023 R5).
- **This board.** After merge, SKILL-011 and SKILL-012 are themselves subject to
  the new gate — including this ticket's own open questions. That is the honest
  test of whether the rule is workable.

## Out of scope

- **Retrofitting the five historical cases** from research F4 (GUI-064, GUI-004,
  CORE-011, CORE-021, GUI-064's 21/23 checklist). They are evidence, not work.
  Whether the abandoned CORE-021 decisions get revived is a separate call.
- **Blocking on questions raised on *other* tickets.** `blocks` edges already
  cover cross-ticket dependency.
- **Any question-asking UI.** The operator answers in the document; nothing here
  builds a prompt surface.
- **Making `open-questions` a required *document*.** Explicitly rejected —
  research F3 shows it enforces paperwork and not the rule.
