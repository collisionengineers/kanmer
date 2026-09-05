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
  resolveDelivery,
  evaluateMergeGate,
  parseReviewAttestation,
  resolveMergeGateTicket,
} from "../../core/dist/index.js";
import { assertGitRepository, collectBoardEvidence, collectCommitReachability } from "./git-reachability.mjs";

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--draft") {
      if (values[flag]) throw new Error(`duplicate argument ${flag}`);
      values[flag] = true;
      continue;
    }
    if (flag !== "--board" && flag !== "--event") throw new Error(`unknown argument ${flag}`);
    if (values[flag]) throw new Error(`duplicate argument ${flag}`);
    const value = argv[++i];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    values[flag] = value;
  }
  if (!values["--board"] || !values["--event"]) throw new Error("--board and --event are required");
  // `--draft` is a workflow-level signal that the caller intends draft/advisory
  // mode; it is deliberately NOT the authoritative source of truth for whether
  // this PR is a draft (see readPrEvent/main: the event payload's
  // `pull_request.draft` decides that). A caller that forgets or mis-computes
  // this flag must not silently flip a draft PR to strict or a ready PR to
  // advisory, so the flag is carried through but never trusted alone.
  return { board: values["--board"], event: values["--event"], draft: values["--draft"] === true };
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
  const url = typeof pr.html_url === "string" && pr.html_url ? pr.html_url : undefined;
  const repository = typeof base.repo?.full_name === "string" && base.repo.full_name
    ? base.repo.full_name
    : (typeof value?.repository?.full_name === "string" ? value.repository.full_name : undefined);
  const headRepository = typeof head.repo?.full_name === "string" && head.repo.full_name
    ? head.repo.full_name
    : undefined;
  const result = {
    number: pr.number,
    headSha: head.sha,
    baseSha: base.sha,
    branch: head.ref,
    body: pr.body ?? null,
    ...(baseRef ? { baseRef } : {}),
  };
  // Canonical GitHub identity is gate evidence, not part of the CLI's legacy
  // emitted `result.pr` contract. Non-enumerable properties remain available
  // to review matching while JSON output stays byte-shape compatible.
  if (url) Object.defineProperty(result, "url", { value: url });
  if (repository) Object.defineProperty(result, "repository", { value: repository });
  if (headRepository) Object.defineProperty(result, "headRepository", { value: headRepository });
  // The event payload's `pull_request.draft` is the sole authoritative source
  // for advisory-vs-strict mode (see main()); the `--draft` CLI flag is only a
  // workflow-level confirmation and is never trusted alone.
  Object.defineProperty(result, "draft", { value: pr.draft === true });
  return result;
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
  const { state, headSha, verdict, pr, independent, boardSha, ...details } = parsed;
  return {
    state,
    headSha,
    verdict,
    pr,
    independent,
    ...(boardSha ? { boardSha } : {}),
    details: { ...details, ...(boardSha ? { boardSha } : {}) },
  };
}

