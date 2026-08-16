/**
 * Demo data + an in-memory ProjectClient for @kanmer/ui.
 *
 * The GUI's client-backed screens (Board, Editor, Settings, Standup,
 * ActivityPanel, TicketCreate) read a `ProjectClient` from `ClientContext`
 * — in the app that is the Electron IPC bridge. Outside Electron (design
 * tools, storybooks, docs) wrap them in `<KanmerProvider>` and they run
 * against this small, mutable, in-memory board instead. Nothing here is
 * rendered — it is data and plumbing only; the components are the real ones.
 */
import { useMemo, type ReactNode } from "react";
import type {
  ActivityEntry,
  BoardConfig,
  CreateItemInput,
  DocType,
  Item,
  ItemFilter,
  LinkGraph,
  MovePosition,
  UpdateItemPatch,
} from "@kanmer/core";
import type { KanmerApi } from "../../../apps/gui/src/shared/ipc.js";
import { ClientContext, type ProjectClient } from "../../../apps/gui/src/renderer/src/lib/client.js";
import { columnCards } from "../../../apps/gui/src/renderer/src/lib/board.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Demo clock: everything is dated relative to module load so "2h ago" reads right. */
const NOW = Date.now();
const ago = (ms: number): string => new Date(NOW - ms).toISOString();

/** The 7-stage default board with three areas, priorities and two deploy environments. */
export const demoBoard: BoardConfig = {
  statuses: [
    { id: "backlog", name: "Backlog" },
    { id: "researching", name: "Researching" },
    { id: "planning", name: "Planning" },
    { id: "implementing", name: "Implementing" },
    { id: "review", name: "Review" },
    { id: "verifying", name: "Verifying" },
    { id: "done", name: "Done" },
  ],
  areas: [
    { id: "api", name: "API", prefix: "API", color: "#5b8cff" },
    { id: "gui", name: "GUI", prefix: "GUI", color: "#3ecf8e" },
    { id: "pr-review", name: "PR Review", prefix: "PR", color: "#b48cff" },
  ],
  priorities: [
    { id: "low", name: "Low", color: "#6b7280" },
    { id: "medium", name: "Medium", color: "#5b8cff" },
    { id: "high", name: "High", color: "#ffcf7a" },
    { id: "urgent", name: "Urgent", color: "#ff6b6b" },
  ],
  idPrefixes: { ticket: "TICK", plan: "PLAN", research: "RES" },
  deployment: { environments: ["staging", "production"] },
};

const base = {
  type: "ticket" as const,
  assignee: "",
  labels: [] as string[],
  links: [] as string[],
  archived: false,
  body: "",
};

