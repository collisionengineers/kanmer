// Verify the plugin's skill prose against the code it describes (FRD-023 R5).
//
// There is no test that asserts skill prose, so the OUTPUT of this script is the
// evidence: every check prints what it found, not only a verdict. That is
// deliberate — a check that prints "PASS" and nothing else cannot be audited,
// and this file's whole subject is documentation that drifted while looking fine.
//
// Ported from SKILL-014's verification script, which lived in a scratchpad and
// was never committed; its own proof listed that as a weakness ("nothing
// prevents recurrence"). Checks 1–6 are that script's, unchanged in substance.
// Check 7 is widened — see its header for the two holes it had and why they
// mattered.
//
// Usage: node scripts/verify-skill-prose.mjs [repo-root]

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "plugins/kanmer/skills");
const agentsPath = join(root, "AGENTS.md");

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    statSync(p).isDirectory() ? walk(p) : files.push(p);
  }
})(skillsDir);

const read = (p) => readFileSync(p, "utf8");
const rel = (p) => relative(root, p).replace(/\\/g, "/");
let failures = 0;
const check = (n, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};
/** Every line in the skills tree matching `re`, with its file and line number. */
const hits = (re, searched = files) =>
  searched.flatMap((p) =>
    read(p)
      .split("\n")
      .map((l, i) => ({ file: rel(p), line: i + 1, text: l }))
      .filter((h) => re.test(h.text)),
  );

console.log("=== 1. `impact` names no document type ===");
const impact = hits(/impact/i);
impact.forEach((h) => console.log(`      ${h.file}:${h.line}  ${h.text.trim().slice(0, 90)}`));
check("no `impact` anywhere in the skills tree", impact.length === 0, `${impact.length} hits`);

console.log("\n=== 2. `researching` / `planning` never name a stage ===");
// A *stage* reference, not the English words. Two shapes only: the word inside
// an arrow-separated stage sequence, or a status id in code/quotes. Prose like
// "research and planning share that stage" is correct English about the
// Preparing stage and must not be flagged — an over-broad check that fails on
// correct text teaches you to ignore it.
const stageish = hits(/\b(researching|planning)\b/i, [...files, agentsPath]).filter(
  (h) =>
    /(→|->)\s*(researching|planning)|(researching|planning)\s*(→|->)/i.test(h.text) ||
    /["'`](researching|planning)["'`]/i.test(h.text),
);
stageish.forEach((h) => console.log(`      ${h.file}:${h.line}  ${h.text.trim().slice(0, 90)}`));
check("no v2 stage names", stageish.length === 0, `${stageish.length} hits`);

console.log("\n=== 3. `priority` never names a field ===");
const prio = hits(/`priority`|priority` |priority —/i);
prio.forEach((h) => console.log(`      ${h.file}:${h.line}  ${h.text.trim().slice(0, 90)}`));
check("no `priority` field references", prio.length === 0, `${prio.length} hits`);

console.log("\n=== 4. every named doc type exists in profiles.ts ===");
const profilesSrc = read(join(root, "packages/core/src/profiles.ts"));
const declared = new Set(
  (profilesSrc.match(/^\s{2}"[a-z-]+",$/gm) ?? []).map((s) => s.trim().replace(/[",]/g, "")),
);
// Doc types as an agent would name them: set_ticket_doc(doc: "x") / `x` in a doc list.
const named = new Set();
for (const p of files) {
  for (const m of read(p).matchAll(/set_ticket_doc\s*\(?\s*(?:<id>\s*)?["`]?([a-z-]{3,})["`]?/g)) {
    named.add(m[1]);
  }
  for (const m of read(p).matchAll(/get_ticket_doc\s+doc:\s*"([a-z-]+)"/g)) named.add(m[1]);
}
const unknown = [...named].filter(
  (t) => !declared.has(t) && !["doc", "append", "scratch", "id", "content"].includes(t),
);
console.log(`      profiles.ts declares: ${[...declared].join(", ")}`);
console.log(`      skills name:          ${[...named].join(", ") || "(none parsed)"}`);
check("no skill names an undeclared doc type", unknown.length === 0, unknown.join(", ") || "none");

console.log("\n=== 5. every kanmer-* reference resolves to a real skill ===");
const roster = new Set(readdirSync(skillsDir));
const refs = new Map();
// A *skill* reference, not any `kanmer-`-prefixed token. Excluded by the
// lookarounds: a leading `.` or `-` (`.kanmer-skills-version` is a stamp file)
// and a trailing `-` (the same). Without them the check reports a dangling
// skill named `kanmer-skills`, which is a filename fragment — a false positive
// that teaches you to ignore the check, which is worse than not having it.
for (const p of files) {
  for (const m of read(p).matchAll(/(?<![.\-])kanmer-[a-z]+(?!-)/g)) {
    const name = m[0];
    if (!refs.has(name)) refs.set(name, []);
    refs.get(name).push(rel(p));
  }
}
const dangling = [...refs.keys()].filter((n) => !roster.has(n) && n !== "kanmer-mcp" && n !== "kanmer-board");
dangling.forEach((n) =>
  console.log(`      ${n} referenced by ${[...new Set(refs.get(n))].join(", ")}`),
);
check("no reference to a nonexistent skill", dangling.length === 0, dangling.join(", ") || "none");

console.log("\n=== 6. every SKILL.md has an ordered workflow and a closing hand-off ===");
const skills = readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, "SKILL.md")));
for (const s of skills) {
  const body = read(join(skillsDir, s, "SKILL.md"));
  // Ordered workflow: an explicit `## Workflow` section, or numbered `## N.` headings.
  const workflow = /^## Workflow$/m.test(body) || /^## \d+\. /m.test(body);
  // Closing hand-off: the last non-empty paragraph names a skill or says there is
  // none. The closing *block*, not the last sentence: kanmer-auto's ending is a
  // paragraph, a route diagram and another paragraph.
  const tail = body.trimEnd().split("\n").slice(-14).join(" ");
  const handoff = /Hand off to|No successor|No hand-off|this skill \*is\* the hand-off/i.test(tail);
  const ok = workflow && handoff;
  console.log(
    `      ${ok ? "ok  " : "MISS"} ${s.padEnd(18)} workflow=${workflow ? "yes" : "NO"}  handoff=${handoff ? "yes" : "NO"}`,
  );
  if (!ok) failures++;
}
// The roster size is read off disk and reported, never assumed. SKILL-018 was
// checked against this and did not change it; the next roster change should
// update the number here deliberately rather than discover it in CI.
const EXPECTED_SKILLS = 12;
check(
  `the roster is ${EXPECTED_SKILLS} skills`,
  skills.length === EXPECTED_SKILLS,
  `${skills.length} found: ${skills.join(", ")}`,
);

console.log("\n=== 7. FRD-023 R1: no per-profile requirement list in any skill ===");
//
// R1 says skills **derive** their rules (`get_doc_gates`) and never restate
// them. The discriminator, stated as a rule so it generalises:
//
//   A rule may be stated in prose iff its truth-value is independent of board
//   configuration.
//
// Structural invariants pass — the six stages, the one-gated-boundary rule, the
// `## Parked` parse rule, gate-exempt folders. A **per-profile requirement
// list** fails: it is read out of `board.yml` at runtime, `get_doc_gates` exists
// to answer it, and it goes stale the moment anyone edits `profiles:` — or the
// moment we do, which is how the AGENTS block came to describe a profile set
// that no longer existed.
//
// SKILL-014 shipped this check with two measured holes, both fixed here:
//
//  1. **It only inspected lines that already named a boundary.** The single
//     worst offender in the tree — the AGENTS block's per-profile table, which
//     ships into every repo — named no boundary, so it was never even a
//     candidate. The precondition is dropped: any line naming a profile is
//     examined.
//  2. **Its verb list was `needs|requires|owes`.** Real prose said "asks for",
//     "may reach", "skips", "may finish". Widened to what the roster actually
//     writes.
//
// What is forbidden is precisely a **mapping from a profile to the documents it
// owes**, so a sentence must do three things to fail:
//
//  a. name a profile **as a profile** — in a code span, the way the roster
//     writes ids. Plain-English "a two-line fix" is not the `fix` profile.
//  b. name at least one **document type or boundary**. Enumerating the legal
//     profile *ids* (`feature`, `fix`, `chore`, `spike`, `custom`) is the
//     vocabulary, not a requirement list, and the tool reference must be able to
//     do it. This replaces SKILL-014's boundary-name precondition: strictly
//     wider — doc types count, which is what the AGENTS block's table used and
//     why that table was invisible to the old check — and still narrow enough to
//     let the vocabulary through.
//  c. make a claim about owing — the verb list, widened from
//     `needs|requires|owes` to what the roster actually writes.
//
// **There is no "illustrative example" carve-out, and the absence is deliberate.**
// This check was first written with one: a single profile named beside a
// `get_doc_gates` pointer was allowed, on the theory that it motivates the call
// rather than replacing it. Run against the tree, that carve-out exempted
// `kanmer-plan`'s "a `chore` asks for a plan and nothing else" — the one site
// independently known to be false — and `kanmer-research`'s "a `spike` may need
// only research, a `chore` only a plan", which is false the same way. Both sit
// beside a `get_doc_gates` pointer and are wrong anyway. The carve-out was
// separating well-placed restatements from badly-placed ones, and R1 is not
// about placement. An example that must be kept true by hand is a restatement.
//
// Sentences, not lines: the roster hard-wraps prose, so the same claim escaped
// on two lines that was caught on one.
const PROFILE_IN_CODE = /`(feature|fix|chore|spike|custom)`/g;
const DOC_OR_BOUNDARY = new RegExp(
  `\\b(${[...declared].join("|")}|leave-backlog|leave-preparing|enter-review|enter-verifying|enter-done)\\b`,
  "i",
);
const CLAIM =
  /\b(needs?|requires?|owes?|asks? for|skips?|may reach|may finish|finish(es)? at|nothing else|only)\b/i;

const perProfile = [];
for (const p of files) {
  const lines = read(p).split("\n");
  // Paragraph blocks, so a wrapped sentence is seen whole. The reported line is
  // the block's first line — close enough to find it, and stable under rewrap.
  let blockStart = 0;
  let buf = [];
  const flush = () => {
    if (!buf.length) return;
    const joined = buf.join(" ");
    for (const sentence of joined.split(/(?<=[.;:])\s+/)) {
      const profiles = new Set([...sentence.matchAll(PROFILE_IN_CODE)].map((m) => m[1]));
      if (!profiles.size) continue;
      if (!DOC_OR_BOUNDARY.test(sentence)) continue;
      if (!CLAIM.test(sentence)) continue;
      perProfile.push({
        file: rel(p),
        line: blockStart + 1,
        text: sentence.trim(),
        why: `${profiles.size} profile(s) mapped to documents`,
      });
    }
    buf = [];
  };
  lines.forEach((text, i) => {
    if (text.trim() === "") {
      flush();
      blockStart = i + 1;
    } else {
      if (!buf.length) blockStart = i;
      buf.push(text);
    }
  });
  flush();
}
perProfile.forEach((h) =>
  console.log(`      ${h.file}:${h.line}  (${h.why})\n        ${h.text.slice(0, 110)}`),
);
check(
  "no per-profile requirement list",
  perProfile.length === 0,
  `${perProfile.length} found`,
);

console.log("\n=== 8. the hard rules no tool reports are actually stated ===");
// The other half of R1, and the half a "delete the restatements" check cannot
// see: a structural invariant that no tool reports has prose as its ONLY
// possible home, so its absence is a real defect rather than clean compliance.
// Scoped to the skills that can act on each rule — a read-only skill gains
// nothing from being told not to remove a worktree.
const RULES = [
  {
    name: "the board worktree is not yours",
    re: /\.worktrees\/kanmer|board branch|board's own worktree/i,
    // Every skill that runs git, plus the two that route work to them.
    owed: ["kanmer-execute", "kanmer-review", "kanmer-verify", "kanmer-closeout", "kanmer-auto", "kanmer-setup"],
  },
  {
    name: "a move crosses at most one gated boundary",
    re: /one gated boundary|gated boundar(y|ies)/i,
    // Every skill that calls move_item or update_item status.
    owed: ["kanmer-research", "kanmer-plan", "kanmer-execute", "kanmer-review", "kanmer-groom", "kanmer-tickets", "kanmer-auto"],
  },
];
// Whitespace-collapsed, for the same reason check 7 works on sentences: the
// roster hard-wraps, so "at most one gated\n  boundary" is the rule being
// present, not absent.
const flat = (p) => read(p).replace(/\s+/g, " ");
for (const rule of RULES) {
  const missing = rule.owed.filter((s) => !rule.re.test(flat(join(skillsDir, s, "SKILL.md"))));
  console.log(
    `      ${rule.name}: ${rule.owed.length - missing.length}/${rule.owed.length} of the skills that need it`,
  );
  check(`  stated wherever it can be acted on`, missing.length === 0, missing.join(", ") || "none");
}

console.log("\n=== 9. work-type brief overlays are present and remain manual ===");
const planAssets = join(skillsDir, "kanmer-plan", "assets");
const overlays = [
  "brief-fix.md",
  "brief-ui-ux.md",
  "brief-docs.md",
  "brief-cloud-infra.md",
  "brief-data-migration.md",
];
const missingOverlays = overlays.filter((name) => !existsSync(join(planAssets, name)));
console.log(`      overlays: ${overlays.join(", ")}`);
check("all five work-type brief overlays exist", missingOverlays.length === 0, missingOverlays.join(", ") || "all present");