/** Repo variable KANMER_GATE_STRICT (via env) promotes compatibility warnings to errors. */
function readStrictFlag(env = process.env) {
  const raw = String(env.KANMER_GATE_STRICT ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

async function boardSnapshot(store) {
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
  return { board, reviewStageId, finalStageId, all, byId, links: buildLinkIndex(all) };
}

function phase2Evidence(snapshot, pr, ticketId, strict, review, commitBySha, board) {
  const graph = snapshot.links.get(ticketId) ?? { id: ticketId, links: [], backlinks: [], blocks: [], blockedBy: [] };
  const item = snapshot.byId.get(ticketId);
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
    if (!snapshot.byId.has(target)) blockerIds.add(target);
  }
  const blockers = [...blockerIds].sort().map((id) => {
    const blocker = snapshot.byId.get(id);
    return blocker
      ? { id, exists: true, status: blocker.status, archived: blocker.archived }
      : { id, exists: false };
  });
  const commits = item.commits ?? [];
  const commitEvidence = commits.map((sha) => commitBySha.get(String(sha).trim().toLowerCase())).filter(Boolean);
  return { reviewStageId: snapshot.reviewStageId, finalStageId: snapshot.finalStageId, blockers, review, commits: commitEvidence, strict, board };
}

function emptyPhase2Evidence(snapshot, strict, board) {
  return { reviewStageId: snapshot.reviewStageId, finalStageId: snapshot.finalStageId, blockers: [], review: { state: "absent" }, commits: [], strict, board };
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
    const snapshot = await boardSnapshot(store);
    const capturedBoard = await collectBoardEvidence({ boardRoot });
    const requested = resolved.ticketIds ?? (resolved.ticketId ? [resolved.ticketId] : []);
    const existingIds = requested.filter((id) => snapshot.byId.get(id)?.type === "ticket");
    const reviews = new Map(await Promise.all(existingIds.map(async (id) => [
      id,
      parseReviewEvidence(await store.getDoc(id, "scratch/review")),
    ])));
    const planVersions = new Map(await Promise.all(existingIds.map(async (id) => [
      id,
      (await store.getDocWithVersion(id, "plan")).version,
    ])));
    const questions = new Map(await Promise.all(existingIds.map(async (id) => [
      id,
      await store.getOpenQuestionCount(id),
    ])));
    const commits = [...new Set(existingIds.flatMap((id) => snapshot.byId.get(id)?.commits ?? []).map((sha) => String(sha).trim().toLowerCase()))].sort();
    let commitEvidence = [];
    if (commits.length > 0) {
      await assertGitRepository({ cwd: process.cwd() });
      commitEvidence = await collectCommitReachability({ commits, headSha: pr.headSha, baseSha: pr.baseSha, cwd: process.cwd() });
    }
    const commitBySha = new Map(commitEvidence.map((entry) => [entry.sha, entry]));
    const boardByAttestation = new Map();
    const boardFor = async (review) => {
      const attested = review?.state === "valid" ? review.boardSha : undefined;
      if (!attested) return capturedBoard;
      if (!boardByAttestation.has(attested)) {
        const checked = await collectBoardEvidence({ boardRoot, attestedSha: attested, capturedSha: capturedBoard.sha });
        boardByAttestation.set(attested, checked);
      }
      return boardByAttestation.get(attested);
    };
    let evidence;
    const requestedItem = requested.length === 1 ? snapshot.byId.get(requested[0]) : null;
    let batch = null;
    let batchError;
    if (requested.length > 0) {
      try {
        batch = await store.batchStateFromSnapshot(requested[0], snapshot.all);
      } catch (error) {
        batchError = error instanceof Error ? error.message : "batch manifest could not be read";
      }
    }
    if (requested.length > 1 || requestedItem?.lease_batch || batch || batchError) {
      const members = [];
      for (const id of requested) {
        const item = snapshot.byId.get(id) ?? null;
        const review = reviews.get(id);
        members.push({
          ticketId: id,
          item,
          planVersion: planVersions.get(id) ?? null,
          questions: questions.get(id) ?? null,
          evidence: item
            ? phase2Evidence(snapshot, pr, id, strict, review, commitBySha, await boardFor(review))
            : emptyPhase2Evidence(snapshot, strict, capturedBoard),
        });
      }
      evidence = {
        kind: "batch",
        reviewStageId: snapshot.reviewStageId,
        finalStageId: snapshot.finalStageId,
        strict,
        policy: resolveDelivery(snapshot.board),
        batch,
        ...(batchError ? { batchError } : {}),
        members,
      };
    } else if (existingIds.length === 1) {
      const id = existingIds[0];
      const review = reviews.get(id);
      evidence = phase2Evidence(snapshot, pr, id, strict, review, commitBySha, await boardFor(review));
    } else {
      evidence = emptyPhase2Evidence(snapshot, strict, capturedBoard);
    }
    const result = await evaluateMergeGate(store, pr, evidence);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    // The event payload's `pull_request.draft` decides advisory mode, not the
    // `--draft` CLI flag (readPrEvent/parseArgs). Every check still runs; a
    // draft PR only changes how the result is reported and exits.
    const isDraft = pr.draft === true;
    if (isDraft) {
      const lines = result.findings.length > 0
        ? result.findings.map((finding) => `ADVISORY (draft): [${finding.code}] ${finding.message}`)
        : ["ADVISORY (draft): no findings"];
      for (const line of lines) process.stdout.write(`${line}\n`);
      for (const finding of result.findings) {
        process.stderr.write(`::notice title=kanmer/gate::ADVISORY (draft): [${finding.code}] ${escapeCommandData(finding.message)}\n`);
      }
      const summaryPath = process.env.GITHUB_STEP_SUMMARY;
      if (summaryPath) {
        const summary = [
          "### kanmer-gate (draft PR — advisory)",
          "",
          ...lines.map((line) => `- ${line}`),
          "",
        ].join("\n");
        await fs.appendFile(summaryPath, `${summary}\n`);
      }
      // Draft PRs never fail the check: the strict/warn judgment that matters
      // binds to the PR once it is marked ready (kanmer-execute/SKILL.md).
      process.exitCode = 0;
      return;
    }
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
