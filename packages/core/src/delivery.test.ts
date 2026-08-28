import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { KanmerStore } from "./store.js";
import { parseItem, serialiseItem } from "./frontmatter.js";
import { deliveryPolicySource, deliveryTargets, resolveDelivery } from "./board.js";
import { evaluateMergeGate } from "./merge-gate.js";
import { DISPATCH_TASKS, NEUTRAL_VERIFICATION_TARGET } from "./prompts.js";
import { DELIVERY_STATES, deliveryStateRank, isDeliveryState, type DeliveryConfig } from "./types.js";

let root: string;
let store: KanmerStore;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "kanmer-delivery-"));
  store = new KanmerStore(root, { actor: "test-actor" });
  await store.init();
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

const ticketFile = (id: string) => path.join(root, ".kanmer", "areas", "_none", id, `${id}.md`);

/** A gate-free ticket, so a fixture can walk stages without pipeline documents. */
const free = { type: "ticket", profile: "custom", requires: {} } as const;

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

/** Declare a delivery policy on the board. */
async function policy(delivery: DeliveryConfig): Promise<void> {
  await store.updateBoard((board) => ({ ...board, delivery }));
}

/** The dev-to-main project used by the FRD-031 AC2/AC5 fixtures. */
const DEV_TO_MAIN: DeliveryConfig = {
  integrationBranch: "dev",
  releaseBranch: "main",
  releaseCandidatePattern: "release/*",
  hotfixBackport: true,
};

describe("resolveDelivery / deliveryPolicySource (CORE-116)", () => {
  it("defaults an undeclared board to Kanmer's own main-only policy", async () => {
    const board = await store.getBoard();
    expect(resolveDelivery(board)).toEqual({
      integrationBranch: "main",
      releaseBranch: "main",
      releaseCandidatePattern: null,
      hotfixBackport: true,
    });
    expect(deliveryPolicySource(board)).toBe("default");
  });

  it("defaults releaseBranch to the integration branch, not to a constant", async () => {
    await policy({ integrationBranch: "dev" });
    const board = await store.getBoard();
    // The trap this guards: a project that declares only an integration branch
    // must not silently start releasing from `main`.
    expect(resolveDelivery(board)).toEqual({
      integrationBranch: "dev",
      releaseBranch: "dev",
      releaseCandidatePattern: null,
      hotfixBackport: true,
    });
    expect(deliveryPolicySource(board)).toBe("board");
  });

  it("resolves a full dev-to-main policy", async () => {
    await policy(DEV_TO_MAIN);
    expect(resolveDelivery(await store.getBoard())).toEqual({
      integrationBranch: "dev",
      releaseBranch: "main",
      releaseCandidatePattern: "release/*",
      hotfixBackport: true,
    });
  });

  it("honours hotfixBackport: false", async () => {
    await policy({ ...DEV_TO_MAIN, hotfixBackport: false });
    expect(resolveDelivery(await store.getBoard()).hotfixBackport).toBe(false);
  });

  it("keeps the delivery block out of a fresh board", async () => {
    // FRD-031: Kanmer's own repository policy is not changed to demonstrate
    // another one, so a board is born with no block and the resolved default.
    expect((await store.getBoard()).delivery).toBeUndefined();
  });
});

describe("delivery policy validation (CORE-116)", () => {
  it("rejects a branch name with whitespace", async () => {
    await expect(policy({ integrationBranch: "my branch" })).rejects.toThrow(/Invalid delivery.integrationBranch/u);
  });

  it("rejects a trailing slash and a traversal", async () => {
    await expect(policy({ releaseBranch: "release/" })).rejects.toThrow(/Invalid delivery.releaseBranch/u);
    await expect(policy({ releaseBranch: "a/../b" })).rejects.toThrow(/Invalid delivery.releaseBranch/u);
  });

  it("rejects a candidate pattern with no wildcard", async () => {
    await expect(policy({ releaseCandidatePattern: "release" })).rejects.toThrow(/must contain "\*"/u);
  });

  it("accepts integrationBranch === releaseBranch — that is main-only", async () => {
    await policy({ integrationBranch: "trunk", releaseBranch: "trunk" });
    expect(resolveDelivery(await store.getBoard()).releaseBranch).toBe("trunk");
  });

  it("accepts an explicitly null candidate pattern", async () => {
    await policy({ integrationBranch: "dev", releaseCandidatePattern: null });
    expect(resolveDelivery(await store.getBoard()).releaseCandidatePattern).toBeNull();
  });
});