/** A realistic mid-sprint board: every stage populated, chips of every kind. */
export const demoItems: Item[] = [
  {
    ...base,
    id: "API-014",
    title: "Rate-limit the MCP list_items call",
    status: "backlog",
    area: "api",
    priority: "medium",
    labels: ["perf", "mcp"],
    order: 1,
    created: ago(3 * DAY),
    updated: ago(3 * DAY),
    body: "Agents polling every second saturate the watcher. Cap at 4/s per session and return `Retry-After`.",
  },
  {
    ...base,
    id: "GUI-031",
    title: "Card density: remember per project",
    status: "backlog",
    area: "gui",
    priority: "low",
    labels: ["settings"],
    order: 2,
    created: ago(6 * DAY),
    updated: ago(6 * DAY),
  },
  {
    ...base,
    id: "TICK-102",
    title: "Write the v0.3 release notes",
    status: "backlog",
    area: "",
    priority: "low",
    assignee: "mercer",
    labels: ["docs"],
    order: 3,
    created: ago(2 * DAY),
    updated: ago(2 * DAY),
  },
  {
    ...base,
    id: "API-012",
    title: "Optimistic concurrency for set_doc",
    status: "researching",
    area: "api",
    priority: "high",
    assignee: "mercer",
    labels: ["concurrency"],
    refs: ["docs/prd/doc-versions.md"],
    created: ago(5 * DAY),
    updated: ago(20 * HOUR),
    body: "Agents and the GUI both write `plan.md`. Version tokens on read, `expectedVersion` on write — see [[API-009]] for the item-level precedent.",
  },
  {
    ...base,
    id: "GUI-028",
    title: "Keyboard drag: Ctrl+←/→ moves a card one stage",
    status: "planning",
    area: "gui",
    priority: "medium",
    assignee: "alex",
    labels: ["a11y", "board"],
    links: ["GUI-027"],
    created: ago(4 * DAY),
    updated: ago(1 * DAY),
    body: "- [x] Research existing focus handling\n- [ ] Plan the announcement text\n- [ ] Ship",
  },
  {
    ...base,
    id: "API-009",
    title: "Item-level expectedUpdated conflict check",
    status: "implementing",
    area: "api",
    priority: "urgent",
    assignee: "mercer",
    labels: ["concurrency", "core"],
    taken_at: ago(5 * HOUR),
    branch: "feat/expected-updated",
    worktree: ".worktrees/API-009",
    blocks: ["API-012"],
    commits: ["9f1c2ab7de", "41d0e83c99"],
    created: ago(7 * DAY),
    updated: ago(2 * HOUR),
    body: "Reject `updateItem` when `updated` moved under the caller. GUI keeps last-write-wins.\n\n```ts\nif (fresh.updated !== patch.expectedUpdated) throw new ConflictError();\n```",
  },
  {
    ...base,
    id: "GUI-027",
    title: "Board: area sub-headers inside each column",
    status: "implementing",
    area: "gui",
    priority: "high",
    assignee: "alex",
    labels: ["board"],
    taken_at: ago(2 * DAY),
    branch: "feat/area-groups",
    deployment: "not-deployed",
    created: ago(9 * DAY),
    updated: ago(3 * HOUR),
    body: "Cards cluster by area under a colour-coded sub-header. Blocks [[GUI-028]] until the DOM order settles.",
  },
  {
    ...base,
    id: "PR-007",
    title: "PR #41 feedback: split dispatch.ts",
    status: "review",
    area: "pr-review",
    priority: "medium",
    assignee: "codex",
    labels: ["refactor"],
    prs: ["41"],
    created: ago(1 * DAY),
    updated: ago(6 * HOUR),
  },
  {
    ...base,
    id: "GUI-025",
    title: "Command palette (Ctrl+K)",
    status: "verifying",
    area: "gui",
    priority: "medium",
    assignee: "alex",
    labels: ["shortcuts"],
    prs: ["38"],
    deployment: "staging",
    created: ago(12 * DAY),
    updated: ago(10 * HOUR),
  },
  {
    ...base,
    id: "API-008",
    title: "Activity log rotation",
    status: "done",
    area: "api",
    priority: "low",
    assignee: "mercer",
    labels: ["core"],
    commits: ["c0ffee1234"],
    deployment: "production",
    created: ago(15 * DAY),
    updated: ago(2 * DAY),
  },
  {
    ...base,
    id: "TICK-097",
    title: "Welcome screen: recent projects list",
    status: "done",
    area: "",
    priority: "medium",
    assignee: "alex",
    labels: ["gui"],
    deployment: "production",
    created: ago(20 * DAY),
    updated: ago(5 * DAY),
  },
  {
    ...base,
    id: "TICK-090",
    title: "Legacy phases[] migration",
    status: "done",
    area: "",
    priority: "low",
    labels: ["migration"],
    archived: true,
    created: ago(40 * DAY),
    updated: ago(30 * DAY),
  },
];

/** A week of activity, newest last (the store's natural order). */
export const demoActivity: ActivityEntry[] = [
  { ts: ago(6 * DAY), id: "API-008", op: "update", field: "status", from: "verifying", to: "done", actor: "mercer" },
  { ts: ago(3 * DAY), id: "API-014", op: "create", to: "backlog", actor: "claude" },
  { ts: ago(2 * DAY), id: "GUI-027", op: "take", to: "feat/area-groups", actor: "alex" },
  { ts: ago(26 * HOUR), id: "GUI-028", op: "doc", field: "checklist", to: "write", actor: "alex" },
  { ts: ago(20 * HOUR), id: "API-012", op: "update", field: "body", actor: "mercer" },
  { ts: ago(10 * HOUR), id: "GUI-025", op: "update", field: "status", from: "review", to: "verifying", actor: "alex" },
  { ts: ago(6 * HOUR), id: "PR-007", op: "create", to: "review", actor: "codex" },
  { ts: ago(5 * HOUR), id: "API-009", op: "take", to: "feat/expected-updated", actor: "mercer" },
  { ts: ago(3 * HOUR), id: "GUI-027", op: "doc", field: "plan", to: "append", actor: "claude" },
  { ts: ago(2 * HOUR), id: "API-009", op: "update", field: "labels", actor: "mercer" },
];

