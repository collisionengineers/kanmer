#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
// The workflow builds core immediately before invoking this source-level CLI.
import {
  KanmerStore,
  boardStages,
  buildLinkIndex,
  lastStageId,
  evaluateMergeGate,
  resolveMergeGateTicket,
} from "../../core/dist/index.js";
import { assertGitRepository, collectCommitReachability, isFullGitSha } from "./git-reachability.mjs";

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag !== "--board" && flag !== "--event") throw new Error(`unknown argument ${flag}`);
    if (values[flag]) throw new Error(`duplicate argument ${flag}`);
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    values[flag] = value;
  }
  if (!values["--board"] || !values["--event"]) throw new Error("--board and --event are required");
  return { board: values["--board"], event: values["--event"] };
}

function readPrEvent(value) {
  const pr = value?.pull_request;
  const head = pr?.head;
  const base = pr?.base;
  if (!pr || !head || !base || !Number.isInteger(pr.number) || pr.number < 1) throw new Error("event is missing pull_request.number or base");
  if (typeof head.sha !== "string" || !head.sha || typeof head.ref !== "string" || !head.ref) throw new Error("event is missing pull_request.head.sha or head.ref");
  if (typeof base.sha !== "string" || !base.sha) throw new Error("event is missing pull_request.base.sha");
  if (pr.body !== null && pr.body !== undefined && typeof pr.body !== "string") throw new Error("pull_request.body must be a string or null");
  return { number: pr.number, headSha: head.sha, baseSha: base.sha, branch: head.ref, body: pr.body ?? null };
}

function escapeCommandData(value) {
  return String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A")
    .replaceAll(":", "%3A")
    .replaceAll(",", "%2C");
}

function parseReviewEvidence(raw) {
  if (raw === null) return { state: "absent" };
  try {
    const parsed = matter(raw);
    const data = parsed.data;
    const nonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
    if (!data || typeof data !== "object") return { state: "invalid", reason: "frontmatter is not an object" };
    if (data.kind !== "review-attestation") return { state: "invalid", reason: 'kind must be "review-attestation"' };
    if (!nonEmptyString(data.pr)) return { state: "invalid", reason: "pr must be a non-empty string" };
    if (typeof data.head_sha !== "string" || !isFullGitSha(data.head_sha)) return { state: "invalid", reason: "head_sha must be a full hexadecimal Git object id" };
    if (data.verdict !== "pass" && data.verdict !== "needs-changes") return { state: "invalid", reason: 'verdict must be "pass" or "needs-changes"' };
    if (!nonEmptyString(data.reviewer)) return { state: "invalid", reason: "reviewer must be a non-empty string" };
    if (typeof data.independent !== "boolean") return { state: "invalid", reason: "independent must be boolean" };
    if (!nonEmptyString(data.plan_hash)) return { state: "invalid", reason: "plan_hash must be a non-empty string" };
    if (!nonEmptyString(data.ticket_updated)) return { state: "invalid", reason: "ticket_updated must be a non-empty string" };
    if (!Array.isArray(data.findings)) return { state: "invalid", reason: "findings must be an array" };
    const severities = new Set(["blocker", "major", "minor", "note"]);
    const dispositions = new Set(["open", "fixed", "rejected-with-reason", "accepted-risk", "deferred-to-ticket"]);
    for (const [index, finding] of data.findings.entries()) {
      if (!finding || typeof finding !== "object") return { state: "invalid", reason: `findings[${index}] must be an object` };
      if (typeof finding.id !== "string" || !/^F-\d{3,}$/u.test(finding.id)) return { state: "invalid", reason: `findings[${index}].id must be an F-### identifier` };
      if (!severities.has(finding.severity)) return { state: "invalid", reason: `findings[${index}].severity is invalid` };
      if (!nonEmptyString(finding.summary)) return { state: "invalid", reason: `findings[${index}].summary must be non-empty` };
      if (!dispositions.has(finding.disposition)) return { state: "invalid", reason: `findings[${index}].disposition is invalid` };
      if ((finding.disposition === "rejected-with-reason" || finding.disposition === "accepted-risk") && !nonEmptyString(finding.reason)) return { state: "invalid", reason: `findings[${index}].reason is required for ${finding.disposition}` };
      if (finding.disposition === "deferred-to-ticket" && !nonEmptyString(finding.ticket)) return { state: "invalid", reason: `findings[${index}].ticket is required for deferred-to-ticket` };
    }
    return {
      state: "valid",
      headSha: data.head_sha,
      verdict: data.verdict,
      details: data,
    };
  } catch (error) {
    const reason = String(error instanceof Error ? error.message : error).replace(/[\r\n]+/g, " ").slice(0, 240);
    return { state: "invalid", reason: `frontmatter could not be parsed: ${reason}` };
  }
}

