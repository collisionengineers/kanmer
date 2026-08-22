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
const dangling = [...refs.keys()].filter((n) => !roster.has(n) && n !== "kanmer-mcp");
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

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