const DEMO_DOC_TYPES: DocType[] = [
  { id: "research", name: "Research" },
  { id: "impact", name: "Impact" },
  { id: "open-questions", name: "Open questions" },
  { id: "plan", name: "Plan", requires: ["research", "impact"] },
  { id: "checklist", name: "Checklist", requires: ["plan"], progress: true },
  { id: "post-implementation-report", name: "Post-implementation report" },
  { id: "proof", name: "Proof" },
];

const DEMO_DOCS: Record<string, Record<string, string>> = {
  "API-009": {
    research:
      "# API-009 research\n\nThe store already reads `updated` on every patch; the check is one comparison before the write.\n",
    impact: "# API-009 impact\n\nMCP callers passing `expectedUpdated` may now see a conflict error. GUI unaffected.\n",
    plan: "# API-009 plan\n\n1. Add `expectedUpdated` to `UpdateItemPatch`\n2. Compare in `updateItem`\n3. Surface a `ConflictError`\n",
    checklist:
      "# API-009 checklist\n\n- [x] Patch type extended\n- [x] Store compares timestamps\n- [ ] MCP tool passes the token\n- [ ] Editor shows the conflict banner\n",
  },
  "GUI-028": {
    checklist: "# GUI-028 checklist\n\n- [x] Research existing focus handling\n- [ ] Plan the announcement text\n- [ ] Ship\n",
  },
};