async function phase2Evidence(store, pr, ticketId) {
  const board = await store.getBoard();
  const reviewStageId = boardStages().find((stage) => stage.name.toLowerCase() === "review")?.id;
  if (!reviewStageId) throw new Error("board has no semantic review stage");
  const finalStageId = lastStageId(board);
  const listed = await store.listItemsWithWarnings({ includeArchived: true });
  if (listed.warnings.length > 0) {
    const detail = listed.warnings.map((warning) => `${warning.file}: ${warning.message}`).join("; ");
    throw new Error(`board item files could not be read: ${detail}`);
  }
  const all = listed.items;
  const byId = new Map(all.map((item) => [item.id, item]));
  const graph = buildLinkIndex(all).get(ticketId) ?? { id: ticketId, links: [], backlinks: [], blocks: [], blockedBy: [] };
  const item = byId.get(ticketId) ?? await store.getItem(ticketId);
  if (!item) throw new Error(`Kanmer ticket ${ticketId} disappeared while gathering evidence`);
  // Valid prerequisites come only from the derived blockedBy direction; the
  // target's outgoing blocks[] is not treated as a prerequisite list. A
  // dangling outgoing target is still a board-integrity failure, however.
  const blockerIds = new Set(graph.blockedBy);
  // buildLinkIndex intentionally omits edges whose target is absent. Keep
  // dangling targets recorded on this ticket as conservative integrity
  // blockers so a deleted prerequisite cannot make the gate pass merely
  // because its target file disappeared.
  for (const target of item.blocks ?? []) {
    if (!byId.has(target)) blockerIds.add(target);
  }
  const blockers = [...blockerIds].sort().map((id) => {
    const blocker = byId.get(id);
    return blocker
      ? { id, exists: true, status: blocker.status, archived: blocker.archived }
      : { id, exists: false };
  });
  const review = parseReviewEvidence(await store.getDoc(ticketId, "scratch/review"));
  const commits = item.commits ?? [];
  const commitEvidence = commits.length === 0
    ? []
    : (await assertGitRepository({ cwd: process.cwd() }), await collectCommitReachability({ commits, headSha: pr.headSha, baseSha: pr.baseSha, cwd: process.cwd() }));
  return { reviewStageId, finalStageId, blockers, review, commits: commitEvidence };
}

async function emptyPhase2Evidence(store) {
  const board = await store.getBoard();
  const reviewStageId = boardStages().find((stage) => stage.name.toLowerCase() === "review")?.id;
  if (!reviewStageId) throw new Error("board has no semantic review stage");
  return { reviewStageId, finalStageId: lastStageId(board), blockers: [], review: { state: "absent" }, commits: [] };
}

function emitInfra(message) {
  const raw = String(message).replace(/[\r\n]+/g, " ").replace(/["'`]/g, "");
  const safe = /^(unknown argument|duplicate argument|--board|event|pull_request|board has|Kanmer ticket|pull request head SHA)/i.test(raw)
    ? raw
    : "board or event could not be read";
  process.stdout.write(`${JSON.stringify({ ok: false, infrastructureError: true, error: safe, findings: [] })}\n`);
  process.stderr.write(`kanmer-gate infrastructure failure: ${safe}\n`);
  process.exitCode = 2;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    const [eventText] = await Promise.all([
      fs.readFile(path.resolve(args.event), "utf8"),
      fs.access(path.resolve(args.board)),
    ]);
    const pr = readPrEvent(JSON.parse(eventText));
    const store = new KanmerStore(path.resolve(args.board));
    const resolved = resolveMergeGateTicket(pr.body, pr.branch);
    const resolvedItem = resolved.ticketId ? await store.getItem(resolved.ticketId) : null;
    const evidence = resolvedItem
      ? await phase2Evidence(store, pr, resolved.ticketId)
      : await emptyPhase2Evidence(store);
    const result = await evaluateMergeGate(store, pr, evidence);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    for (const finding of result.findings) {
      const command = finding.level === "error" ? "error" : "warning";
      process.stderr.write(`::${command} title=kanmer/gate [${finding.code}]::${escapeCommandData(finding.message)}\n`);
    }
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    emitInfra(error instanceof Error ? error.message : "check-pr could not run");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();

export { escapeCommandData, parseArgs, parseReviewEvidence, readPrEvent };