describe("delivery state vocabulary (CORE-116)", () => {
  it("ranks the six states in delivery order", () => {
    expect([...DELIVERY_STATES]).toEqual([
      "not-integrated",
      "integrated",
      "release-candidate",
      "released",
      "deployed",
      "production-verified",
    ]);
    expect(deliveryStateRank("not-integrated")).toBeLessThan(deliveryStateRank("integrated"));
    expect(deliveryStateRank("released")).toBeLessThan(deliveryStateRank("production-verified"));
    expect(isDeliveryState("integrated")).toBe(true);
    expect(isDeliveryState("shipped")).toBe(false);
  });
});

describe("recording delivery state (CORE-116)", () => {
  it("records not-integrated with no evidence at all", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    const next = await store.updateItem(item.id, { delivery_state: "not-integrated" });
    expect(next.delivery_state).toBe("not-integrated");
    expect(next.delivery_recorded_at).toBeTruthy();
  });

  it("refuses an unknown state", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(store.updateItem(item.id, { delivery_state: "shipped" })).rejects.toThrow(
      /DELIVERY_STATE_INVALID/u,
    );
  });

  it("refuses `integrated` without a branch and an exact SHA", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(store.updateItem(item.id, { delivery_state: "integrated" })).rejects.toThrow(
      /DELIVERY_EVIDENCE_MISSING/u,
    );
    await expect(
      store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "main" }),
    ).rejects.toThrow(/DELIVERY_EVIDENCE_MISSING/u);
  });

  it("refuses an abbreviated SHA", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(
      store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "main", delivery_sha: "abc1234" }),
    ).rejects.toThrow(/DELIVERY_SHA_INVALID/u);
  });

  it("refuses a branch that is neither the integration nor the release branch", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(
      store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "staging", delivery_sha: SHA_A }),
    ).rejects.toThrow(/DELIVERY_TARGET_INVALID.*"dev".*"main"/su);
  });

  it("refuses `released` without a release branch and tag", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(
      store.updateItem(item.id, { delivery_state: "released", delivery_branch: "main", delivery_sha: SHA_A }),
    ).rejects.toThrow(/DELIVERY_EVIDENCE_MISSING/u);
  });

  it("refuses a candidate on a project that declares no candidate pattern", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(store.updateItem(item.id, { delivery_candidate: "release/v1" })).rejects.toThrow(
      /DELIVERY_NO_CANDIDATE_POLICY/u,
    );
  });

  it("refuses a candidate identity that does not match the declared pattern", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(store.updateItem(item.id, { delivery_candidate: "rc-1" })).rejects.toThrow(
      /DELIVERY_NO_CANDIDATE_POLICY.*release\/\*/su,
    );
  });

  it("refuses `release-candidate` without a candidate identity", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(
      store.updateItem(item.id, {
        delivery_state: "release-candidate",
        delivery_branch: "dev",
        delivery_sha: SHA_A,
      }),
    ).rejects.toThrow(/DELIVERY_EVIDENCE_MISSING.*delivery_candidate/su);
  });

  it("validates the merged record, so a two-call sequence is judged like one call", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await store.updateItem(item.id, { delivery_branch: "main", delivery_sha: SHA_A });
    const next = await store.updateItem(item.id, { delivery_state: "integrated" });
    expect(next.delivery_state).toBe("integrated");
  });

  it("clears one field with \"\" and re-validates what remains", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "main", delivery_sha: SHA_A });
    // Removing the evidence a claimed state depends on is refused, not silently accepted.
    await expect(store.updateItem(item.id, { delivery_sha: "" })).rejects.toThrow(/DELIVERY_EVIDENCE_MISSING/u);
    const cleared = await store.updateItem(item.id, { delivery_state: "not-integrated", delivery_sha: "" });
    expect(cleared.delivery_sha).toBeUndefined();
    expect(cleared.delivery_state).toBe("not-integrated");
  });

  it("accepts delivery fields on create and validates them there too", async () => {
    const ok = await store.createItem({
      type: "ticket",
      title: "Imported",
      delivery_state: "integrated",
      delivery_branch: "main",
      delivery_sha: SHA_A,
    });
    expect(ok.delivery_state).toBe("integrated");
    expect(ok.delivery_recorded_at).toBeTruthy();
    await expect(
      store.createItem({ type: "ticket", title: "Bad", delivery_state: "integrated" }),
    ).rejects.toThrow(/DELIVERY_EVIDENCE_MISSING/u);
    await expect(
      store.createItem({ type: "ticket", title: "Bad", delivery_state: "shipped" }),
    ).rejects.toThrow(/DELIVERY_STATE_INVALID/u);
  });

  it("does not bump `updated` for a delivery patch that changes nothing", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    const first = await store.updateItem(item.id, { delivery_state: "not-integrated" });
    const again = await store.updateItem(item.id, { delivery_state: "not-integrated" });
    expect(again.updated).toBe(first.updated);
    expect(again.delivery_recorded_at).toBe(first.delivery_recorded_at);
  });

  it("serialises delivery fields in key order, after deployment", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    await store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "main", delivery_sha: SHA_A });
    const raw = await fs.readFile(ticketFile(item.id), "utf8");
    expect(raw.indexOf("delivery_state:")).toBeLessThan(raw.indexOf("delivery_branch:"));
    expect(raw.indexOf("delivery_branch:")).toBeLessThan(raw.indexOf("delivery_sha:"));
    expect(raw.indexOf("delivery_sha:")).toBeLessThan(raw.indexOf("delivery_recorded_at:"));
    expect(raw.indexOf("delivery_recorded_at:")).toBeLessThan(raw.indexOf("archived:"));
    // Round-trips byte-for-byte through the parser the older server also uses.
    expect(serialiseItem(parseItem(raw))).toBe(raw);
  });

  it("leaves a ticket with no delivery record byte-identical to before", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    const before = await fs.readFile(ticketFile(item.id), "utf8");
    expect(before).not.toMatch(/delivery_/u);
    await store.updateItem(item.id, { title: "T2" });
    const after = await fs.readFile(ticketFile(item.id), "utf8");
    expect(after).not.toMatch(/delivery_/u);
  });
});