function nextId(items: Item[], area: string | undefined, board: BoardConfig): string {
  const prefix = (area && board.areas.find((a) => a.id === area)?.prefix) || board.idPrefixes.ticket;
  const max = items
    .filter((i) => i.id.startsWith(prefix + "-"))
    .map((i) => Number.parseInt(i.id.slice(prefix.length + 1), 10) || 0)
    .reduce((m, n) => Math.max(m, n), 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function orderFor(items: Item[], status: string, position: MovePosition | undefined): number | undefined {
  const col = columnCards(items, status);
  if (position === undefined) return undefined;
  if (position === "top") return (col[0]?.order ?? 1) - 1;
  if (position === "bottom") return (col[col.length - 1]?.order ?? 0) + 1;
  const idx = col.findIndex((i) => i.id === position.after);
  const prev = col[idx]?.order ?? 0;
  const next = col[idx + 1]?.order;
  return next === undefined ? prev + 1 : (prev + next) / 2;
}

/**
 * An in-memory `ProjectClient`. Mutations update the seeded arrays in place
 * (and append to the activity log) so a design that wires `client.moveItem`
 * to a re-fetch behaves like the real app. Every method resolves; the
 * Electron-only ones (pickers, agent connect/dispatch) resolve with an honest
 * "not available here" result instead of throwing.
 */
export function createDemoClient(seed?: {
  projectId?: string;
  board?: BoardConfig;
  items?: Item[];
  activity?: ActivityEntry[];
}): ProjectClient {
  const projectId = seed?.projectId ?? "C:/work/kanmer-demo";
  let board: BoardConfig = structuredClone(seed?.board ?? demoBoard);
  const items: Item[] = structuredClone(seed?.items ?? demoItems);
  const activity: ActivityEntry[] = structuredClone(seed?.activity ?? demoActivity);
  const docs: Record<string, Record<string, string>> = structuredClone(DEMO_DOCS);
  const versionOf = (s: string) => String(s.length) + ":" + s.slice(0, 8);
  const log = (e: Omit<ActivityEntry, "ts" | "actor"> & Partial<ActivityEntry>) =>
    activity.push({ ts: new Date().toISOString(), actor: "you", ...e });
  const find = (id: string) => items.find((i) => i.id === id);
  const lastStage = () => board.statuses[board.statuses.length - 1]?.id;

  const client: ProjectClient = {
    projectId,
    getBoard: async () => structuredClone(board),
    setBoard: async (b) => {
      board = structuredClone(b);
      return structuredClone(board);
    },
    listItems: async (f?: ItemFilter) =>
      items
        .filter((i) => (f?.includeArchived ? true : !i.archived))
        .filter((i) => (f?.type ? i.type === f.type : true))
        .filter((i) => (f?.status ? i.status === f.status : true))
        .filter((i) => (f?.area !== undefined ? i.area === f.area : true))
        .filter((i) => (f?.label ? i.labels.includes(f.label) : true))
        .map((i) => structuredClone(i)),
    listItemsWithWarnings: async (f) => ({ items: await client.listItems(f), warnings: [] }),
    getItem: async (id) => {
      const it = find(id);
      return it ? structuredClone(it) : null;
    },
    createItem: async (input: CreateItemInput) => {
      const now = new Date().toISOString();
      const item: Item = {
        ...base,
        id: nextId(items, input.area, board),
        type: input.type,
        title: input.title,
        status: input.status ?? board.statuses[0]?.id ?? "",
        area: input.area ?? "",
        priority: input.priority ?? "medium",
        assignee: input.assignee ?? "",
        labels: input.labels ?? [],
        links: input.links ?? [],
        blocks: input.blocks,
        refs: input.refs,
        docs_todo: input.docs_todo,
        commits: input.commits,
        prs: input.prs,
        deployment: input.deployment,
        body: input.body ?? "",
        created: now,
        updated: now,
      };
      item.order = orderFor(items, item.status, "bottom");
      items.push(item);
      log({ id: item.id, op: "create", to: item.status });
      return structuredClone(item);
    },
    updateItem: async (id, patch: UpdateItemPatch) => {
      const it = find(id);
      if (!it) throw new Error(`No item ${id}`);
      if (patch.expectedUpdated !== undefined && patch.expectedUpdated !== it.updated) {
        throw new Error(`${id} changed on disk (conflict)`);
      }
      const { expectedUpdated: _ignored, ...rest } = patch;
      for (const [k, v] of Object.entries(rest)) {
        if (v === undefined) continue;
        (it as Record<string, unknown>)[k] = v;
        log({ id, op: "update", field: k, to: typeof v === "string" ? v : undefined });
      }
      it.updated = new Date().toISOString();
      return structuredClone(it);
    },
    moveItem: async (id, to) => {
      const it = find(id);
      if (!it) throw new Error(`No item ${id}`);
      const from = it.status;
      it.order = orderFor(items.filter((i) => i.id !== id), to.status, to.position ?? "bottom");
      it.status = to.status;
      it.updated = new Date().toISOString();
      log({ id, op: "update", field: "status", from, to: to.status });
      return structuredClone(it);
    },
    deleteItem: async (id) => {
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) return { deleted: false, cleanedLinks: [], bodyReferencesRemain: [] };
      items.splice(idx, 1);
      const cleaned: string[] = [];
      for (const i of items) {
        if (i.links.includes(id)) {
          i.links = i.links.filter((l) => l !== id);
          cleaned.push(i.id);
        }
      }
      log({ id, op: "delete" });
      return { deleted: true, cleanedLinks: cleaned, bodyReferencesRemain: [] };
    },
    takeTicket: async (id, input) => {
      const it = find(id);
      if (!it) throw new Error(`No item ${id}`);
      it.taken_at = new Date().toISOString();
      it.branch = input.branch;
      it.worktree = input.worktree;
      if (input.assignee) it.assignee = input.assignee;
      const stage = input.stage ?? board.statuses.find((s) => s.id === "implementing")?.id;
      if (stage) it.status = stage;
      log({ id, op: "take", to: input.branch });
      return structuredClone(it);
    },
    releaseTicket: async (id) => {
      const it = find(id);
      if (!it) throw new Error(`No item ${id}`);
      delete it.taken_at;
      delete it.branch;
      delete it.worktree;
      log({ id, op: "release" });
      return structuredClone(it);
    },
    addColumn: async (kind, column) => {
      const key = kind === "status" ? "statuses" : kind === "area" ? "areas" : "priorities";
      board = { ...board, [key]: [...board[key], column] };
      return structuredClone(board);
    },
    linkItems: async (source, target, action) => {
      const it = find(source);
      if (!it) throw new Error(`No item ${source}`);
      it.links = action === "add" ? [...new Set([...it.links, target])] : it.links.filter((l) => l !== target);
      return structuredClone(it);
    },
    getLinks: async (id): Promise<LinkGraph> => {
      const it = find(id);
      const wiki = (body: string) => [...body.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
      const links = it ? [...new Set([...it.links, ...wiki(it.body)])] : [];
      const backlinks = items
        .filter((i) => i.id !== id && (i.links.includes(id) || wiki(i.body).includes(id)))
        .map((i) => i.id);
      const blocks = it?.blocks ?? [];
      const blockedBy = items.filter((i) => (i.blocks ?? []).includes(id)).map((i) => i.id);
      return { id, links, backlinks, blocks, blockedBy };
    },
    connectAgent: async (t) => ({ ok: false, command: `kanmer connect ${t}`, output: "Not available outside the Kanmer app." }),
    disconnectAgent: async (t) => ({ ok: false, command: `kanmer disconnect ${t}`, output: "Not available outside the Kanmer app." }),
    getSkillsStatus: async () => ({ scope: "project", installedVersion: "0.2.0", bundledVersion: "0.2.0", updateAvailable: false }),
    updateSkills: async (t) => ({ ok: true, command: `kanmer skills update ${t}`, output: "Skills are current." }),
    dispatchAgent: async (ticketId, provider) => ({
      dispatchId: `demo-${ticketId}`,
      projectId,
      ticketId,
      provider,
      state: "running",
      startedAt: Date.now(),
      tail: ["(demo) agent started"],
    }),
    migrate: async (dryRun) => ({
      alreadyV2: true,
      dryRun,
      ticketMoves: [],
      foldedDocs: [],
      convertedToTickets: [],
      areaPrefixes: Object.fromEntries(board.areas.map((a) => [a.id, a.prefix ?? a.id.toUpperCase()])),
      notes: ["Board is already format 2 — nothing to do."],
      blockers: [],
    }),
    backfillBoard: async () => ({ addedStages: [] }),
    getFormat: async () => 2,
    getDoc: async (id, doc) => {
      const c = docs[id]?.[doc] ?? null;
      return { content: c, version: c === null ? null : versionOf(c) };
    },
    setDoc: async (id, doc, content, opts) => {
      const cur = docs[id]?.[doc] ?? null;
      if (opts?.expectedVersion !== undefined) {
        const expect = opts.expectedVersion;
        const actual = cur === null ? null : versionOf(cur);
        if (expect !== actual) throw new Error(`${id}/${doc}.md changed on disk (conflict)`);
      }
      const next = opts?.append && cur ? cur + content : content;
      const written = next.trim() ? `${next.trim()}\n` : next;
      (docs[id] ??= {})[doc] = written;
      log({ id, op: "doc", field: doc, to: opts?.append ? "append" : "write" });
      return { version: versionOf(written) };
    },
    getDocsInfo: async (id) => {
      const it = find(id);
      if (!it || it.type !== "ticket") return null;
      const have = docs[id] ?? {};
      const present = Object.fromEntries(DEMO_DOC_TYPES.map((t) => [t.id, t.id in have]));
      const progress = have.checklist;
      const checklist = progress
        ? {
            checked: (progress.match(/^\s*[-*]\s+\[[xX]\]/gm) ?? []).length,
            total: (progress.match(/^\s*[-*]\s+\[( |x|X)\]/gm) ?? []).length,
          }
        : null;
      return { docs: present, checklist };
    },
    getDocTypes: async () => structuredClone(DEMO_DOC_TYPES),
    getDocModel: async () => ({
      repoDocs: { prd: "docs/prd/**", frd: "docs/frd/**", adr: "docs/adr/**" },
      defaultTypes: structuredClone(DEMO_DOC_TYPES),
      defaultGates: [
        { needs: "plan", before: { leave: "planning" } },
        { needs: "proof", before: { enter: lastStage() ?? "done" } },
      ],
    }),
    openRepoDoc: async () => {},
    getRepoDoc: async (rel) => `# ${rel}\n\n(Demo) governing document text.\n`,
    pickRepoDoc: async () => null,
    getGateStatus: async (id) => {
      const it = find(id);
      const out: Record<string, string[]> = {};
      for (const s of board.statuses) out[s.id] = [];
      if (it && !(docs[id]?.plan) && it.status === "planning") {
        for (const s of board.statuses.slice(3)) out[s.id] = ["plan.md required before leaving Planning"];
      }
      if (it && !(docs[id]?.proof)) {
        const last = lastStage();
        if (last && it.status !== last) out[last] = [...(out[last] ?? []), "proof.md required before Done"];
      }
      return out;
    },
    getActivity: async (opts) => {
      let list = activity.slice();
      if (opts?.id) list = list.filter((e) => e.id === opts.id);
      if (opts?.since) list = list.filter((e) => e.ts >= opts.since!);
      if (opts?.limit) list = list.slice(-opts.limit);
      return structuredClone(list);
    },
  };
  return client;
}

/**
 * The few global `window.kanmer` calls the Settings screen makes (Git and
 * Connect tabs) — installed once, only when no real preload bridge exists.
 */
function installDemoBridge(): void {
  if (typeof window === "undefined" || (window as { kanmer?: unknown }).kanmer) return;
  const settings = {
    theme: "dark" as const,
    recentProjects: ["C:/work/kanmer-demo", "C:/work/acme-api"],
    notifications: true,
    openTabs: ["C:/work/kanmer-demo"],
    activeTab: "C:/work/kanmer-demo",
    sessionInitialized: true,
    kanmerBranch: "kanmer",
    gitSyncMinutes: 0,
    cardDensity: "comfortable" as const,
    confirmOnDelete: true,
    defaultPriority: "medium",
    defaultArea: "",
  };
  const gitStatus = { available: true, boardRoot: "C:/work/kanmer-demo/.kanmer", branch: "kanmer", lastSync: null, error: null, paused: false };
  const noop = () => () => {};
  const bridge: Partial<KanmerApi> = {
    getSettings: async () => settings,
    setTheme: async (theme) => ({ ...settings, theme }),
    setNotifications: async (on) => ({ ...settings, notifications: on }),
    setPreferences: async (p) => ({ ...settings, ...p }),
    setKanmerGitPreferences: async (p) => ({ ...settings, ...p }),
    getKanmerGitStatus: async () => gitStatus,
    syncKanmerNow: async () => ({ ...gitStatus, lastSync: new Date().toISOString() }),
    listProviders: async () => [
      { id: "claude", label: "Claude Code", dispatch: true },
      { id: "codex", label: "Codex", dispatch: true },
      { id: "opencode", label: "OpenCode", dispatch: false },
    ],
    listDispatches: async () => [],
    cancelDispatch: async () => true,
    onGitStatus: noop,
    onDispatchStatus: noop,
    onChange: noop,
    onReveal: noop,
    onMenu: noop,
    onAgentChange: noop,
  };
  (window as unknown as { kanmer: Partial<KanmerApi> }).kanmer = bridge;
}

export interface KanmerProviderProps {
  /** A client to serve; defaults to a fresh in-memory demo client. */
  client?: ProjectClient;
  children: ReactNode;
}

/**
 * Wrap any tree that uses Board, Editor, Settings, Standup, ActivityPanel or
 * TicketCreate. Without it those components throw ("useClient must be used
 * within a ClientContext.Provider"). Pass your own `client` to back them with
 * real data; omit it for the seeded demo board.
 */
export function KanmerProvider({ client, children }: KanmerProviderProps): JSX.Element {
  const value = useMemo(() => client ?? createDemoClient(), [client]);
  installDemoBridge();
  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}