const planSkill = read(join(skillsDir, "kanmer-plan", "SKILL.md"));
const manualSelection =
  /manually copy zero or more matching prompt sets/i.test(planSkill) &&
  /templates, never\s+an automatic classifier, ticket field, profile mapping, or gate/i.test(planSkill);
check("kanmer-plan names optional manual overlay selection", manualSelection, "manual selection, no engine");

console.log("\n=== 10. kanmer-groom keeps its board-vs-reality sweep advisory ===");
const groomSkill = read(join(skillsDir, "kanmer-groom", "SKILL.md"));
const boardRealitySweep =
  /board-vs-reality sweep/i.test(groomSkill) &&
  /non-archived Backlog or Preparing tickets/i.test(groomSkill) &&
  /exact ticket id and a distinctive title phrase/i.test(groomSkill) &&
  /`main`\s+history/i.test(groomSkill) &&
  /search merged PRs/i.test(groomSkill) &&
  /open the matched commit, diff, or PR/i.test(groomSkill) &&
  /proposed disposition: no action, an Outcome note plus archive/i.test(groomSkill) &&
  /never archives or rescopes automatically/i.test(groomSkill);
check(
  "kanmer-groom keeps the bounded, evidence-first, proposal-only sweep",
  boardRealitySweep,
  "Backlog/Preparing + main/PR evidence + no automatic mutation",
);

console.log("\n=== 11. gates-first routing regressions stay removed ===");
// These are deliberately narrow guardrails for two measured contradictions.
// They protect dynamic gate routing, not a profile-to-document table or prose
// style: both skills must continue to derive the next action at runtime.
const autoSkill = read(join(skillsDir, "kanmer-auto", "SKILL.md"));
const agentsGuide = read(agentsPath);
const planUniversalClaims = [
  /research and files documents\s*[—-]\s*never before them/i,
  /whether or not this ticket'?s profile happens to gate on them/i,
];
const planClaimsPresent = planUniversalClaims.filter((re) => re.test(planSkill));
check(
  "kanmer-plan has no universal research/files prerequisite",
  planClaimsPresent.length === 0,
  planClaimsPresent.length ? "legacy universal claim found" : "live gates decide inputs",
);
check(
  "kanmer-auto has no universal research Wave 0",
  !/wave 0\s*[—-]\s*research everything in parallel/i.test(autoSkill),
  "route from live gates instead",
);
for (const [name, body] of [["kanmer-plan", planSkill], ["kanmer-auto", autoSkill]]) {
  check(`${name} still routes through get_doc_gates`, /get_doc_gates/.test(body), "live gate report");
}