describe("FRD-031 AC1 — a main-only project", () => {
  it("targets and verifies `main` at an exact merged SHA", async () => {
    const board = await store.getBoard();
    const resolved = resolveDelivery(board);
    // AC1: base branch, PR target and verification target are all `main`,
    // with no configuration at all.
    expect(resolved.integrationBranch).toBe("main");
    expect(resolved.releaseBranch).toBe("main");

    const item = await store.createItem({ type: "ticket", title: "Main-only work" });
    const integrated = await store.updateItem(item.id, {
      delivery_state: "integrated",
      delivery_branch: resolved.integrationBranch,
      delivery_sha: SHA_A,
    });
    expect(integrated.delivery_branch).toBe("main");
    expect(integrated.delivery_sha).toBe(SHA_A);
    // Main-only means no backport is ever owed: the release branch *is* the
    // integration branch.
    expect(integrated.delivery_backport_required).toBeUndefined();
  });
});

describe("FRD-031 AC2 — a dev-to-main project", () => {
  it("integrates into `dev`, reaches Done on that, and records the release separately", async () => {
    await policy(DEV_TO_MAIN);
    const resolved = resolveDelivery(await store.getBoard());
    expect(resolved.integrationBranch).toBe("dev");

    const item = await store.createItem({ ...free, title: "Dev-integrated work" });
    const integrated = await store.updateItem(item.id, {
      delivery_state: "integrated",
      delivery_branch: "dev",
      delivery_sha: SHA_A,
    });
    expect(integrated.delivery_state).toBe("integrated");
    expect(integrated.delivery_backport_required).toBeUndefined();

    // The workflow stage represents acceptance against the *integration*
    // target, so the ticket finishes while delivery state is only `integrated`.
    for (const stage of ["preparing", "implementing", "review", "verifying", "done"]) {
      await store.moveItem(item.id, { status: stage });
    }
    const done = await store.getItem(item.id);
    expect(done?.status).toBe("done");
    expect(done?.delivery_state).toBe("integrated");

    // Production release inclusion is recorded afterwards, without touching the stage.
    const candidate = await store.updateItem(item.id, {
      delivery_state: "release-candidate",
      delivery_candidate: "release/v0.4.0",
    });
    expect(candidate.status).toBe("done");
    expect(candidate.delivery_candidate).toBe("release/v0.4.0");

    const released = await store.updateItem(item.id, {
      delivery_state: "released",
      delivery_release_branch: "main",
      delivery_release_tag: "v0.4.0",
    });
    expect(released.status).toBe("done");
    expect(released.delivery_state).toBe("released");
    // The integration evidence is untouched by the release record.
    expect(released.delivery_branch).toBe("dev");
    expect(released.delivery_sha).toBe(SHA_A);

    const deployed = await store.updateItem(item.id, { delivery_state: "production-verified" });
    expect(deployed.delivery_state).toBe("production-verified");
  });

  it("refuses a release branch that is not the declared one", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "T" });
    await expect(
      store.updateItem(item.id, { delivery_release_branch: "trunk" }),
    ).rejects.toThrow(/DELIVERY_TARGET_INVALID.*release branch "main"/su);
  });
});

