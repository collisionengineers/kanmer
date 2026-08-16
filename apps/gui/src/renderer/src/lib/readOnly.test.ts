import { describe, expect, it } from "vitest";
import type { ProjectClient } from "./client.js";
import { WRITE_METHODS, readOnlyClient } from "./readOnly.js";

/** Every method resolves to its own name, so a call that got through is visible. */
function stubClient(): ProjectClient {
  const names: (keyof ProjectClient)[] = [
    "getBoard", "setBoard", "listItems", "listItemsWithWarnings", "getItem", "createItem",
    "updateItem", "moveItem", "deleteItem", "takeTicket", "releaseTicket", "addColumn",
    "linkItems", "getLinks", "connectAgent", "disconnectAgent", "getSkillsStatus",
    "updateSkills", "dispatchAgent", "migrate", "backfillBoard", "getFormat", "getDoc",
    "setDoc", "getDocsInfo", "getDocTypes", "getDocModel", "openRepoDoc", "getRepoDoc",
    "pickRepoDoc", "getGateStatus", "getGates", "listGroups", "getGroup", "createGroup",
    "updateGroup", "getGroupDoc", "setGroupDoc", "getActivity",
  ];
  const stub: Record<string, unknown> = { projectId: "/p" };
  for (const n of names) stub[n] = () => Promise.resolve(n);
  return stub as unknown as ProjectClient;
}

const REASON = "This board is still format 2.";

describe("readOnlyClient", () => {
  it("rejects every write with the given reason", async () => {
    const guarded = readOnlyClient(stubClient(), REASON) as unknown as Record<
      string,
      () => Promise<unknown>
    >;
    for (const method of WRITE_METHODS) {
      await expect(guarded[method](), `${method} should refuse`).rejects.toThrow(REASON);
    }
  });

  it("leaves reads and the escape hatches working", async () => {
    const guarded = readOnlyClient(stubClient(), REASON) as unknown as Record<
      string,
      () => Promise<unknown>
    >;
    // Reads.
    for (const method of ["getBoard", "listItems", "getItem", "getDoc", "getGates", "getGroup"]) {
      await expect(guarded[method]()).resolves.toBe(method);
    }
    // Migrating is how you get out of read-only — blocking it would be a trap.
    for (const method of ["migrate", "backfillBoard", "getFormat"]) {
      await expect(guarded[method]()).resolves.toBe(method);
    }
  });

  it("keeps projectId, so the tab wiring still resolves", () => {
    expect(readOnlyClient(stubClient(), REASON).projectId).toBe("/p");
  });

  it("does not mutate the client it wraps", async () => {
    const base = stubClient();
    readOnlyClient(base, REASON);
    await expect(base.moveItem("T-1", { status: "done" })).resolves.toBe("moveItem");
  });

  it("names only methods that exist on the client", () => {
    const base = stubClient() as unknown as Record<string, unknown>;
    for (const method of WRITE_METHODS) expect(typeof base[method]).toBe("function");
  });
});
