import type { ProjectClient } from "./client.js";

/**
 * Every client method that writes the board.
 *
 * Listed explicitly rather than derived, because the interesting cases are the
 * ones that do not look like writes. `takeTicket` and `dispatchAgent` both
 * change ticket files — dispatch by handing an agent a board it is expected to
 * edit — and `setGroupDoc` writes outside the ticket tree entirely.
 *
 * Deliberately absent: `migrate` and `backfillBoard`, which are how you leave
 * read-only; and the connect/skills calls, which write to agent config, not to
 * the board.
 */
export const WRITE_METHODS = [
  "setBoard",
  "createItem",
  "updateItem",
  "moveItem",
  "deleteItem",
  "takeTicket",
  "releaseTicket",
  "addColumn",
  "linkItems",
  "setDoc",
  "createGroup",
  "updateGroup",
  "setGroupDoc",
  "dispatchAgent",
] as const satisfies readonly (keyof ProjectClient)[];

/**
 * A client that reads normally and refuses to write (FRD-007 M3).
 *
 * The board an unmigrated project shows is a *compat* rendering: format 3's
 * six fixed stages are being drawn over a stage set that may not be them.
 * Reading that is useful — you can find your tickets and decide to migrate.
 * Writing to it means saving format-3 shapes into a format-2 board, and the
 * result is a board that neither format's reader fully understands.
 *
 * Refusing at the client rather than per-component is what makes this
 * trustworthy: a component added later cannot forget to check, because it has
 * no way to reach the IPC surface except through here.
 *
 * This is a guard for the app's own UI, not a security boundary. Core stays the
 * authority on what a board will accept, and an MCP server never goes through
 * this path at all.
 */
export function readOnlyClient(client: ProjectClient, reason: string): ProjectClient {
  const guarded = { ...client };
  for (const method of WRITE_METHODS) {
    // The cast is contained to this line: every entry is a method of the
    // interface, and each is being replaced by a function that only ever
    // rejects, so the return type is irrelevant to the caller.
    (guarded as Record<string, unknown>)[method] = () => Promise.reject(new Error(reason));
  }
  return guarded;
}