describe("FRD-031 AC5 — a release-branch hotfix records its backport", () => {
  it("derives the required integration backport and clears it only on a backport SHA", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "Hotfix" });

    const hotfix = await store.updateItem(item.id, {
      delivery_state: "integrated",
      delivery_branch: "main", // the release branch, not the integration branch
      delivery_sha: SHA_A,
    });
    expect(hotfix.delivery_backport_required).toBe("dev");

    // The obligation is derived, so a caller cannot record itself as owing nothing.
    const stillOwed = await store.updateItem(item.id, { delivery_state: "released", delivery_release_branch: "main", delivery_release_tag: "v0.3.13" });
    expect(stillOwed.delivery_backport_required).toBe("dev");

    const discharged = await store.updateItem(item.id, { delivery_backport_sha: SHA_B });
    expect(discharged.delivery_backport_sha).toBe(SHA_B);
    expect(discharged.delivery_backport_required).toBeUndefined();
  });

  it("owes nothing when the project disables hotfix backports", async () => {
    await policy({ ...DEV_TO_MAIN, hotfixBackport: false });
    const item = await store.createItem({ type: "ticket", title: "Hotfix" });
    const hotfix = await store.updateItem(item.id, {
      delivery_state: "integrated",
      delivery_branch: "main",
      delivery_sha: SHA_A,
    });
    expect(hotfix.delivery_backport_required).toBeUndefined();
  });

  it("owes nothing on a main-only project, where the two branches are the same", async () => {
    const item = await store.createItem({ type: "ticket", title: "T" });
    const integrated = await store.updateItem(item.id, {
      delivery_state: "integrated",
      delivery_branch: "main",
      delivery_sha: SHA_A,
    });
    expect(integrated.delivery_backport_required).toBeUndefined();
  });

  it("re-derives the obligation when the delivery branch moves back to integration", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "T" });
    await store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "main", delivery_sha: SHA_A });
    const moved = await store.updateItem(item.id, { delivery_branch: "dev" });
    expect(moved.delivery_backport_required).toBeUndefined();
  });

  it("refuses a backport SHA on a change that was never a hotfix", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "T" });
    await store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "dev", delivery_sha: SHA_A });
    await expect(store.updateItem(item.id, { delivery_backport_sha: SHA_B })).rejects.toThrow(
      /DELIVERY_NO_BACKPORT_REQUIRED/u,
    );
  });
});