console.log("\n=== 12. audience-specific template contracts are present and advisory ===");
const requiredHeadings = (file, headings) => {
  const body = read(file);
  const missing = headings.filter((h) => !new RegExp(`^## ${h}$`, "m").test(body));
  check(`${rel(file)} has required headings`, missing.length === 0, missing.join(", ") || "all present");
  return body;
};
const approval = requiredHeadings(join(planAssets, "approval-contract.md"), ["Outcome", "Why", "User or operational effect", "In scope", "Out of scope", "Key decisions", "Main risks", "Breakdown", "Evidence", "Approval boundary"]);
check("approval contract says its range is guidance, not a gate", /300–600 words; this is guidance only and is never a Kanmer gate/i.test(approval), "advisory only");
const brief = requiredHeadings(join(planAssets, "plan-template.md"), ["Objective", "Starting state", "Governing docs", "Required changes", "Expected files", "Do not modify", "Constraints", "Ordered steps", "Acceptance checks", "Commands", "Failure and deviation rules", "Stop condition"]);
check("execution brief keeps one extractable Stop condition and advisory decision verbs", (brief.match(/^## Stop condition$/gm) ?? []).length === 1 && /investigate.*decide.*choose.*determine[\s\S]*not a gate/i.test(brief), "heading + advisory warning");
check("execution brief contains prove-rule boilerplate", /production caller[\s\S]*runtime dependencies[\s\S]*schema changes.*grants/i.test(brief), "caller + artifact + schema/grants");
const checklist = read(join(planAssets, "checklist-template.md"));
check("checklist labels are plainly advisory and gates ignore them", /\[pre-review\]/.test(checklist) && /\[post-merge\]/.test(checklist) && /gates ignore/i.test(checklist), "labels + gate disclaimer");
const groupContext = requiredHeadings(join(skillsDir, "kanmer-tickets", "assets", "group-context.md"), ["Feature outcome", "Users affected", "Acceptance criteria", "Non-goals", "Shared decisions", "Constraints", "Risks", "Dependency map", "Rollout & rollback", "Breakdown", "Definition of done"]);
check("group context says horizons are optional", /horizons do not require context by default/i.test(groupContext), "epic context only");

console.log("\n=== 13. kanmer-auto durable group run-state contract is present ===");
const autoAssets = join(skillsDir, "kanmer-auto", "assets");
const runState = join(autoAssets, "run-state-template.md");
const currentRun = join(autoAssets, "current-run-template.md");
const autoRequiredTerms = [
  "one explicit existing group",
  "automation/current.md",
  "automation/runs/<run-id>.md",
  "project_fingerprint",
  "controller",
  "stop_reason",
  "running",
  "paused",
  "blocked",
  "completed",
  "aborted",
  "read it back",
  "never runs `gh pr merge`",
];
check(
  "kanmer-auto states the durable run ownership and safety contract",
  autoRequiredTerms.every((term) => autoSkill.includes(term)),
  autoRequiredTerms.filter((term) => !autoSkill.includes(term)).join(", ") || "all terms present",
);
const runStateBody = requiredHeadings(runState, ["Selection contract", "Run invariants", "Ticket ledger", "Event log", "Resume instruction"]);
for (const field of ["kind:", "schema:", "run_id:", "group:", "project_fingerprint:", "controller:", "status:", "created_at:", "updated_at:", "lane_limit:", "stop_reason:"]) {
  check(`run-state template retains ${field}`, runStateBody.includes(field), field);
}
const currentRunBody = read(currentRun);
check(
  "current-run pointer names its history path and resume rule",
  /run_path: automation\/runs\/<run-id>\.md/.test(currentRunBody) && /^## Resume instruction$/m.test(currentRunBody),
  "path + heading",
);

console.log("\n=== 14. kanmer-auto stopping and serial-fallback contract ===");
const stopContract = [
  [
    "controller reconciles every worker result",
    /On every result or timeout[\s\S]*re-reads the live item[\s\S]*writes and reads back the run record before selecting another action/i,
  ],
  [
    "mandatory stop predicates are explicit",
    /^## 4\. Mandatory stop predicates$/m.test(autoSkill) &&
      /wrong project fingerprint[\s\S]*durable run-state write\/readback failure[\s\S]*unknown PR, check, or merge state[\s\S]*no safe ready work/i.test(autoSkill),
  ],
  [
    "only legal successful/operator stops are named",
    /only successful terminal stop is an exhausted roster[\s\S]*only operator-wait stop is a genuine operator-only question[\s\S]*partial-roster report presented as success is a defect/i,
  ],
  [
    "stop hand-off persists exact predicate and resume action",
    /Before an intentional safe stop[\s\S]*exact predicate text\/id[\s\S]*one deterministic resume read\/action[\s\S]*Write\/read\s+back the complete history record first, then write\/read\s+back the pointer/i,
  ],
  [
    "serial fallback persists lane limit and event",
    /persist\s+`lane_limit: 1`\s+and a `parallel-unavailable` event\/reason[\s\S]*same\s+ordered roster[\s\S]*Finish\s+and\s+persist\s+the current action before assigning the next ticket/i,
  ],
  [
    "serial fallback preserves independence and no pre-take",
    /Serial mode permits only one active or uncertain ticket[\s\S]*does not pre-take\s+future tickets[\s\S]*returns to controller mode/i,
  ],
  [
    "worker/ticket/run completion stays distinct",
    /Worker completion means return at its assigned Stop condition, not\s+ticket\s+completion[\s\S]*run is `completed` only when\s+every selected non-skipped ticket reaches/i,
  ],
  [
    "retry and force rules are bounded",
    /at most one logged launch\s+retry[\s\S]*Never automatically retry failed\s+implementation, migration, test,[\s\S]*failed verification command is never rerun directly by the\s+controller or by the same verifier[\s\S]*Never use force takeover as fallback/i,
  ],
];
for (const [name, rule] of stopContract) {
  const ok = typeof rule === "boolean" ? rule : rule.test(autoSkill);
  check(name, ok, ok ? "contract present" : "required stopping/serial wording missing");
}
const forbiddenAutoClaims = [
  ["unbounded serial fallback", /If your host has no subagent mechanism,\s*run the same waves sequentially/i],
  ["partial completion presented as success", /continue until (?:every|all) (?:ticket|tickets) .*done/i],
  ["role collapse", /if subagents are unavailable,\s*do all roles yourself/i],
];
for (const [name, rule] of forbiddenAutoClaims) {
  check(`no ${name}`, !rule.test(autoSkill), "unsafe legacy claim absent");
}

console.log("\n=== 15. review prose describes only the current review-asset flow ===");
const reviewSkill = read(join(skillsDir, "kanmer-review", "SKILL.md"));
const staleReviewAssetClaims = hits(
  /legacy `pr-\*` review assets remain untouched|SKILL-015 owns their deletion/i,
);
staleReviewAssetClaims.forEach((h) =>
  console.log(`      ${h.file}:${h.line}  ${h.text.trim().slice(0, 120)}`),
);
check(
  "no stale legacy review-asset prose",
  staleReviewAssetClaims.length === 0,
  staleReviewAssetClaims.length ? "deleted pr-* assets must not be assigned to a future ticket" : "legacy claim absent",
);
check(
  "kanmer-review names the current whole-file review record",
  /whole-file `scratch\/review\.md` attestation|Replace `scratch\/review\.md` as one version-aware file/i.test(reviewSkill),
  "scratch/review.md is the current review flow",
);

console.log("\n=== 16. terminal verification failures have a truthful retirement path ===");
const verifySkill = read(join(skillsDir, "kanmer-verify", "SKILL.md"));
const closeoutSkill = read(join(skillsDir, "kanmer-closeout", "SKILL.md"));
const retirementContract = [
  [
    "non-PASS verification is retryable by default",
    /non-PASS result is retryable by default[\s\S]*Leave the\s+ticket active in Verifying/i.test(verifySkill),
  ],
  [
    "terminal retirement requires explicit operator disposition and successor decision",
    /operator may explicitly declare it irrecoverable or superseded[\s\S]*reason and either a successor ticket or the\s+operator's explicit no-successor decision/i.test(verifySkill),
  ],
  [
    "terminal non-success is archived without becoming Done",
    /set `archived: true` without changing the ticket's Verifying status[\s\S]*Never move a non-PASS ticket\s+to Done/i.test(verifySkill),
  ],
  [
    "closeout accepts and preserves the archived Verifying shape",
    /retired non-success[\s\S]*status Verifying, archived[\s\S]*Closeout never decides that a failure is terminal/i.test(closeoutSkill),
  ],
  [
    "auto waits for disposition then routes retirement without calling it cleared",
    /auto never infers that[\s\S]*terminal[\s\S]*resume through `kanmer-verify`'s terminal-retirement[\s\S]*never cleared or Done/i.test(autoSkill),
  ],
];
for (const [name, ok] of retirementContract) {
  check(name, ok, ok ? "contract present" : "terminal-retirement contract missing");
}

console.log("\n=== 17. resumed execution reuses, never recreates, its recorded worktree ===");
const executeSkill = read(join(skillsDir, "kanmer-execute", "SKILL.md"));
const resumedExecutionContract =
  /`ticket\.taken` selects the execution lane[\s\S]*missing value means fresh work[\s\S]*present value means\s+resume the exact already-recorded branch and worktree/i.test(executeSkill) &&
  /do not\s+create another worktree or call `take_ticket`/i.test(executeSkill) &&
  /Only when `packet\.ticket\.taken` is absent, create the worktree/i.test(executeSkill) &&
  /resumed ticket is\s+already taken[\s\S]*skips this fresh-ticket creation and take\s+sequence/i.test(executeSkill);
check(
  "kanmer-execute separates resumed and fresh worktree flows",
  resumedExecutionContract,
  resumedExecutionContract ? "reuse + fresh-only creation" : "resume must validate/reuse and skip worktree add/take",
);

const resumedExecutionSafetyContract =
  /git -C <recorded-worktree> rev-parse --git-common-dir[\s\S]*git -C <source-repository-root> rev-parse --git-common-dir/i.test(executeSkill) &&
  /Before editing, call[\s\S]*`list_items`[\s\S]*every other active ticket's[\s\S]*recorded worktree[\s\S]*shared source checkout/i.test(executeSkill) &&
  /Do not release a paused ticket[\s\S]*retains a worktree or branch/i.test(executeSkill);
check(
  "kanmer-execute validates resumed repository, location, and pause handoff",
  resumedExecutionSafetyContract,
  resumedExecutionSafetyContract ? "repository + collision + retained-handoff checks" : "resume must verify repository/location and retain paused metadata",
);

const refusalHandoffContract =
  /If `ready: false`, return its exact `code`, `reason`, and `missing` values[\s\S]*external hand-off and stop without mutating the ticket/i.test(executeSkill) &&
  /response, return the[\s\S]*external hand-off and stop before every ticket, Git, or[\s\S]*document action/i.test(executeSkill);
check(
  "kanmer-execute leaves every ready:false refusal externally handed off and read-only",
  refusalHandoffContract,
  refusalHandoffContract ? "no scratch/document write before a ready packet" : "ready:false must return externally without a ticket write",
);

const closeoutPauseContract =
  /\*\*Pausing, not closing\*\*[\s\S]*This is not closeout\. Leave the ticket taken,[\s\S]*Do \*\*not\*\* release it/i.test(closeoutSkill);
check(
  "kanmer-closeout preserves a paused ticket's resume metadata",
  closeoutPauseContract,
  closeoutPauseContract ? "retained-taken pause contract" : "closeout must not release a ticket that will resume",
);

const resumeStageAndReferenceInputsContract =
  /discover and read every human-supplied file in[\s\S]*`reference\/` directory[\s\S]*non-Markdown[\s\S]*`extraDocs`/i.test(executeSkill) &&
  /resumed packets only while the ticket remains in[\s\S]*`implementing`[\s\S]*Review or Verifying/i.test(executeSkill);
check(
  "kanmer-execute retains reference inputs and limits resumption to implementation",
  resumeStageAndReferenceInputsContract,
  resumeStageAndReferenceInputsContract ? "reference discovery + implementation-only resume" : "resume must retain all reference inputs and stop outside implementing",
);

console.log("\n=== 18. SKILL-037 review consolidation and remediation-loop contract ===");
// The rules CORE-121 made enforceable in the store (needs-changes return with
// a reason, transfer/renew instead of force) and the reviewer-procedure rules
// no tool can enforce (expected reviewers settle, replace-not-append, delta
// scope, typed failure class). Each is stated in the one skill that acts on
// it; a rewrite that drops one silently reverts to the CORE-113 failure mode.
const remediationContract = [
  [
    "kanmer-review settles expected reviewers and replaces a stale attestation",
    /expected_reviewers/.test(reviewSkill) &&
      /threads_snapshot/.test(reviewSkill) &&
      /\**never\** expected reviewers and never a gate/i.test(reviewSkill) &&
      /replaced, never appended/i.test(reviewSkill) &&
      /raw GitHub id is never a finding id/i.test(reviewSkill),
  ],
  [
    "kanmer-review takes the sanctioned same-PR return and honours the budget",
    /`review` to `implementing`, with a\s+reason/i.test(reviewSkill) &&
      /REVIEW_RETURN_NEEDS_ATTESTATION/.test(reviewSkill) &&
      /REMEDIATION_BUDGET_EXHAUSTED/.test(reviewSkill) &&
      /delta review is limited to the original findings/i.test(reviewSkill) &&
      !/leave the\s+ticket in Review, and do not merge/i.test(reviewSkill) &&
      !/becomes a linked PR Review ticket/i.test(reviewSkill),
  ],
  [
    "kanmer-execute re-enters on the existing PR and renews its claim",
    /### Re-entry after a needs-changes return/.test(executeSkill) &&
      /never open a second PR for the same ticket/i.test(executeSkill) &&
      /take_ticket id: <ID>, action: "renew"/.test(executeSkill) &&
      /Renew again before every long\s+command/i.test(executeSkill),
  ],
  [
    "kanmer-verify classifies failures and routes them",
    /failure_class: implementation # implementation \| plan \| transient \| inconclusive/.test(verifySkill) &&
      /`implementation` \| `verifying` → `implementing`/.test(verifySkill) &&
      /`plan` \| `verifying` → `preparing`/.test(verifySkill) &&
      /`transient` \| stays in Verifying/.test(verifySkill) &&
      /Only `PASS`, or an operator's `WAIVED_BY_OPERATOR`, permits the final move/.test(verifySkill),
  ],
  [
    "kanmer-closeout accepts the operator waiver as a Done shape",
    /final proof result `PASS`,\s+or `WAIVED_BY_OPERATOR` with the operator identity and reason/i.test(closeoutSkill),
  ],
  [
    "kanmer-auto transfers expired claims, never forces, and routes remediation",
    /take_ticket action: "transfer"/.test(autoSkill) &&
      /Never pass `force`/.test(autoSkill) &&
      /another actor's live claim/.test(autoSkill) &&
      /take_ticket action: "renew"/.test(autoSkill) &&
      /reads that command's log itself/i.test(autoSkill) &&
      /`needs-changes` review/.test(autoSkill) &&
      /`failure_class`/.test(autoSkill),
  ],
];
for (const [name, ok] of remediationContract) {
  check(name, ok, ok ? "contract present" : "SKILL-037 remediation-loop wording missing");
}

console.log("\n=== 19. CORE-126 protected batch workflow contract ===");
const toolReference = read(join(skillsDir, "kanmer-tickets", "references", "tool-reference.md"));
const protectedBatchContract = [
  [
    "kanmer-execute emits the complete frozen batch footer roster",
    /one standalone `Kanmer: <ID>` footer\s+for every member in the complete frozen roster[\s\S]{0,120}no omission or extra/i.test(
      executeSkill,
    ),
  ],
  [
    "kanmer-review writes one member-owned exact-head pass attestation per roster ticket",
    /one fresh independent review of the shared PR at its\s+exact full head SHA[\s\S]{0,1200}member-owned whole-file `scratch\/review\.md` attestation\s+for every member in the complete frozen roster[\s\S]{0,500}`independent: true`[\s\S]{0,80}`verdict: pass`[\s\S]{0,120}exact shared `pr` and full\s+`head_sha`/i.test(
      reviewSkill,
    ),
  ],
  [
    "kanmer-review reads the complete active manifest projection before batch attestation",
    /call `list_items include_archived: true`[\s\S]{0,180}`batch\.state` must be `active`[\s\S]{0,180}`batch\.members` is the complete frozen roster[\s\S]{0,180}`batch\.workspace` plus[\s\S]{0,80}`batch\.branch`/i.test(
      reviewSkill,
    ),
  ],
  [
    "kanmer-closeout discovers archived batch members by exact batch id",
    /Before any batch\s+cleanup action, first call `list_items include_archived: true`[\s\S]{0,220}`batch\.id`[\s\S]{0,120}exact same batch id/i.test(
      closeoutSkill,
    ),
  ],
  [
    "kanmer-closeout retains the all-terminal manifest through shared Git cleanup before member release",
    /require every immutable-roster member to be terminal[\s\S]{0,700}keep the manifest linked and do not release any\s+member yet[\s\S]{0,700}remove the\s+one shared worktree and delete the shared branch[\s\S]{0,500}If any shared Git cleanup step fails[\s\S]{0,180}do not (?:call|issue)[\s\S]{0,80}release/i.test(closeoutSkill) &&
      /Only after (?:that )?shared Git cleanup succeeds[\s\S]{0,220}`take_ticket action: "release"` for every roster member[\s\S]{0,380}idempotent[\s\S]{0,300}final release unlinks the manifest/i.test(closeoutSkill),
  ],
  [
    "kanmer-execute binds all batch work authority to actor plus durable controller_run",
    /Retain that nonempty `controller_run` in the controller's durable run record[\s\S]{0,220}actual\s+MCP request actor[\s\S]{0,120}durable run id/i.test(executeSkill) &&
      /Declaration, pending recovery, every later member take, batch renew, and every\s+batch execution packet exact-match that actor\/run pair/i.test(executeSkill),
  ],
  [
    "kanmer-execute requires current CAS tokens on every modern batch renew",
    /modern batch renewal always requires both current `lease_id` and\s+`lease_revision` plus that exact run id[\s\S]{0,180}never enters the no-token owner\s+compatibility lane/i.test(
      executeSkill,
    ),
  ],
  [
    "kanmer-auto maps its immutable run_id to every batch controller_run call",
    /automation ledger's immutable schema-3 `run_id` as the\s+batch `controller_run`/i.test(autoSkill) &&
      /never a worker id, session id, reconnect id, or\s+per-call id/i.test(autoSkill) &&
      /first batch declaration/i.test(autoSkill) &&
      /pending-declaration recovery/i.test(autoSkill) &&
      /every packet-first `get_execution_packet`/i.test(autoSkill) &&
      /every\s+later member `take_ticket`/i.test(autoSkill) &&
      /every `take_ticket action: "renew"`/i.test(autoSkill) &&
      /current `lease_id` and `lease_revision` CAS pair/i.test(autoSkill),
  ],
  [
    "kanmer-execute creates or recovers exactly one shared batch PR",
    /first batch member alone is the sole PR creator/i.test(executeSkill) &&
      /zero matching open PRs means create\s+the one shared PR/i.test(executeSkill) &&
      /exactly one\s+match means validate and reuse it/i.test(executeSkill) &&
      /more than one match is ambiguous and must stop/i.test(executeSkill) &&
      /later member pushes the same\s+manifest branch and never calls `gh pr create`/i.test(executeSkill) &&
      /resolved source\s+repository for both base and head/i.test(executeSkill) &&
      /base `delivery\.prTarget`/i.test(executeSkill) &&
      /head branch `claim\.batch\.branch`/i.test(executeSkill) &&
      /current pushed head SHA/i.test(executeSkill) &&
      /exact complete frozen footer roster/i.test(executeSkill) &&
      /current member's\s+own `prs\[\]`/i.test(executeSkill),
  ],
  [
    "kanmer-review advances the complete merged batch roster idempotently",
    /After a confirmed shared batch merge/i.test(reviewSkill) &&
      /re-read `list_items include_archived:\s+true`/i.test(reviewSkill) &&
      /active manifest projection/i.test(reviewSkill) &&
      /immutable\s+manifest order/i.test(reviewSkill) &&
      /member\s+is in Review, call its `get_doc_gates`/i.test(reviewSkill) &&
      /move exactly Review → Verifying/i.test(reviewSkill) &&
      /current `expected_updated`/i.test(reviewSkill) &&
      /already Verifying[\s\S]{0,80}idempotent no-op/i.test(reviewSkill) &&
      /Any other stage[\s\S]{0,100}is a stop/i.test(reviewSkill) &&
      /re-read the complete roster/i.test(reviewSkill) &&
      /every member is Verifying/i.test(reviewSkill) &&
      /Review must never write\s+proof/i.test(reviewSkill),
  ],
  [
    "kanmer-closeout retains manifest discovery through unlink and permits a fresh terminal releaser",
    /authoritative manifest is `active` or `releasing`[\s\S]{0,220}`list_items include_archived: true` is the sole complete roster census[\s\S]{0,220}every member until\s+manifest unlink[\s\S]{0,260}`search_items` projects batch metadata only (?:onto|for) matching\s+non-archived results[\s\S]{0,120}never a complete roster census[\s\S]{0,300}`batch\.state`[\s\S]{0,120}`batch\.members`[\s\S]{0,120}`batch\.workspace`[\s\S]{0,80}`batch\.branch`/i.test(
      closeoutSkill,
    ) &&
      /fresh closeout agent may call[\s\S]{0,100}`take_ticket action: "release"`[\s\S]{0,180}not actor-bound[\s\S]{0,180}does not require the original MCP actor or\s+`controller_run`/i.test(closeoutSkill),
  ],
  [
    "tool reference exposes the durable batch authority, summary, CAS, and closeout contract",
    /Pending, active and releasing manifests persist the exact pair of the actual MCP request actor and that durable run id[\s\S]{0,260}Declaration, pending recovery, every later member take, batch renew and batch execution packet must exact-match both values/i.test(
      toolReference,
    ) &&
      /`batch` \(`\{ id, controller, frozenAt, state, members, workspace, branch \}`[\s\S]{0,420}`list_items include_archived: true` is the sole complete roster census[\s\S]{0,420}`search_items` projects batch metadata only (?:onto|for) matching\s+non-archived results[\s\S]{0,120}(?:not|never) a complete roster census/i.test(toolReference) &&
      /Every modern manifest-backed batch renew supplies its exact `controller_run` and both current `lease_id` and `lease_revision`[\s\S]{0,120}no no-token compatibility fallback/i.test(
        toolReference,
      ) &&
      /terminal release is deliberately not actor-bound[\s\S]{0,160}fresh closeout agent/i.test(toolReference),
  ],
];
for (const [name, ok] of protectedBatchContract) {
  check(name, ok, ok ? "contract present" : "CORE-126 protected-batch wording missing");
}

console.log("\n=== 20. SKILL-036 durable `/goal` orchestration contract ===");
// FRD-034's controller is `kanmer-auto` extended, not a second orchestrator: the
// durable run record, the status vocabulary, the reconciliation loop and the
// stop predicates are already checks 13 and 14's, and forking them was the
// explicit non-goal. What check 20 adds is the part FRD-034 asks for that no
// tool reports and check 13 cannot see — the frozen roster, the preflight, the
// overlap breadth, the sync-before-gate rule, the escalation boundary, the
// active-stage invariants, and the evidence rules a two-day multi-controller
// run paid for. Each is asserted in the one skill that can act on it, exactly
// as check 18 does, because a rewrite that drops one silently reverts to the
// failure it was written from.
const ordinaryExclusionRuleIndex = autoSkill.search(
  /\*\*Before resolving any dependency\s+edge, apply every ordinary exclusion\.\*\*/i,
);
const targetParseRuleIndex = autoSkill.search(
  /Parse the requested target \*\*before resolving dependency feasibility\*\*/i,
);
const targetSatisfactionRuleIndex = autoSkill.search(
  /After all ordinary exclusions and expired-claim classification, but before\s+outside-roster closure or any dependency pruning, determine exact target\s+satisfaction for every surviving candidate/i,
);
const claimHandlingRuleIndex = autoSkill.indexOf(
  "Claim classification is part of those ordinary exclusions",
);
const externalBlockerRuleIndex = autoSkill.search(
  /Resolve outside-roster exclusions to a fixed point \*\*after\*\* all ordinary\s+exclusions and target classification/i,
);
const dependencyCycleRuleIndex = autoSkill.search(
  /Only after ordinary exclusions and that external-blocker fixed point,\s+\*\*before retaining any dependent under the in-roster rule below\*\*/i,
);
const targetFeasibilityRuleIndex = autoSkill.indexOf(
  "**Only a target that reaches the board's final stage clears a live blocker",
);
const internalDependencyRuleIndex = autoSkill.indexOf(
  "**Every live blocker is inside the roster being frozen and the requested",
);
const goalContract = [
  [
    "kanmer-auto accepts the five goal scopes and freezes its roster",
    /one ticket, one explicit existing group, one area, an explicit\s+ticket list, or the prepared board/i.test(autoSkill) &&
      /run\s+host group/i.test(autoSkill) &&
      /never re-resolved/i.test(autoSkill) &&
      /created after that freeze never joins\s+a running roster/i.test(autoSkill) &&
      /quick capture[\s\S]{0,200}only after an explicit promotion/i.test(autoSkill) &&
      /never the project, and never a ticket merely because the\s+ticket exists on the board/i.test(autoSkill),
  ],
  [
    // N-1 (SKILL-038): this check is NAMED for board health, and pinned that
    // half with a bare /get_status\.boardWorktree/ — a pattern the
    // push-the-board section also satisfies through
    // `get_status.boardWorktree.expectedBranch`. The whole
    // `- **Board worktree.**` preflight bullet could therefore be deleted with
    // this check still green, which is the same defect the rest of check 19
    // exists to prevent: a name that promises more than its regex holds. Both
    // anchors below occur only inside that bullet — section 2's similar
    // sentence reads "never a lane, rebase target, or cleanup target", without
    // the repeated article and without the working directory.
    "kanmer-auto preflights identity, delivery target and board health",
    /### Preflight before the first mutation/.test(autoSkill) &&
      /project_fingerprint/.test(autoSkill) &&
      /never hardcodes `main`/i.test(autoSkill) &&
      /verification target/i.test(autoSkill) &&
      /- \*\*Board worktree\.\*\* `get_status\.boardWorktree` must be healthy and on its\s+board branch/.test(
        autoSkill,
      ) &&
      /never a lane, a\s+rebase target, a cleanup target, or a working directory/i.test(autoSkill),
  ],
  [
    "kanmer-auto detects overlap beyond the files document and holds contending rails",
    /contract or API surface/i.test(autoSkill) &&
      /lockfile/i.test(autoSkill) &&
      /heavyweight shared resource/i.test(autoSkill) &&
      /hold the second rail rather than reading its flake as a regression/i.test(autoSkill),
  ],
  [
    "kanmer-auto pushes the board before it trusts a gate result",
    /### Push the board before trusting a gate/.test(autoSkill) &&
      /reads the \*\*remote\*\*\s+board tip/i.test(autoSkill) &&
      /rev-parse origin\/<board-branch>/.test(autoSkill) &&
      /get_status\.boardWorktree\.expectedBranch/.test(autoSkill) &&
      /KANMER_BOARD_BRANCH/.test(autoSkill) &&
      !/rev-parse origin\/kanmer-board/.test(autoSkill) &&
      /SYNC_REQUIRED/.test(autoSkill) &&
      /never commit or push the board branch outside an explicit grant/i.test(autoSkill),
  ],
  [
    "kanmer-auto bounds churn and adds no second route around the budget",
    /one automatic replan/i.test(autoSkill) &&
      /REMEDIATION_BUDGET_EXHAUSTED/.test(autoSkill) &&
      /creates no new remediation allowance/.test(autoSkill) &&
      /reason beginning `operator:`/.test(autoSkill) &&
      /still fails materially after its one\s+replan/i.test(autoSkill),
  ],
  [
    "kanmer-auto rebases onto the recorded delivery target, never a literal main",
    /recorded `delivery_target`/.test(autoSkill) &&
      /rebase origin\/<delivery_target>/.test(autoSkill) &&
      /integration branch is policy resolved in the preflight/i.test(autoSkill) &&
      !/rebase origin\/main/.test(autoSkill),
  ],
  [
    "kanmer-auto's identity preflight covers a new run as well as a resumed one",
    /For a\s+\*\*resumed\*\* run it must equal the existing record's `project_fingerprint`/i.test(autoSkill) &&
      /For a \*\*new\*\* run there is\s+no record yet/i.test(autoSkill),
  ],
  [
    "kanmer-auto keeps `deferred-to-ticket` legal for an out-of-scope finding",
    /\*\*`deferred-to-ticket`\*\* disposition, which is invalid without a linked\s+ticket/i.test(autoSkill) &&
      /disposition \*and\* its ticket whatever its severity/i.test(autoSkill),
  ],
  [
    "kanmer-auto states the active Review and Verifying invariants",
    /### Active Review and Verifying invariants/.test(autoSkill) &&
      /active or immediately queued reviewer/i.test(autoSkill) &&
      /active or immediately queued verification attempt/i.test(autoSkill) &&
      /Verifying is not a holding column/i.test(autoSkill) &&
      /unexplained Review or Verifying state/i.test(autoSkill) &&
      /exemption is the supported \*\*up to review\*\* target point/i.test(autoSkill) &&
      /Every\s+other target still requires one/i.test(autoSkill),
  ],
  [
    "kanmer-auto coordinates the merge, keeps role identities distinct, and still never merges",
    /distinct \*\*run identity\*\*/i.test(autoSkill) &&
      /\*\*coordinates\*\* the merge; it does not perform it/i.test(autoSkill) &&
      /never runs `gh pr merge`/.test(autoSkill) &&
      /required_conversation_resolution/.test(autoSkill),
  ],
  [
    "kanmer-auto keeps the evidence rules no tool reports",
    /### Read the evidence, not its summary/.test(autoSkill) &&
      /never frontmatter-only/i.test(autoSkill) &&
      /`threads_snapshot` is a YAML \*\*array\*\*/i.test(autoSkill) &&
      /uses an \*\*absolute path\*\*/i.test(autoSkill) &&
      /un-accepts the risk that was just accepted/i.test(autoSkill) &&
      /secrets-manager listing command/i.test(autoSkill),
  ],
  // SKILL-038. Section 1 step 2 used to say "Drop archived or blocked tickets"
  // while section 2 says a `blocks` edge orders the blocker before its
  // dependent. For a roster holding both those rules contradict, and step 2
  // wins because it runs before the freeze — so the ordering rule was
  // unreachable and the run silently shed exactly the work it exists to
  // sequence. The three checks below are separate on purpose: the flag's
  // meaning, the retain rule and the exclude rule are three distinct claims,
  // and folding them into one assertion would let two of them be deleted
  // behind the third.
  [
    "kanmer-auto judges a blocked flag against the frozen roster, not the whole board",
    /\*\*A `blocked` flag is a fact about the board, not about this run\.\*\*/.test(autoSkill) &&
      /reports `blocked: true` whenever \*any\* live ticket anywhere/.test(autoSkill) &&
      /read the blocked ticket's `blockedBy` with `get_links`/.test(autoSkill) &&
      /is not filtered by liveness/i.test(autoSkill),
  ],
  [
    "kanmer-auto orders claims and external-blocker closure before cycle analysis",
    targetParseRuleIndex >= 0 &&
      ordinaryExclusionRuleIndex > targetParseRuleIndex &&
      claimHandlingRuleIndex > ordinaryExclusionRuleIndex &&
      targetSatisfactionRuleIndex > claimHandlingRuleIndex &&
      externalBlockerRuleIndex > targetSatisfactionRuleIndex &&
      dependencyCycleRuleIndex > externalBlockerRuleIndex &&
      internalDependencyRuleIndex > dependencyCycleRuleIndex &&
      /Claim classification is part of those ordinary exclusions and therefore\s+happens before outside-blocker closure or cycle detection/i.test(autoSkill) &&
      autoSkill.includes("a blocker excluded on one pass is an outside-roster blocker") &&
      autoSkill.includes("for its dependents on the next") &&
      /a \*\*live\*\* foreign claim[\s\S]{0,180}belongs to that actor — exclude it and\s+coordinate/i.test(
        autoSkill,
      ) &&
      autoSkill.includes("With `A -> B -> A` and A live-foreign-claimed, exclude A for its") &&
      autoSkill.includes("claim before graph construction, then exclude B with A named during the") &&
      autoSkill.includes("fixed point; record no cycle for that excluded pair"),
  ],
  [
    "kanmer-auto detects and blocks dependency cycles before retaining internal dependents",
    dependencyCycleRuleIndex >= 0 &&
      internalDependencyRuleIndex > dependencyCycleRuleIndex &&
      /directed graph from the remaining live in-roster edges, but admit an edge\s+only when its dependent is a nonterminal member in the needs-advancement\s+set/i.test(
        autoSkill,
      ) &&
      /Filter by the dependent, not the blocker: a terminal\s+`target-reached` member may remain a blocker source, but no incoming\s+dependency edge is admitted for it/i.test(
        autoSkill,
      ) &&
      /cyclic\s+strongly\s+connected\s+component/i.test(autoSkill) &&
      /including a\s+one-ticket self-loop/i.test(autoSkill) &&
      /exact ordered witness\s+path \(`A -> B -> A`\) and\s+its complete member set/i.test(autoSkill) &&
      /\*\*cycle-affected set\*\*[\s\S]{0,220}every cycle member \(necessarily\s+nonterminal and needing advancement\) plus every transitive nonterminal\s+dependent/i.test(
        autoSkill,
      ) &&
      /Give every affected ticket a terminal\s+run-ledger disposition of `blocked`/.test(autoSkill) &&
      /name the originating cycle path and\s+members in its reason, and dispatch none\s+of them/i.test(
        autoSkill,
      ) &&
      /Record every component\s+separately, including multiple components and self-loops/i.test(autoSkill) &&
      /explicit\s+blocking disposition, never a queue that\s+waits/i.test(autoSkill),
  ],
  [
    "kanmer-auto resolves the target before dependencies and terminates impossible shallow chains",
    targetParseRuleIndex >= 0 &&
      ordinaryExclusionRuleIndex > targetParseRuleIndex &&
      claimHandlingRuleIndex > ordinaryExclusionRuleIndex &&
      targetSatisfactionRuleIndex > claimHandlingRuleIndex &&
      externalBlockerRuleIndex > targetSatisfactionRuleIndex &&
      targetFeasibilityRuleIndex > dependencyCycleRuleIndex &&
      internalDependencyRuleIndex > targetFeasibilityRuleIndex &&
      /record both the requested target and the\s+board's final stage in the Selection contract/i.test(autoSkill) &&
      /target \*\*reaches the board's final stage\*\*\s+when it is `closeout` or resolves to that final stage itself/i.test(
        autoSkill,
      ) &&
      /Do not compare the literal word `closeout` with a stage id/i.test(autoSkill) &&
      /archived or unpromoted quick capture never receives `target-reached`;\s+mandatory exclusions removed it first/i.test(autoSkill) &&
      /determine exact target\s+satisfaction for every surviving candidate from its current item, gates and\s+every live provider fact that target requires/i.test(autoSkill) &&
      /For \*\*up to review\*\*, require\s+the ticket to be in Review and fetch the ticket's linked current PR: it must\s+be open against the recorded delivery target, and its current head SHA must\s+be known/i.test(autoSkill) &&
      /Record the PR number, target branch, exact head and observation\s+time with the `target-reached` disposition/i.test(autoSkill) &&
      /Stored `prs` metadata, the item\s+and gates alone never prove that target; unavailable or contradictory\s+provider evidence leaves the member nonterminal and `waiting`, not\s+target-reached/i.test(autoSkill) &&
      /member\s+already at the requested\s+target remains in the frozen roster with a terminal\s+`target-reached` run\s+disposition/i.test(autoSkill) &&
      /remove it only from the set that still\s+needs advancement,\s+never exclude or dependency-block it/i.test(autoSkill) &&
      /Target satisfaction\s+does not erase\s+outgoing blocker evidence: that member remains a live blocker\s+for\s+unsatisfied members until its actual board state clears the edge/i.test(autoSkill) &&
      /target-reached member whose expired claim was classified is never\s+transferred/i.test(autoSkill) &&
      /Only a target that reaches the board's final stage clears a live blocker\s+edge/i.test(autoSkill) &&
      /requested target does not reach that final stage, terminally\s+block each dependent on a remaining acyclic live edge and every transitive downstream\s+dependent/i.test(
        autoSkill,
      ) &&
      /keep all of them in the frozen roster, name the\s+blocker, requested target and final stage in the reason, and dispatch none/i.test(
        autoSkill,
      ) &&
      /blocker and every unrelated safe lane still\s+proceed to the requested target/i.test(autoSkill) &&
      /For up-to-review `A -> B`, A reaches Review\s+while B and B's downstream dependents are terminally blocked/i.test(
        autoSkill,
      ) &&
      /For closeout `A -> B`, retain and serially order\s+both because closeout reaches the final stage and can clear A's edge/i.test(autoSkill) &&
      /explicit Done target has the same result/i.test(autoSkill) &&
      /An already-Done A creates\s+no live\s+edge and therefore does not affect B/i.test(autoSkill) &&
      /run with any cycle-affected or target-affected ticket is never reported\s+`completed`/i.test(
        autoSkill,
      ),
  ],
  [
    "kanmer-auto exempts target-reached members from dependency pruning",
    /Apply that fixed point only to\s+nonterminal members in the set that still needs advancement/i.test(
      autoSkill,
    ) &&
      /terminal\s+`target-reached` member is never an exclusion candidate or the dependent\s+receiving a dependency disposition/i.test(
        autoSkill,
      ) &&
      /outgoing live edges remain\s+blocker evidence for unsatisfied members/i.test(autoSkill) &&
      /admit an edge\s+only when its dependent is a nonterminal member in the needs-advancement\s+set/i.test(
        autoSkill,
      ) &&
      /target-reached` member may remain a blocker source, but no incoming\s+dependency edge is admitted for it/i.test(
        autoSkill,
      ) &&
      /If A is already terminal\s+`target-reached` in the apparent `A -> B -> A`, omit `B -> A` because A is\s+not an eligible dependent/i.test(
        autoSkill,
      ),
  ],
  [
    "kanmer-auto defers expired claim transfer until an assignment-ready re-read",
    /expired\*\* foreign claim[\s\S]{0,240}inspected and recorded as assignment-eligible without mutation/i.test(
      autoSkill,
    ) &&
      /do not append scratch,\s+transfer or otherwise write during selection/i.test(autoSkill) &&
      /transfer\s+only now, immediately before the member's first assignment and only after it\s+survived feasibility/i.test(
        autoSkill,
      ) &&
      /re-read the claim and collect the branch, worktree and\s+dirty-work evidence into the run record, then call `take_ticket action:\s+"transfer"` directly/i.test(autoSkill) &&
      /Do not append ticket scratch before transfer/i.test(autoSkill) &&
      /transfer\s+path re-collects recovery evidence and rechecks lease liveness under the write\s+lock; only a successful transfer records its preserved-work summary in ticket\s+scratch/i.test(autoSkill) &&
      /Never transfer\s+a terminal, excluded, target-reached or otherwise no-longer-advancing member/i.test(
        autoSkill,
      ) &&
      /`CLAIM_LIVE` refusal means it was renewed and the\s+ticket remains byte-for-byte unchanged; retain the frozen member with a\s+terminal `blocked` live-claim disposition and dispatch nothing/i.test(
        autoSkill,
      ),
  ],
  [
    "kanmer-auto revalidates frozen dependency safety before dispatch and after results",
    /Freeze a dependency-safety snapshot with the roster: exact live blocker\s+edges, blocker liveness, target bindings, claim classification, and the\s+relevant run dispositions/i.test(
      autoSkill,
    ) &&
      /Before every assignment and after every worker\s+result or timeout, compare live state with that snapshot/i.test(autoSkill) &&
      /Only after every implicated terminal source is valid or affirmatively\s+corrected does a changed snapshot re-run outside-roster closure,\s+cyclic-component and target-feasibility rules for nonterminal frozen members\s+that still need advancement/i.test(
        autoSkill,
      ) &&
      /A change never changes membership/i.test(autoSkill) &&
      /Map a\s+post-freeze exclusion to a terminal `blocked` disposition\s+instead of dropping\s+the member/i.test(
        autoSkill,
      ) &&
      /Persist and read back the replacement snapshot and every target\s+revalidation result or resulting disposition before any next dispatch/i.test(
        autoSkill,
      ) &&
      /terminal non-success disposition\s+while its edge is still live[\s\S]{0,180}every\s+transitive unsatisfied dependent a terminal `blocked` disposition naming the\s+blocker and failure; unrelated safe lanes continue/i.test(
        autoSkill,
      ) &&
      /removed edge may make\s+a still-nonterminal queued member eligible, but no graph change reopens a\s+terminal run disposition/i.test(
        autoSkill,
      ) &&
      /then perform the\s+dependency-snapshot comparison above/i.test(autoSkill) &&
      /post-result revalidation and downstream-failure propagation above/i.test(autoSkill),
  ],
  [
    "kanmer-auto revalidates target-reached evidence before terminal reporting",
    /Target binding has one revalidation procedure and it runs before dependency\s+feasibility/i.test(autoSkill) &&
      /changed target fact or\s+outgoing blocker liveness for a `target-reached` member, first revalidate\s+that terminal blocker source even though it is outside the\s+needs-advancement set/i.test(
        autoSkill,
      ) &&
      /Immediately before any terminal run-status transition\s+or final report, run the same procedure for every `target-reached` member/i.test(
        autoSkill,
      ) &&
      /Re-gather the current item, gates and target-specific live provider facts\s+and compare them with the recorded target binding/i.test(autoSkill) &&
      /No dependent that relies\s+on that source is assigned until this pass has a durable result/i.test(
        autoSkill,
      ) &&
      /\*\*Valid\.\*\*[\s\S]{0,100}Refresh the exact binding and observation time, then continue\s+dependency feasibility/i.test(
        autoSkill,
      ) &&
      /\*\*Affirmatively stale or contradictory\.\*\*[\s\S]{0,100}Any available required fact\s+that disproves the binding makes this outcome authoritative even when\s+some other provider is unavailable/i.test(
        autoSkill,
      ) &&
      /Preserve the old binding and every\s+current fact, then replace `target-reached` with a terminal `blocked`\s+disposition whose reason starts `target evidence stale:`/i.test(
        autoSkill,
      ) &&
      /terminal-to-terminal correction: never reopen or dispatch the member, and\s+propagate its terminal non-success before dependency feasibility\. Never\s+report the run `completed` or the member at target from stale evidence/i.test(
        autoSkill,
      ) &&
      /\*\*Unavailable or unknown\.\*\* Only the absence of a required live fact, with\s+no available fact disproving the binding, earns this outcome/i.test(
        autoSkill,
      ) &&
      /Preserve\s+`target-reached` and its last valid binding; record the unavailable fact,\s+provider, observation time and exact resume action in the run/i.test(
        autoSkill,
      ) &&
      /keep every\s+dependent relying on it `waiting`, and dispatch none of those dependents/i.test(
        autoSkill,
      ) &&
      /Unrelated safe lanes continue\. When none remains ready, set the run\s+`paused` with a stop reason starting `target evidence unavailable:`/i.test(
        autoSkill,
      ) &&
      /Resume only after provider capability changes or an explicit resume, then\s+run this same revalidation again/i.test(autoSkill) &&
      /Unavailability never consumes the\s+verification retry budget, becomes terminal `blocked`, or permits\s+`completed`/i.test(
        autoSkill,
      ) &&
      /Only after every implicated terminal source is valid or affirmatively\s+corrected does a changed snapshot re-run outside-roster closure/i.test(
        autoSkill,
      ),
  ],
  [
    "kanmer-auto lets independent lanes finish before a cyclic run blocks",
    /Keep the run `running` while any unaffected safe lane can proceed/i.test(autoSkill) &&
      /neither\s+cycle members nor target-affected dependents cancel or pause an independent\s+lane/i.test(
        autoSkill,
      ) &&
      /Only after every safe\s+lane has a terminal disposition and no lane is\s+active or waiting, set the run to `blocked`/i.test(
        autoSkill,
      ) &&
      /For `A -> B -> A`\s+plus independent D, D reaches its target before the run becomes blocked/i.test(
        autoSkill,
      ) &&
      /run with any cycle-affected or target-affected ticket is never reported\s+`completed`/i.test(
        autoSkill,
      ),
  ],
  [
    "kanmer-auto keeps an acyclic in-roster dependent only for a final-stage target",
    /\*\*Every live blocker is inside the roster being frozen and the requested\s+target reaches the board's final stage\*\* — keep the dependent/i.test(
      autoSkill,
    ) &&
      /queued\s+work, not an exclusion/i.test(autoSkill) &&
      /one\s+serial lane behind its\s+blockers/i.test(autoSkill),
  ],
  [
    "kanmer-auto excludes only a dependent blocked from outside the roster, with its reason",
    /\*\*Any live blocker is outside the roster being frozen\*\* — exclude the\s+dependent/i.test(
      autoSkill,
    ) && /naming the blocking ids and\s+where they sit/i.test(autoSkill),
  ],
  // F-005. `transient` is the one routing outcome that returns a lane to the
  // stage it came from, and the only bound on it was the verifier's own
  // judgement. A run that must terminate cannot rest a termination argument on
  // discipline, so the budget is a number, it lives in the run record, and the
  // refusal it produces is quoted rather than paraphrased.
  [
    "kanmer-auto bounds transient re-runs with a number and blocks with the exact refusal",
    /### The transient retry budget/.test(autoSkill) &&
      /\*\*`transient_retry_limit`\*\*, defaulting to \*\*2\*\* re-runs per ticket per\s+run/.test(
        autoSkill,
      ) &&
      /the ledger's `Transient` column counts what each ticket has spent/.test(autoSkill) &&
      /Both permitted fresh-verifier authorization paths in section 9 spend this one\s+budget/i.test(autoSkill) &&
      /Every dispatch admitted by either path is one\s+\*\*logical verifier attempt\*\*/i.test(autoSkill) &&
      /bootstrap path may admit at most one\s+evidence-establishing attempt per ticket per run/i.test(autoSkill) &&
      /classified-transient path\s+may admit another fresh independent attempt whenever durable budget remains/i.test(autoSkill) &&
      /Immediately before its first dispatch,\s+reserve that attempt by incrementing the\s+ticket's durable `Transient` count,\s+writing the run record and reading it back/i.test(autoSkill) &&
      /launch proven to have failed\s+before mutation may use section 9's one logged\s+transport retry against the same\s+reservation: do not increment it again,\s+decrement it or reset it/i.test(autoSkill) &&
      /Unknown\s+launch status dispatches nothing/i.test(autoSkill) &&
      /default\s+of 2 deliberately leaves room for one evidence-bootstrap and one\s+classified-transient attempt/i.test(autoSkill) &&
      /Raising the limit adds classified-transient-path\s+capacity; it never adds a third authorization path/i.test(autoSkill) &&
      /classification\s+never resets the count/i.test(autoSkill) &&
      /transient budget exhausted: <ticket> spent <n>\/<transient_retry_limit> re-runs at <SHA>; last failing check <check>\. Not retried again without an operator decision\./.test(
        autoSkill,
      ) &&
      /Raising the limit is an operator action recorded in the run record/i.test(autoSkill),
  ],
  [
    "kanmer-auto permits exactly two verification authorization paths under one counted budget",
    /There are exactly two authorization paths\s+that may admit logical verification attempts to fresh independent verifiers/i.test(autoSkill) &&
      /Every admitted attempt requires room below `transient_retry_limit` and one\s+durable `Transient` reservation before its first dispatch/i.test(
        autoSkill,
      ) &&
      /\*\*Evidence bootstrap\.\*\* The authoritative prior proof records both\s+`result: FAIL` or `result: INCONCLUSIVE`/i.test(
        autoSkill,
      ) &&
      /`failure_class: inconclusive`/i.test(autoSkill) &&
      /A `FAIL` proof also retains the non-zero failing\s+attempt/i.test(autoSkill) &&
      /explicitly\s+requests a re-run of the same\s+failing job at the same SHA/i.test(autoSkill) &&
      /failing path is untouched by the\s+diff and record a concrete\s+environmental mechanism hypothesis/i.test(autoSkill) &&
      /A fresh\s+independent verifier performs\s+the re-run/i.test(autoSkill) &&
      /This path may admit at most one\s+evidence-establishing logical attempt per ticket per run/i.test(autoSkill) &&
      /never lets the\s+controller self-classify the failure\s+as\s+transient/i.test(autoSkill) &&
      /\*\*Classified transient\.\*\* An authoritative exact-SHA proof already records\s+`failure_class: transient`/i.test(
        autoSkill,
      ) &&
      /fresh independent verifier may perform another\s+bounded re-run whenever the durable budget still has room/i.test(autoSkill) &&
      /Raising the limit\s+adds capacity only to this path and never creates a third authorization path/i.test(autoSkill) &&
      /Reserve the count once per logical attempt immediately before its first\s+dispatch/i.test(autoSkill) &&
      /single logged transport retry permitted above reuses the same reservation and\s+does not increment, decrement or reset it/i.test(autoSkill) &&
      /Unknown launch status dispatches no\s+replacement/i.test(autoSkill) &&
      /proof lacking the allowed result, the exact class, the\s+explicit evidence-bootstrap request or, for `FAIL`, the retained non-zero\s+attempt never enters the bootstrap route/i.test(autoSkill) &&
      /Implementation or\s+plan failures never\s+enter either route/i.test(autoSkill),
  ],
  [
    "kanmer-review binds its gate reading to a pushed board and resolves what it disposes",
    /does not re-run when the board is pushed/i.test(reviewSkill) &&
      /required_conversation_resolution/.test(reviewSkill) &&
      /dispositioning a finding and resolving its thread are one\s+obligation/i.test(reviewSkill) &&
      /resolve\s+the thread only after that/i.test(reviewSkill),
  ],
  [
    "kanmer-verify earns transient with evidence and reads a proof in full",
    /`transient` is a conclusion you earn, never one you assert/i.test(verifySkill) &&
      /same job at the same SHA with no code change/i.test(verifySkill) &&
      /mechanism argument/i.test(verifySkill) &&
      /Read a proof record \*\*in full\*\*/i.test(verifySkill) &&
      /its own log paths/i.test(verifySkill),
  ],
];
for (const [name, ok] of goalContract) {
  check(name, ok, ok ? "contract present" : "SKILL-036 goal-controller wording missing");
}

// F1: the orientation advertises five scopes, and an advertisement is not a
// capability. Each scope gets its own named check so that deleting one
// resolution step fails for that scope by name rather than being absorbed by a
// neighbour, which is the difference between pinning the roster procedure and
// pinning the sentence that claims it exists.
const scopeResolution = [
  ["ticket", /\*\*ticket scope\*\* — `get_item "<TICKET-ID>"`/],
  ["group", /\*\*group scope\*\* — `list_items group: "<explicit group>"`/],
  ["area", /\*\*area scope\*\* — `list_items area: "<area id>"`/],
  ["list", /\*\*list scope\*\* — `get_item` for each id the operator named/],
  ["board", /\*\*board scope\*\* — `list_items` with no scope filter/],
];
for (const [scope, rule] of scopeResolution) {
  check(
    `kanmer-auto resolves the roster for ${scope} scope`,
    rule.test(autoSkill),
    rule.test(autoSkill) ? "resolution step present" : "scope declared with no resolution step",
  );
}
check(
  "kanmer-auto freezes and gates every scope's roster identically",
  /frozen into `## Selection contract` at that\s+moment and never re-resolved/.test(autoSkill) &&
    /gates-first readiness rules do not vary by scope/i.test(autoSkill),
  "one freeze rule, one readiness rule",
);

// F6 + SKILL-038. Schema 2 introduced scope/authority/delivery; schema 3 is the
// first version whose retry budget and counter make transient routing bounded.
// An older live record may be closed under the vocabulary it already has, but
// stamping new assumptions onto it would invent history and make the counter
// unknowable. The successor is a distinct run created from durable intent.
check(
  "kanmer-auto requires schema 3 and supersedes schema 1/2 without rewriting them",
  /The current run-record schema is \*\*`schema: 3`\*\*/.test(autoSkill) &&
    /schema 3 is the first\s+schema that carries `transient_retry_limit` and the ledger's durable\s+`Transient` count/i.test(
      autoSkill,
    ) &&
    /active `schema: 1` or `schema: 2` record is not resumed or normalized into\s+schema 3/i.test(
      autoSkill,
    ) &&
    /\*\*never rewritten in place\*\*/i.test(autoSkill) &&
    /close the legacy run under its own schema with a\s+terminal status that schema already allows/i.test(
      autoSkill,
    ) &&
    /reconcile every legacy lane and worker\s+from the complete ledger against current board, claim, workspace, Git, GitHub,\s+CI and recorded worker-result evidence/i.test(
      autoSkill,
    ) &&
    /Every legacy worker must be proven\s+inactive/i.test(autoSkill) &&
    /If any legacy worker is still active or its state is uncertain, preserve the\s+old ledger and `automation\/current\.md` pointer byte-for-byte, create no\s+successor/i.test(
      autoSkill,
    ) &&
    /Only a\s+fully quiescent legacy run may be superseded/i.test(autoSkill) &&
    /Create the distinct schema-3 successor at the exact prepared id if it is\s+absent/i.test(autoSkill) &&
    /unknown or absent `schema` is a stop/i.test(autoSkill),
  "schema 3 + preserved old record + distinct successor",
);
const legacyPreparedIndex = autoSkill.indexOf("Before closing anything, append a `successor-prepared` event");
const legacyCloseIndex = autoSkill.indexOf("After the intent is durable, close the legacy run", legacyPreparedIndex);
const legacyCreateIndex = autoSkill.indexOf("Create the distinct schema-3 successor", legacyCloseIndex);
const legacyPointerIndex = autoSkill.indexOf("`automation/current.md` last", legacyCreateIndex);
check(
  "kanmer-auto durably prepares and idempotently rolls forward a legacy successor",
  /derive one deterministic successor `run_id` from the\s+legacy identity/i.test(autoSkill) &&
    legacyPreparedIndex >= 0 &&
    legacyCloseIndex > legacyPreparedIndex &&
    legacyCreateIndex > legacyCloseIndex &&
    legacyPointerIndex > legacyCreateIndex &&
    /That durable intent names the successor id,\s+project fingerprint, scope and selector, authority, delivery target, lane and\s+retry limits, and the exact ordered roster with every current run disposition/i.test(
      autoSkill,
    ) &&
    /By default the\s+successor preserves that exact legacy roster and those dispositions/i.test(autoSkill) &&
    /fresh\s+selection is permitted only when explicit operator authority for fresh\s+selection is recorded in the prepared intent/i.test(autoSkill) &&
    /Create the distinct schema-3 successor at the exact prepared id if it is\s+absent, or validate an already-present successor against the complete intent/i.test(
      autoSkill,
    ) &&
    /Startup rolls this transition forward idempotently whenever the pointer names\s+an active or terminal legacy record with a `successor-prepared` event/i.test(
      autoSkill,
    ) &&
    /For an\s+active record, re-prove quiescence before closing it; for a terminal record,\s+create the exact successor if absent or validate it if present/i.test(
      autoSkill,
    ) &&
    /If a handoff\s+has begun but the intent is absent or malformed, its id conflicts, or the\s+present successor differs from it, stop without changing the pointer and never\s+choose an alternate id/i.test(
      autoSkill,
    ),
  "durable intent + exact successor identity + pointer-last roll-forward",
);
check(
  "kanmer-auto resolves every missing legacy successor field before preparing intent",
  /Before preparing its intent, resolve every successor value\s+that the legacy schema did not record and make the source of each value\s+auditable/i.test(autoSkill) &&
    /Copy fields the legacy record does contain and record `legacy-field`\s+as their source/i.test(autoSkill) &&
    /Schema 1 was group-only, so derive only `scope: group` and\s+`scope_selector: <legacy group>` from that published schema and record\s+`schema-1-group-contract` as their source/i.test(autoSkill) &&
    /For authority and delivery absent\s+from schema 1, and the retry limit and each per-ticket `Transient` count absent\s+from schema 1\/2, use an exact value already supplied by the operator or obtain\s+one bounded operator decision before mutation/i.test(autoSkill) &&
    /Resolve delivery against the\s+live project policy and require the operator-authorised target; a project\s+fingerprint mismatch is still a stop/i.test(autoSkill) &&
    /Reconstruct each transient count from\s+retained attempts when possible/i.test(autoSkill) &&
    /only fail-closed\s+normalization is the chosen retry limit \(budget exhausted\)/i.test(autoSkill) &&
    /never silently initialize an unknown count\s+to zero/i.test(autoSkill) &&
    /`field_resolution` entry for every successor field that was\s+absent from the legacy record, naming the resolved value, source, evidence or\s+operator decision, and reason/i.test(autoSkill) &&
    /Missing or conflicting field-resolution\s+evidence makes the intent malformed and stops the handoff/i.test(autoSkill),
  "recorded sources + bounded operator decisions + fail-closed retry normalization",
);

const newRunClauseStart = autoSkill.indexOf("For a new run, create a path-safe unique UTC id");
const newRunClauseEnd = autoSkill.indexOf("Write and read it back", newRunClauseStart);
const newRunClause = autoSkill.slice(newRunClauseStart, newRunClauseEnd);
const schema3RunFields = [
  "kind",
  "schema",
  "run_id",
  "group",
  "scope",
  "scope_selector",
  "authority",
  "delivery_target",
  "project_fingerprint",
  "controller",
  "status",
  "created_at",
  "updated_at",
  "lane_limit",
  "transient_retry_limit",
  "stop_reason",
];
check(
  "kanmer-auto validates every required schema-3 new-run field",
  newRunClauseStart >= 0 &&
    newRunClauseEnd > newRunClauseStart &&
    schema3RunFields.every((field) => newRunClause.includes(`\`${field}\``)) &&
    /Refuse creation when any required field is\s+absent or malformed/i.test(newRunClause),
  schema3RunFields.filter((field) => !newRunClause.includes(`\`${field}\``)).join(", ") ||
    "all fields + refusal",
);

// The run record is where a resumed controller learns what it is adopting, so
// the scope, the granted authority and the resolved delivery target belong in
// the template rather than in one run's prose.
// `transient_retry_limit:` joins them for the same reason (SKILL-038, F-005):
// a budget the controller keeps in its head is not a budget, and FRD-034
// already requires the run to record its "retry budget".
for (const field of [
  "scope:",
  "scope_selector:",
  "authority:",
  "delivery_target:",
  "transient_retry_limit:",
]) {
  check(`run-state template records ${field}`, runStateBody.includes(field), field);
}
check(
  "run-state Selection contract freezes the roster and the ledger tracks the replan",
  /\*\*frozen at/.test(runStateBody) && /\| Replan \|/.test(runStateBody),
  "frozen roster + replan column",
);
check(
  "schema-3 run records declare target-reached in the exhaustive disposition vocabulary",
  /ticket dispositions are exactly `queued`, `active`,\s+`waiting`, `blocked`, `target-reached`, `finished`, or `skipped`/i.test(autoSkill) &&
    /Disposition is exactly one of `queued`, `active`, `waiting`, `blocked`,\s+`target-reached`, `finished`, or `skipped`; `target-reached` is terminal/i.test(runStateBody),
  "skill vocabulary + run-state template vocabulary",
);
check(
  "run-state ledger counts transient re-runs per ticket",
  /\| Transient \|/.test(runStateBody),
  "transient column",
);
for (const [label, body] of [["run-state", runStateBody], ["current-run", currentRunBody]]) {
  check(`${label} template is stamped schema: 3`, /^schema: 3$/m.test(body), "schema: 3");
}
check(
  "current-run pointer names the scope it is resuming",
  /^scope: /m.test(currentRunBody) && /^scope_selector: /m.test(currentRunBody),
  "scope + selector",
);
check(
  "AGENTS documents the schema-3 dependency and retry controller contract",
  /kanmer-auto\/\s+# schema-3 \/goal controller: dependency-safe roster, bounded lanes\/retries, review\+verify/.test(
    agentsGuide,
  ) &&
    /A ticket's `blocked` flag is board-wide/.test(agentsGuide) &&
    /Parse and record the requested target before resolving dependency feasibility/.test(agentsGuide) &&
    /a target reaches the board's final stage when it is `closeout` or resolves to that final stage itself/.test(
      agentsGuide,
    ) &&
    /Apply ordinary exclusions first: unpromoted quick captures and live foreign claims are excluded, while expired foreign claims are classified without mutation/.test(
      agentsGuide,
    ) &&
    /After those ordinary exclusions but before outside-roster closure or any dependency pruning, determine exact target satisfaction for every surviving candidate/.test(
      agentsGuide,
    ) &&
    /from the current item, gates, and every live provider fact the target requires/.test(agentsGuide) &&
    /Up to review requires the ticket in Review plus a live linked PR that is open against the recorded delivery target with its current head SHA known/.test(
      agentsGuide,
    ) &&
    /record the PR, target, exact head and observation time, because stored `prs`, item and gates alone are not proof/.test(
      agentsGuide,
    ) &&
    /Unavailable or contradictory provider evidence leaves the member nonterminal and `waiting`/.test(
      agentsGuide,
    ) &&
    /archived or unpromoted quick capture never receives `target-reached`; mandatory exclusions removed it first/.test(
      agentsGuide,
    ) &&
    /already-target member stays in the frozen roster with terminal `target-reached`, leaves only the needs-advancement set, and is never dependency-blocked/.test(
      agentsGuide,
    ) &&
    /its outgoing edge remains live for unsatisfied members until actual board state clears it/.test(
      agentsGuide,
    ) &&
    /target-reached member whose expired claim was classified is never transferred/.test(
      agentsGuide,
    ) &&
    /Only then resolve outside-roster blockers to a fixed point and build the internal dependency graph/.test(
      agentsGuide,
    ) &&
    /Outside-roster closure and every dependency disposition apply only to nonterminal members in the needs-advancement set/.test(
      agentsGuide,
    ) &&
    /target-reached members remain frozen terminal evidence and may supply outgoing live edges, but are never candidates for pruning or replacement by dependency analysis/.test(
      agentsGuide,
    ) &&
    /Build the cycle graph only from live edges whose dependent is a nonterminal needs-advancement member: a target-reached member may be a blocker source, but no incoming edge is admitted for it, so it can never be a cycle member or cycle-affected recipient/.test(
      agentsGuide,
    ) &&
    /Transfer an expired foreign claim only immediately before first assignment after feasibility and a fresh claim read/.test(
      agentsGuide,
    ) &&
    /Record its branch, worktree and dirty-work evidence in the run ledger, then call `take_ticket transfer` directly; never append ticket scratch before transfer/.test(
      agentsGuide,
    ) &&
    /transfer path re-collects evidence, rechecks liveness under the write lock, and writes its preserved-work summary only after success, so `CLAIM_LIVE` leaves the ticket byte-for-byte unchanged/.test(
      agentsGuide,
    ) &&
    /preserve its branch, worktree and dirty work, and never transfer a terminal, excluded or target-reached member/i.test(
      agentsGuide,
    ) &&
    /outside-roster blocker excludes the dependent with named evidence/.test(agentsGuide) &&
    /safe acyclic in-roster blocker stays queued behind that blocker only when the requested target reaches the board's final stage/.test(
      agentsGuide,
    ) &&
    /directed blocker graph for cyclic components, including self-loops/.test(agentsGuide) &&
    /name each cycle's ordered path and complete members/.test(agentsGuide) &&
    /give its members and all transitive nonterminal needs-advancement downstream dependents a terminal `blocked` run disposition and dispatch none/.test(
      agentsGuide,
    ) &&
    /For a target that does not reach the final stage, terminally block each dependent on a remaining live edge and all transitive downstream dependents/.test(
      agentsGuide,
    ) &&
    /naming its blocker, requested target and final stage; keep those members in the frozen ledger and dispatch none/.test(
      agentsGuide,
    ) &&
    /Closeout and an explicit final-stage target both retain and serially order the acyclic chain/.test(
      agentsGuide,
    ) &&
    /an already-Done blocker creates no live edge/.test(
      agentsGuide,
    ) &&
    /Freeze exact blocker edges, liveness, target bindings, claim classifications and relevant dispositions as a dependency-safety snapshot/.test(
      agentsGuide,
    ) &&
    /Before every assignment and after every result, compare live state/.test(
      agentsGuide,
    ) &&
    /When any target fact or outgoing blocker liveness changes, first revalidate each implicated terminal target-reached source even though it is outside the needs-advancement set/.test(
      agentsGuide,
    ) &&
    /run that same procedure for every target-reached member immediately before a terminal run status or final report/.test(
      agentsGuide,
    ) &&
    /Each pass re-gathers the current item, gates and target-specific live provider evidence and compares them with the recorded target binding/.test(
      agentsGuide,
    ) &&
    /assign no dependent relying on it until the result is durable/.test(agentsGuide) &&
    /Valid evidence refreshes the exact binding and observation time/.test(agentsGuide) &&
    /Any available required fact that disproves the binding is affirmatively stale or contradictory even if another provider is unavailable/.test(
      agentsGuide,
    ) &&
    /preserve old and current facts, replace `target-reached` with terminal `blocked` reason `target evidence stale:` without reopening or dispatch, and propagate that terminal non-success before dependency feasibility/.test(
      agentsGuide,
    ) &&
    /Mere unavailable or unknown provider evidence, with no available fact disproving the binding, preserves `target-reached` and its last valid binding/.test(
      agentsGuide,
    ) &&
    /record the provider, fact, observation time and exact resume action, keep every dependent relying on it `waiting` and undispatched, let unrelated safe lanes continue, then set the run `paused` with reason `target evidence unavailable:` when none remains ready/.test(
      agentsGuide,
    ) &&
    /Resume only after capability state changes or an explicit resume and run the same revalidation again/.test(
      agentsGuide,
    ) &&
    /unavailability never consumes the verification retry budget, becomes terminal `blocked`, or permits `completed`/.test(
      agentsGuide,
    ) &&
    /Only after implicated terminal sources are valid or affirmatively corrected may graph changes re-run outside-roster closure, cycle detection and target feasibility for nonterminal members still needing advancement/.test(
      agentsGuide,
    ) &&
    /membership remains frozen, and persist\/read back every target result and disposition before dispatch/.test(
      agentsGuide,
    ) &&
    /terminal non-success blocker whose edge stays live terminally blocks every transitive unsatisfied dependent with its reason/.test(
      agentsGuide,
    ) &&
    /unrelated safe lanes continue and terminal dispositions never reopen/.test(agentsGuide) &&
    /Set the run `blocked` only after every safe lane is terminal, and never complete a run with a cycle-affected or target-affected member/.test(
      agentsGuide,
    ) &&
    /`transient_retry_limit` \(default 2 per ticket per run\)/.test(agentsGuide) &&
    /failed verification command is never rerun directly by the controller or by the same verifier/i.test(
      agentsGuide,
    ) &&
    /Exactly two authorization paths share that one budget/.test(
      agentsGuide,
    ) &&
    /evidence-bootstrap path may admit at most one evidence-establishing logical attempt per ticket per run/.test(
      agentsGuide,
    ) &&
    /classified-transient path may admit another fresh independent logical attempt whenever durable room remains/.test(
      agentsGuide,
    ) &&
    /Every admitted attempt reserves one durable count before its first dispatch/.test(
      agentsGuide,
    ) &&
    /evidence-bootstrap attempt requires an authoritative proof with `result: FAIL` or `result: INCONCLUSIVE`/.test(
      agentsGuide,
    ) &&
    /`failure_class: inconclusive`/.test(agentsGuide) &&
    /an explicit request for the same failing job at the same SHA/.test(
      agentsGuide,
    ) &&
    /`FAIL` also retains its non-zero failing attempt/.test(agentsGuide) &&
    /an untouched failing path and a concrete environmental mechanism hypothesis without controller self-classification/.test(
      agentsGuide,
    ) &&
    /classified-transient attempt requires an authoritative exact-SHA `failure_class: transient`/.test(agentsGuide) &&
    /Raising the limit adds classified-transient-path capacity, never a third authorization path/.test(agentsGuide) &&
    /Each logical attempt increments once; a confirmed pre-mutation launch retry reuses that reservation without increment, decrement or reset, while unknown launch status dispatches no replacement/.test(
      agentsGuide,
    ) &&
    /Any proof lacking an allowed bootstrap result, the exact class, explicit request or required retained attempt, and every implementation or plan failure, cannot enter the corresponding route/.test(
      agentsGuide,
    ) &&
    /classification never resets the count/.test(agentsGuide) &&
    /Schema-3 ticket dispositions are exactly `queued`, `active`, `waiting`, `blocked`, `target-reached`, `finished`, or `skipped`; `target-reached` is terminal/.test(
      agentsGuide,
    ) &&
    /Active schema-1\/schema-2 records are never restamped or supplemented in place with schema-3 frontmatter or counters/.test(agentsGuide) &&
    /first reconcile every legacy worker and require all to be proven inactive/.test(agentsGuide) &&
    /active or uncertain worker preserves the old ledger and pointer and permits no successor/.test(
      agentsGuide,
    ) &&
    /append and read back a legacy-schema `successor-prepared` intent containing one deterministic successor id, project, scope, authority, delivery, limits and the exact ordered roster with dispositions/.test(
      agentsGuide,
    ) &&
    /resolve every successor value missing from the legacy schema before mutation/.test(agentsGuide) &&
    /copy recorded values; derive schema-1 `scope: group` and its selector only from the group-only schema contract; obtain exact operator values for absent authority, delivery and retry limits; reconstruct transient counts from retained attempts or fail closed at the chosen exhausted limit/.test(
      agentsGuide,
    ) &&
    /record every value, source, evidence or operator decision and reason/.test(agentsGuide) &&
    /complete `field_resolution`; this legacy-valid event append does not change the old schema/.test(
      agentsGuide,
    ) &&
    /Missing or conflicting field-resolution evidence makes the intent malformed/.test(agentsGuide) &&
    /preserve that roster by default and allow fresh selection only with explicit operator authority in the intent/i.test(
      agentsGuide,
    ) &&
    /Only then may the legacy run close under its own schema/.test(agentsGuide) &&
    /Startup rolls an active or terminal prepared handoff forward by creating the exact successor if absent or validating it if present, and updates the pointer last/.test(
      agentsGuide,
    ) &&
    /missing, malformed or conflicting intent stops without an alternate id/.test(
      agentsGuide,
    ),
  "inventory + target/claim ordering + dynamic blockers + retry budget + prepared schema transition",
);

