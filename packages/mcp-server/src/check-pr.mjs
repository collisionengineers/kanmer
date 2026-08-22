#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
// The workflow builds core immediately before invoking this source-level CLI.
// A relative dist import keeps the check pinned to the checkout being tested,
// rather than whatever workspace symlink a developer happens to have.
import { KanmerStore, evaluateMergeGate } from "../../core/dist/index.js";

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag !== "--board" && flag !== "--event") {
      throw new Error(`unknown argument ${flag}`);
    }
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
  if (!pr || !head || !Number.isInteger(pr.number) || pr.number < 1) {
    throw new Error("event is missing pull_request.number");
  }
  if (typeof head.sha !== "string" || !head.sha || typeof head.ref !== "string" || !head.ref) {
    throw new Error("event is missing pull_request.head.sha or head.ref");
  }
  if (pr.body !== null && pr.body !== undefined && typeof pr.body !== "string") {
    throw new Error("pull_request.body must be a string or null");
  }
  return { number: pr.number, headSha: head.sha, branch: head.ref, body: pr.body ?? null };
}

function escapeCommandData(value) {
  return String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A")
    .replaceAll(":", "%3A")
    .replaceAll(",", "%2C");
}

function emitInfra(message) {
  const raw = String(message).replaceAll(/[\r\n]+/g, " ").replaceAll(/["'`]/g, "");
  const safe = /^(unknown argument|duplicate argument|--board|event|pull_request)/i.test(raw)
    ? raw
    : "board or event could not be read";
  process.stdout.write(`${JSON.stringify({ ok: false, error: safe, findings: [] })}\n`);
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
    const result = await evaluateMergeGate(new KanmerStore(path.resolve(args.board)), pr);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    for (const finding of result.findings) {
      if (finding.level === "error") {
        process.stderr.write(`::error title=kanmer-gate::${escapeCommandData(finding.message)}\n`);
      }
    }
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    emitInfra(error instanceof Error ? error.message : "check-pr could not run");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