describe("FRD-031 edge case — delivery evidence is never a gate input", () => {
  it("does not let a released feature ticket reach Done without proof", async () => {
    await policy(DEV_TO_MAIN);
    const item = await store.createItem({ type: "ticket", title: "Unproven", profile: "feature", docs_todo: true });

    await store.setDoc(item.id, "research", "R");
    await store.setDoc(item.id, "files", "F");
    await store.setDoc(item.id, "plan", "P");
    await store.setDoc(item.id, "checklist", "- [x] done");
    await store.moveItem(item.id, { status: "preparing" });
    await store.moveItem(item.id, { status: "implementing" });
    await store.setDoc(item.id, "post-implementation-report", "PIR");
    await store.moveItem(item.id, { status: "review" });
    await store.moveItem(item.id, { status: "verifying" });

    // Record the strongest delivery evidence there is...
    await store.updateItem(item.id, {
      delivery_state: "production-verified",
      delivery_branch: "dev",
      delivery_sha: SHA_A,
      delivery_release_branch: "main",
      delivery_release_tag: "v9.9.9",
    });

    // ...and Done is still refused, naming `proof`. Release evidence is not
    // acceptance evidence (ADR-0005).
    await expect(store.moveItem(item.id, { status: "done" })).rejects.toThrow(/proof/u);

    await store.setDoc(item.id, "proof", "PASS");
    const done = await store.moveItem(item.id, { status: "done" });
    expect(done.status).toBe("done");
  });

  it("keeps an unmerged ticket unverified however much release state it records", async () => {
    const item = await store.createItem({ type: "ticket", title: "Unmerged", profile: "feature" });
    await store.updateItem(item.id, { delivery_state: "not-integrated" });
    const gates = await store.getDocGates(item.id);
    // Nothing about delivery appears in the gate report at all.
    expect(JSON.stringify(gates)).not.toMatch(/delivery/u);
  });
});

describe("merge gate WRONG_TARGET (CORE-116, FRD-031)", () => {
  const HEAD = "e".repeat(40);
  const gateEvidence = (overrides: Record<string, unknown> = {}) => ({
    reviewStageId: "review",
    finalStageId: "done",
    blockers: [],
    review: { state: "valid" as const, headSha: HEAD, verdict: "pass" },
    commits: [],
    ...overrides,
  });
  const prInput = (id: string, baseRef?: string) => ({
    number: 1,
    headSha: HEAD,
    branch: "feature",
    body: `Kanmer: ${id}`,
    ...(baseRef === undefined ? {} : { baseRef }),
  });

  it("skips the check when the event carried no base branch", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "T", status: "review" });
    const result = await evaluateMergeGate(store, prInput(ticket.id), gateEvidence());
    expect(result.checks?.find((c) => c.code === "WRONG_TARGET")).toMatchObject({
      outcome: "skipped",
      level: "warning",
    });
    expect(result.findings.map((f) => f.code)).not.toContain("WRONG_TARGET");
  });

  it("passes an undeclared project's PR into `main` — no behaviour change for a main-only repo", async () => {
    const ticket = await store.createItem({ type: "ticket", title: "T", status: "review" });
    const result = await evaluateMergeGate(store, prInput(ticket.id, "main"), gateEvidence());
    expect(result.checks?.find((c) => c.code === "WRONG_TARGET")).toMatchObject({
      outcome: "pass",
      details: { expected: "main", hotfix: false },
    });
    expect(result.ok).toBe(true);
  });

  it("passes a PR into the configured integration branch", async () => {
    await policy(DEV_TO_MAIN);
    const ticket = await store.createItem({ type: "ticket", title: "T", status: "review" });
    const result = await evaluateMergeGate(store, prInput(ticket.id, "dev"), gateEvidence());
    expect(result.checks?.find((c) => c.code === "WRONG_TARGET")).toMatchObject({ outcome: "pass" });
  });

  it("warns without blocking when a normal PR targets the release branch instead", async () => {
    await policy(DEV_TO_MAIN);
    const ticket = await store.createItem({ type: "ticket", title: "T", status: "review" });
    const result = await evaluateMergeGate(store, prInput(ticket.id, "main"), gateEvidence());
    const check = result.checks?.find((c) => c.code === "WRONG_TARGET");
    expect(check).toMatchObject({ outcome: "warn", level: "warning", details: { baseRef: "main", expected: "dev" } });
    expect(result.findings.map((f) => f.code)).toContain("WRONG_TARGET");
    // Warning-level findings never block a merge.
    expect(result.ok).toBe(true);
  });

  it("blocks the same PR under KANMER_GATE_STRICT", async () => {
    await policy(DEV_TO_MAIN);
    const ticket = await store.createItem({ type: "ticket", title: "T", status: "review" });
    const result = await evaluateMergeGate(store, prInput(ticket.id, "main"), gateEvidence({ strict: true }));
    expect(result.checks?.find((c) => c.code === "WRONG_TARGET")).toMatchObject({ outcome: "fail", level: "error" });
    expect(result.ok).toBe(false);
  });

  it("accepts the release branch for a ticket whose delivery record says it is a hotfix", async () => {
    await policy(DEV_TO_MAIN);
    const ticket = await store.createItem({ type: "ticket", title: "Hotfix", status: "review" });
    await store.updateItem(ticket.id, { delivery_branch: "main" });
    const onRelease = await evaluateMergeGate(store, prInput(ticket.id, "main"), gateEvidence({ strict: true }));
    expect(onRelease.checks?.find((c) => c.code === "WRONG_TARGET")).toMatchObject({
      outcome: "pass",
      details: { expected: "main", hotfix: true },
    });
    // And the integration branch is then the wrong target for that same ticket.
    const onIntegration = await evaluateMergeGate(store, prInput(ticket.id, "dev"), gateEvidence({ strict: true }));
    expect(onIntegration.checks?.find((c) => c.code === "WRONG_TARGET")).toMatchObject({ outcome: "fail" });
  });
});