console.log("\n=== constrained-step authority and reconciliation contract ===");
const constrainedDocs = [agentsGuide, planSkill, executeSkill, autoSkill, toolReference];
check(
  "constrained plans pin canonical repository-relative path syntax",
  /canonical repository-relative POSIX path/.test(planSkill) &&
    /Benign declaration backslashes are\s*normalized to `\/`/.test(planSkill) &&
    /absolute paths, `\.\.`, colon forms/.test(planSkill) &&
    /Packet wire paths and observed Git paths must already be canonical and refuse backslashes/.test(agentsGuide) &&
    /Packet wire paths and observed Git\s*paths must already be canonical and refuse backslashes/.test(toolReference) &&
    /Expected-files glob may authorize a narrower step literal or pattern, but a\s*narrower Expected-files literal never authorizes a broader step glob/.test(planSkill) &&
    /intersecting Do-not-modify patterns always win/.test(planSkill) &&
    /Git-observed filenames retain exact\s*bytes/.test(toolReference),
  "literal/segment-star/doublestar declarations stay directional and Git paths stay exact",
);
check(
  "the controller retains the exact packet and treats packetId as non-authenticating",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /packetId` is\s*tamper-evident identity, not authentication/.test(body) &&
    /worker-returned or reconstructed packet/.test(body),
  ) &&
    /Do not persist full packets or prompts in the automation run ledger/.test(agentsGuide) &&
    /record packet-loss as `INCONCLUSIVE`, issue no successor/.test(agentsGuide) &&
    /record\s*packet-loss as `INCONCLUSIVE`, dispatch no successor/.test(autoSkill),
  "packet loss stops; no worker result or run-ledger prompt becomes authority",
);
check(
  "packet-aware reconciliation derives actual Git changes and fails closed",
  /bounded, double-sampled `git --no-optional-locks` HEAD\/index\/worktree evidence/.test(agentsGuide) &&
    /Packet\/document bytes, entries and checklist lines plus the aggregate Git collection time are capped/.test(agentsGuide) &&
    /caller-supplied changed-path summaries are not proof/.test(executeSkill) &&
    /Missing, unreadable,\s*unstable, escaped, unconfined or unprovable linked, or hard-linked workspace\s+evidence is `INCONCLUSIVE`/.test(executeSkill) &&
    /forbidden or undeclared path is FAIL/.test(executeSkill) &&
    /only permitted ticket-document\s+change\s+is\s+the\s+selected\s+checklist\s+marker\s+from\s+unchecked\s+to\s+checked/.test(executeSkill),
  "actual workspace, document and exact checklist evidence govern PASS/FAIL/INCONCLUSIVE",
);
check(
  "constrained issuance requires a mapped unchecked checklist marker",
  [agentsGuide, planSkill, executeSkill, autoSkill, toolReference].every((body) =>
    /at least one mapped\s+unchecked checklist\s+marker/.test(body) &&
    /checkbox label\s+begins with `Step N`/.test(body) &&
    /explanatory\s+prose\s+mention\s+of\s+`step N`\s+never\s+maps\s+that\s+checkbox\s+to\s+a\s+step/.test(body),
  ),
  "whole-ticket setup remains available while auxiliary prose cannot acquire named-step authority",
);
check(
  "structured plan steps use exact level-three headings and contiguous declared numbers",
  constrainedDocs.every((body) =>
    /exact level-three\s+`### Step N — <title>` heading is a structured\s+boundary/.test(body) &&
    /declared numbers\s+start at 1 and remain contiguous/.test(body) &&
    /nested\s+or\s+explanatory\s+headings\s+never\s+become steps/.test(body),
  ),
  "nested headings and contradictory declared numbering cannot become packet authority",
);
check(
  "exact checklist bytes enforce one contiguous packet frontier",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /Exact\s+checklist\s+bytes\s+retain a leading UTF-8 BOM/.test(body) &&
    /derive every\s+marker state from those bytes/.test(body) &&
    /require\s+a\s+completed\s+prefix\s+and\s+unfinished\s+selected\s+step/.test(body) &&
    /refuse\s+any\s+checked\s+successor\s+marker/.test(body),
  ),
  "BOM bytes, content-derived marker states and the unchecked successor frontier stay authoritative",
);
check(
  "path matching and checklist bytes fail closed at explicit bounds",
  /Path matching is iterative and explicitly bounded\.[\s\S]{0,220}exhaustion is `INCONCLUSIVE`/.test(agentsGuide) &&
    /path matcher is iterative and\s*explicitly bounded;[\s\S]{0,220}Exhaustion is `INCONCLUSIVE`/.test(executeSkill) &&
    /path-match budget[\s\S]{0,220}exhaustion is `INCONCLUSIVE`/.test(autoSkill) &&
    /Iterative path matching has its own aggregate work budget; exhaustion is\s*reported as `INCONCLUSIVE`/.test(toolReference) &&
    [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
      /CRLF\/CR\/LF terminator/.test(body) && /final-newline/.test(body),
    ),
  "matcher exhaustion never authorizes and newline normalization is not a checklist-only transition",
);
check(
  "packet issuance bounds one canonical group census before group I/O",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /lexical, de-duplicated group census/.test(body) &&
    /counted\s+ticket\s+documents\s+plus\s+unique\s+group\s+ids\s+are\s+capped\s+at\s+256\s+before\s+any\s+group\s+or\s+context\s+read/i.test(body) &&
    /missing or conflicting\s+resolved identity refuses/i.test(body),
  ),
  "whole-ticket and constrained paths share one pre-I/O unique-group authority bound",
);
check(
  "packet issuance binds a metadata-first capped board snapshot",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /canonical\s+(?:document\/group\s+)?metadata\s+census/.test(body) &&
    /per-file\s+and\s+aggregate\s+byte\s+bounds?/.test(body) &&
    /identity-bound\s+capped\s+handles/i.test(body) &&
    /replacement,\s+growth,\s+symlink,\s+special-file\s+or\s+hard-link\s+evidence\s+refuses/i.test(body) &&
    /physical\s+confinement\s+is\s+anchored\s+at\s+the\s+configured\s+project\s+root[\s\S]*?symlink\s+or\s+junction[\s\S]*?refuses/i.test(body) &&
    /scratch\s+and\s+reference\s+(?:documents\s+)?(?:remain|stay)\s+revision-exempt/i.test(body),
  ),
  "ticket, document, group and context bytes are bounded and identity-bound before packet authority",
);
check(
  "free-form symbol authority fails closed on actual changes",
  constrainedDocs.every((body) =>
    /allowedSymbols/.test(body) && /non-empty/.test(body) &&
    /STEP_SYMBOL_SCOPE_INCONCLUSIVE/.test(body) &&
    /forbidden\s+(?:or|and)\s+undeclared\s+(?:file\s+|path\s+)?(?:FAIL|failures?)(?:\s+still)?\s+takes?\s+precedence/i.test(body),
  ) &&
    [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
      /[Nn]o-change\s+(?:invents|does not invent)\s+no\s+symbol\s+finding/.test(body) &&
      /empty\s+symbols\s+preserve\s+file-scoped\s+PASS/.test(body),
    ),
  "symbols remain descriptive until a language-aware mechanism can prove their exact changed ranges",
);
check(
  "plan glob proof work shares one aggregate bounded context",
  [agentsGuide, planSkill, toolReference].every((body) =>
    /Plan-time glob containment and intersection/.test(body) &&
    /alphabet construction, NFA closure\/transitions, caches and\s+queues/.test(body) &&
    /PLAN_GLOB_COMPLEXITY/.test(body),
  ),
  "containment and forbidden-overlap proof cannot grow unbounded or silently misclassify exhaustion",
);
check(
  "path matching charges parsing and each comparison to one shared budget",
  [agentsGuide, planSkill, executeSkill, autoSkill, toolReference].every((body) =>
    /budget\s+is\s+charged\s+before\s+raw\s+path\s+parsing\s+and\s+before\s+every\s+literal\s+or\s+wildcard\s+comparison/i.test(body),
  ),
  "literal and wildcard Cartesian work becomes INCONCLUSIVE at the shared bound",
);
check(
  "dirty file bytes stay bound to one capped verified handle",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /read once through one capped handle/.test(body) &&
    /pre-open,\s+handle-before\/after\s+and\s+post-path\s+device,\s+inode,\s+type,\s+mode,\s+link-count\s+and\s+size/.test(body) &&
    /handle closes on every result/.test(body),
  ),
  "replacement, growth, mode/link drift and close failures cannot become PASS evidence",
);
check(
  "workspace samples bind complete index and tracked-link authority",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /bounded\s+NUL\s+`git ls-files -v -s -z`\s+index\s+census/.test(body) &&
    /binding flag, mode, object id, stage and\s+path/.test(body) &&
    /assume-unchanged\s+or\s+skip-worktree\s+entries\s+refuse/.test(body) &&
    /nonzero\s+stages\s+and\s+gitlinks\s+refuse\s+without\s+index\s+mutation/.test(body) &&
    /census\s+drift(?:\s+between\s+samples)?\s+is\s+`INCONCLUSIVE`/.test(body) &&
    /tracked\s+mode-`120000`\s+path\s+is\s+retained\s+only\s+when\s+its\s+checkout\s+representation\s+and\s+capped\s+target\s+bytes\s+are\s+identity-bound/.test(body) &&
    /physical\s+target\s+is\s+an\s+indexed\s+tracked\s+regular\s+file\s+inside\s+the\s+worktree/.test(body) &&
    /Tracked-link\s+target\s+bytes\s+retain\s+a\s+leading\s+UTF-8\s+BOM/.test(body) &&
    /Ignored\s+or\s+untracked\s+link\s+targets\s+refuse/.test(body) &&
    /external,\s+chained-external,\s+dangling,\s+unreadable,\s+unstable\s+or\s+over-budget\s+links\s+refuse/.test(body),
  ),
  "hidden flags, index drift, gitlinks and unconfined tracked links fail closed without index mutation",
);
check(
  "packet workspace HEAD supports full SHA-1 and SHA-256 object ids",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /packet\s+workspace\s+HEAD\s+is\s+a\s+full\s+40-\s*or\s+64-character\s+Git\s+object\s+ID/.test(body),
  ),
  "workspace authority accepts only complete SHA-1 or SHA-256 object identities",
);
check(
  "constrained reconciliation binds complete history, executable mode and unique ticket authority",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /bounded\s+complete\s+union\s+of\s+every\s+path\s+touched\s+by\s+every\s+intervening\s+commit/.test(body) &&
    /including\s+paths\s+later\s+reverted/.test(body) &&
    /non-ancestor\s+baseline\s+or\s+exhausted\s+history\s+is\s+`INCONCLUSIVE`/.test(body) &&
    /history census validates both old and new modes from every\s+intervening\s+tree edge/.test(body) &&
    /intervening\s+`120000`\s+symbolic-link\s+or\s+`160000`\s+Git-link\s+mode\s+refuses\s+even\s+if\s+a\s+later\s+commit\s+restores\s+a\s+regular\s+endpoint/.test(body) &&
    /owner-executable\s+bit,\s+every\s+clean\s+tracked\s+regular\s+path\s+must\s+agree\s+with\s+its\s+indexed\s+`100644`\/`100755`\s+executable\s+class/.test(body) &&
    /exactly\s+one\s+selected\s+ticket\s+endpoint\s+across\s+v2\s+areas\s+and\s+legacy\s+v1\s+storage/.test(body) &&
    /duplicates\s+refuse\s+before\s+either\s+record\s+is\s+opened/.test(body),
  ),
  "reverted paths or link modes, hidden executable drift and duplicate ticket endpoints cannot become PASS authority",
);
check(
  "constrained workers stop at the ignored and Git-metadata observation boundary",
  [agentsGuide, executeSkill, autoSkill, toolReference].every((body) =>
    /tracked,\s*staged,\s*unstaged\s+and\s+untracked\s+paths\s+plus\s+both\s+rename\s+endpoints/.test(body) &&
    /Ignored\s+paths\s+and\s+`\.git`\s*\/\s*common-directory\s+metadata\s+are\s+outside/.test(body) &&
    /deviation stop/.test(body) &&
    /`INCONCLUSIVE`/.test(body),
  ),
  "ignored paths and Git metadata are forbidden worker scope, not silently detected writes",
);
check(
  "successor steps require the complete exact prior PASS packet",
  /complete exact prior packet as `prior_step_packet`/.test(agentsGuide) &&
    /Only PASS may authorize the next step/.test(executeSkill) &&
    /supplied whole as\s*`prior_step_packet`/.test(autoSkill) &&
    /short id, worker-returned packet, reconstruction or numeric skip is refused/.test(toolReference),
  "no id-only, reconstructed or skipped successor authority",
);
check(
  "canonical docs describe only step-packet/2",
  constrainedDocs.every((body) => /step-packet\/2/.test(body) && !/step-packet\/1/.test(body)),
  "AGENTS, plan, execute, auto and tool reference all name schema 2",
);

