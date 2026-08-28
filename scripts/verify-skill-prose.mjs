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
    /at most one logged launch\s+retry[\s\S]*Never automatically retry failed\s+implementation[\s\S]*Never use force takeover as fallback/i,
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

console.log("\n=== 19. SKILL-036 durable `/goal` orchestration contract ===");
// FRD-034's controller is `kanmer-auto` extended, not a second orchestrator: the
// durable run record, the status vocabulary, the reconciliation loop and the
// stop predicates are already checks 13 and 14's, and forking them was the
// explicit non-goal. What check 19 adds is the part FRD-034 asks for that no
// tool reports and check 13 cannot see — the frozen roster, the preflight, the
// overlap breadth, the sync-before-gate rule, the escalation boundary, the
// active-stage invariants, and the evidence rules a two-day multi-controller
// run paid for. Each is asserted in the one skill that can act on it, exactly
// as check 18 does, because a rewrite that drops one silently reverts to the
// failure it was written from.
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
    "kanmer-auto preflights identity, delivery target and board health",
    /### Preflight before the first mutation/.test(autoSkill) &&
      /project_fingerprint/.test(autoSkill) &&
      /never hardcodes `main`/i.test(autoSkill) &&
      /verification target/i.test(autoSkill) &&
      /get_status\.boardWorktree/.test(autoSkill),
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
      /to get around that refusal/i.test(autoSkill) &&
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
    "kanmer-auto allows its one replan only before the remediation budget is spent",
    /still available before it is spent/i.test(autoSkill) &&
      /already reached\s+its `remediation_budget` gets \*\*no\*\* automatic replan/i.test(autoSkill) &&
      /neither resets nor increments\s+`review_round`/i.test(autoSkill),
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

// F6: the four fields below arrived with schema 2, so a record left at schema 1
// resumes without any of them unless the version says so.
check(
  "kanmer-auto requires run-record schema 2 and refuses to resume a schema-1 record",
  /The current run-record schema is \*\*`schema: 2`\*\*/.test(autoSkill) &&
    /A record still at\s+`schema: 1`/.test(autoSkill) &&
    /\*\*not\*\* resumed as-is/i.test(autoSkill),
  "schema 2 + schema-1 stop",
);

// The run record is where a resumed controller learns what it is adopting, so
// the scope, the granted authority and the resolved delivery target belong in
// the template rather than in one run's prose.
for (const field of ["scope:", "scope_selector:", "authority:", "delivery_target:"]) {
  check(`run-state template records ${field}`, runStateBody.includes(field), field);
}
check(
  "run-state Selection contract freezes the roster and the ledger tracks the replan",
  /\*\*frozen at/.test(runStateBody) && /\| Replan \|/.test(runStateBody),
  "frozen roster + replan column",
);
for (const [label, body] of [["run-state", runStateBody], ["current-run", currentRunBody]]) {
  check(`${label} template is stamped schema: 2`, /^schema: 2$/m.test(body), "schema: 2");
}
check(
  "current-run pointer names the scope it is resuming",
  /^scope: /m.test(currentRunBody) && /^scope_selector: /m.test(currentRunBody),
  "scope + selector",
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
  [
    "self-authorised replan after an exhausted budget",
    [
      /budget is[^.]*\b(?:spent|exhausted)\b[^.]*\breplans?\b/i,
      /budget[- ]exhausted[^.]*\b(?:self-)?replans?\b/i,
      /REMEDIATION_BUDGET_EXHAUSTED[^.]*\breplans?\b/i,
      /\breplans?\b[^.]*\b(?:once|after|when|because)\s+the\s+(?:remediation\s+)?budget is (?:spent|exhausted)/i,
    ],
  ],
];
for (const [name, rules] of forbiddenGoalClaims) {
  const hit = rules.find((rule) => rule.test(autoSkill));
  check(`no ${name}`, hit === undefined, hit ? `matched ${hit}` : "unsafe controller claim absent");
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