describe("deliveryTargets — the one shared rule (CORE-116, FRD-031)", () => {
  const mainOnly = {
    integrationBranch: "main",
    releaseBranch: "main",
    releaseCandidatePattern: null,
    hotfixBackport: true,
  };
  const devToMain = {
    integrationBranch: "dev",
    releaseBranch: "main",
    releaseCandidatePattern: "release/*",
    hotfixBackport: true,
  };

  it("points base, PR and verification at the integration branch", () => {
    expect(deliveryTargets(devToMain, {})).toEqual({
      hotfix: false,
      baseBranch: "dev",
      prTarget: "dev",
      verificationTarget: "dev",
    });
  });

  it("points all three at the release branch for a recorded hotfix", () => {
    expect(deliveryTargets(devToMain, { delivery_branch: "main" })).toEqual({
      hotfix: true,
      baseBranch: "main",
      prTarget: "main",
      verificationTarget: "main",
    });
  });

  it("never calls anything a hotfix on a main-only project", () => {
    // Both branches are `main`, so there is no such thing as a hotfix here —
    // and the gate must not start expecting a different target because of it.
    expect(deliveryTargets(mainOnly, { delivery_branch: "main" })).toEqual({
      hotfix: false,
      baseBranch: "main",
      prTarget: "main",
      verificationTarget: "main",
    });
  });

  it("ignores a delivery branch that is the integration branch", () => {
    expect(deliveryTargets(devToMain, { delivery_branch: "dev" }).hotfix).toBe(false);
  });
});

describe("verification target in dispatch prompts (CORE-116, FRD-031)", () => {
  it("names the project's integration branch, and stays neutral without one", () => {
    const verify = DISPATCH_TASKS.find((task) => task.id === "verify");
    expect(verify).toBeDefined();
    expect(verify?.prompt("CORE-1", "dev")).toContain("on merged dev");
    // A caller with no board (a settings preview) gets a neutral phrase rather
    // than a branch name that may be wrong for this project.
    expect(verify?.prompt("CORE-1")).toContain(`on merged ${NEUTRAL_VERIFICATION_TARGET}`);
    expect(verify?.prompt("CORE-1")).not.toContain("on merged main");
  });
});

describe("a main-only project has no hotfixes at all (CORE-116)", () => {
  it("refuses a backport SHA even though delivery_branch equals the release branch", async () => {
    // The trap: on a main-only board `delivery_branch === releaseBranch` is
    // true for every ticket, so a bare branch comparison would accept a
    // backport SHA that can never mean anything.
    const item = await store.createItem({ type: "ticket", title: "T" });
    await store.updateItem(item.id, { delivery_state: "integrated", delivery_branch: "main", delivery_sha: SHA_A });
    await expect(store.updateItem(item.id, { delivery_backport_sha: SHA_B })).rejects.toThrow(
      /DELIVERY_NO_BACKPORT_REQUIRED/u,
    );
  });
});