console.log("\n=== review budget, root-cause classes and reconcile-first recovery (SKILL-039) ===");
// The anti-churn amendment (HZN-008, FRD-034 amendment 2026-09-01). Every
// sentence below is the difference between a bounded review and CORE-127's nine
// rounds of one mechanism, so each is pinned by the clause that would have to
// disappear for the rule to stop being executable — not by a heading. Prose here
// is hard-wrapped, so every regex tolerates the wrap with `\s+`.
check(
  "kanmer-review records one root-cause class with exactly one remedy",
  /two or more findings arising from one underlying mechanism are \*\*one\s+root-cause\s+class\*\*/i.test(reviewSkill) &&
    /Record the class once and choose exactly one\s+remedy/.test(reviewSkill) &&
    /replace the\s+implementation approach, revise the plan, narrow the approved contract with a\s+stated threat model, or defer the whole class to one follow-up ticket/.test(reviewSkill) &&
    /Never one\s+patch, and never one ticket, per example/.test(reviewSkill),
  "one mechanism is one class with exactly one of the four remedies",
);
check(
  "kanmer-review dispositions an outdated thread obsolete-after-change with the superseding commit",
  /GitHub marks \*\*outdated\*\*/.test(reviewSkill) &&
    /is dispositioned `obsolete-after-change` with a reason naming\s+the superseding commit, `superseded by <full-sha>`/.test(reviewSkill) &&
    /never a current open\s+finding/.test(reviewSkill) &&
    /reasserts\s+the same defect against the current head raises it as a new finding/.test(reviewSkill),
  "an outdated thread is closed by disposition, and only a reassertion against the current head is new",
);
check(
  "kanmer-review names what consumes no remediation budget as a backwardMoveEffects property",
  /\*\*What consumes no remediation budget:\*\*/.test(reviewSkill) &&
    /re-auditing an unchanged head/.test(reviewSkill) &&
    /restated finding, an outdated thread/.test(reviewSkill) &&
    /a disposition\s+edit, PR metadata that changes no code, and a new minor or note finding/.test(reviewSkill) &&
    /deliberate property of `backwardMoveEffects` in `store\.ts`/.test(reviewSkill) &&
    /`review_round`\s+advances only when a `move_item` actually returns the ticket to Implementing/.test(reviewSkill) &&
    /Three audits of one head and one finding are one observed condition/.test(reviewSkill),
  "the no-budget list is stated as an existing store property, not a new mechanism",
);
check(
  "the obsolete-after-change disposition and its reason rule are stated wherever findings are",
  [reviewSkill, toolReference].every((body) =>
    /deferred-to-ticket\s*\|\s*obsolete-after-change/.test(body) &&
    /`accepted-risk`\s+and\s+`obsolete-after-change`/.test(body) &&
    /reason names the superseding\s+commit \(`superseded by <full-sha>`\)/.test(body),
  ),
  "kanmer-review and the tool reference both match review-attestation.ts's DISPOSITIONS and reason rule",
);
check(
  "kanmer-review re-checks the pushed board branch immediately before merge and states conversation resolution is load-bearing",
  /Immediately before `gh pr merge`, re-check that the board branch is pushed/.test(reviewSkill) &&
    /git -C <absolute-path-to-board-worktree> rev-parse <board-branch>/.test(reviewSkill) &&
    /git -C <absolute-repository-root> rev-parse origin\/<board-branch>/.test(reviewSkill) &&
    /`get_status\.boardWorktree\.expectedBranch` and never hardcoded/.test(reviewSkill) &&
    /Thread resolution is enforced by GitHub branch\s+protection \(`required_conversation_resolution`\) and is \*\*load-bearing\*\*/.test(reviewSkill) &&
    /`enforce_admins` leaves\s+no bypass/.test(reviewSkill),
  "the gate reads the remote board tip, and unresolved threads block the merge with no admin bypass",
);
check(
  "verify, closeout and auto reconcile a resumed Review or Verifying ticket before re-reading it",
  [verifySkill, closeoutSkill, autoSkill].every((body) =>
    /[Oo]n any resumed or suspicious\s+Review\/Verifying ticket/.test(body) &&
    /`reconcile_ticket id: <ID>`\s+as a dry run first/.test(body) &&
    /only when it returns a\s+recommendation/.test(body) &&
    /apply_reconciliation id: <ID>[\s\S]{0,100}expected_revision: <the recommendation's\s+revision>/.test(body) &&
    /before re-reading\s+anything\s+by hand/.test(body),
  ),
  "FRD-028's dry-run inspector then explicit apply is the first act, not a manual re-read",
);
check(
  "kanmer-review normalizes external priorities and requires terminal dispositions",
  /map P1 to blocker or major/i.test(reviewSkill) &&
    /Map P2 to minor unless live evidence/i.test(reviewSkill) &&
    /no finding of any\s+severity remains `open`/.test(reviewSkill),
  "external labels follow live impact and every finding reaches a terminal disposition",
);
check(
  "kanmer-auto permits exactly one approach-level replan without buying a remediation round",
  /one automatic replan.*even when the remediation budget is\s+exhausted/is.test(autoSkill) &&
    /creates no new remediation allowance/.test(autoSkill) &&
    /after that replan is spent, the lane goes\s+`blocked`/.test(autoSkill),
  "an independently classified approach defect gets one replan, then stops",
);

