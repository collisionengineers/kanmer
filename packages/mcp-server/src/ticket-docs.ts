import type { KanmerStore, TicketDocumentWithVersion } from "@kanmer/core";

export type TicketDocument = TicketDocumentWithVersion;

/** Shared batch reader for get_ticket_doc and execution-packet consumers. */
export async function readTicketDocuments(store: KanmerStore, id: string, docs: string[]): Promise<TicketDocument[]> {
  const normalized = docs.map((doc) => doc.trim());
  if (normalized.some((doc) => !doc)) throw new Error("Each document id must be non-empty.");
  const unique = [...new Set(normalized)];
  return store.getDocsWithVersions(id, unique);
}
