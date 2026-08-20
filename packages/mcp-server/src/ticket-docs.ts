import type { KanmerStore } from "@kanmer/core";

export type TicketDocument = { doc: string; exists: boolean; content: string | null; version: string | null };

/** Shared batch reader for get_ticket_doc and execution-packet consumers. */
export async function readTicketDocuments(store: KanmerStore, id: string, docs: string[]): Promise<TicketDocument[]> {
  const normalized = docs.map((doc) => doc.trim());
  if (normalized.some((doc) => !doc)) throw new Error("Each document id must be non-empty.");
  const unique = [...new Set(normalized)];
  return Promise.all(unique.map(async (doc) => {
    const { content, version } = await store.getDocWithVersion(id, doc);
    return { doc, exists: content !== null, content, version };
  }));
}
