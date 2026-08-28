#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
// The workflow builds core immediately before invoking this source-level CLI.
import {
  KanmerStore,
  boardStages,
  buildLinkIndex,
  lastStageId,
  evaluateMergeGate,
  parseReviewAttestation,
  resolveMergeGateTicket,
} from "../../core/dist/index.js";
import { assertGitRepository, collectBoardEvidence, collectCommitReachability } from "./git-reachability.mjs";

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
  // CORE-116/FRD-031: the *base ref* is what the gate compares against the
  // project's configured integration branch. It is deliberately not required —
  // an event without one skips the target check rather than being rejected or
  // silently assumed to mean `main`.
  const baseRef = typeof base.ref === "string" && base.ref ? base.ref : undefined;
  return {
    number: pr.number,
    headSha: head.sha,
    baseSha: base.sha,
    branch: head.ref,
    body: pr.body ?? null,
    ...(baseRef ? { baseRef } : {}),
  };
}

function escapeCommandData(value) {
  return String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A")
    .replaceAll(":", "%3A")
    .replaceAll(",", "%2C");
}

/**
 * The attestation validator lives in @kanmer/core (`parseReviewAttestation`,
 * CORE-121) so the store's Review → Implementing rule and this gate accept the
 * same document. This wrapper only reshapes it into merge-gate review evidence.
 */
function parseReviewEvidence(raw) {
  const parsed = parseReviewAttestation(raw);
  if (parsed.state !== "valid") return parsed;
  const { state, headSha, verdict, boardSha, ...details } = parsed;
  return {
    state,
    headSha,
    verdict,
    ...(boardSha ? { boardSha } : {}),
    details: { ...details, ...(boardSha ? { boardSha } : {}) },
  };
}

/** Repo variable KANMER_GATE_STRICT (via env) promotes compatibility warnings to errors. */
function readStrictFlag(env = process.env) {
  const raw = String(env.KANMER_GATE_STRICT ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

async function phase2Evidence(store, pr, ticketId, boardRoot, strict) {
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
  const boardEvidence = await collectBoardEvidence({ boardRoot, attestedSha: review.state === "valid" ? review.boardSha : undefined });
  return { reviewStageId, finalStageId, blockers, review, commits: commitEvidence, strict, board: boardEvidence };
}

async function emptyPhase2Evidence(store, boardRoot, strict) {
  const board = await store.getBoard();
  const reviewStageId = boardStages().find((stage) => stage.name.toLowerCase() === "review")?.id;
  if (!reviewStageId) throw new Error("board has no semantic review stage");
  const boardEvidence = await collectBoardEvidence({ boardRoot });
  return { reviewStageId, finalStageId: lastStageId(board), blockers: [], review: { state: "absent" }, commits: [], strict, board: boardEvidence };
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
    const boardRoot = path.resolve(args.board);
    const store = new KanmerStore(boardRoot);
    const strict = readStrictFlag();
    const resolved = resolveMergeGateTicket(pr.body, pr.branch);
    const resolvedItem = resolved.ticketId ? await store.getItem(resolved.ticketId) : null;
    const evidence = resolvedItem
      ? await phase2Evidence(store, pr, resolved.ticketId, boardRoot, strict)
      : await emptyPhase2Evidence(store, boardRoot, strict);
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

export { escapeCommandData, parseArgs, parseReviewEvidence, readPrEvent, readStrictFlag };