// Two claims that must stay absent. The first is the role boundary that
// FRD-034's "the controller merges after the final independent pass" is easily
// misread into — the live run's own invariant is that the reviewer merges. The
// second is the bypass that would make CORE-121's operator gate decorative: the
// store guards only review → implementing, so a controller answering an
// exhausted budget by routing review → preparing has re-opened the remediation
// loop on its own authority.
// Each name is backed by every phrasing that would make the name untrue, not by
// one phrasing: a backstop that only catches the wording someone happened to
// write first is a backstop that reports safety it does not have. The negations
// the skill genuinely contains ("never runs `gh pr merge`", "never merges its
// own PR", "budget is **still available before it is spent**") are not
// contiguous matches for any rule below, so the affirmative claim is what fires.
const forbiddenGoalClaims = [
  [
    "controller performing the merge itself",
    [
      /(?:controller|kanmer-auto) (?:merges|may merge|then merges|will merge) the (?:PR|pull request)/i,
      /(?:controller|kanmer-auto) (?:performs|executes|carries out|completes) the merge/i,
      /(?:controller|kanmer-auto) (?:runs|invokes|calls) `?gh pr merge/i,
      /merge is performed by the (?:controller|orchestrator)/i,
    ],
  ],
  // SKILL-038. The positive checks above pin the in-roster/out-of-roster
  // distinction; this one pins that the board-wide drop cannot come back under
  // a different sentence. It is the shape the defect actually shipped in — one
  // clause in a numbered step, removed once and easy to reinstate while
  // tidying — so, like its two neighbours, it is backed by every phrasing that
  // would make the name untrue rather than by the one the history happened to
  // use. None of these matches the replacement prose, whose exclusion rule is
  // conditional ("Any live blocker is outside the roster … exclude the
  // dependent") and never states an unconditional drop.
  [
    "roster that drops every blocked ticket board-wide",
    [
      /Drop archived or blocked tickets/i,
      /drop (?:all |every |any )?blocked tickets/i,
      /blocked tickets are (?:always )?(?:dropped|excluded|skipped)/i,
      /a blocked ticket is (?:always )?(?:dropped|excluded|skipped) from the roster/i,
    ],
  ],
];
for (const [name, rules] of forbiddenGoalClaims) {
  const hit = rules.find((rule) => rule.test(autoSkill));
  check(`no ${name}`, hit === undefined, hit ? `matched ${hit}` : "unsafe controller claim absent");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
