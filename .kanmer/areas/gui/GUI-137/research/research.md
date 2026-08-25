# Research — GUI-137

## Finding

`readRemoteAccess` canonicalizes persisted `projectId`, `boardRoot`, and `repoRoot` with `canonicalProjectPath`. `RemoteAccessManager` then keys its in-memory records, queues, delivery ownership, status correlation, and removals by whatever raw `projectId` each caller supplies. On Windows, auto-start uses the persisted `c:/...` form while opened-project IPC uses `C:\\...\`. Exact packaged reproduction produced one healthy auto-started runtime and one stopped UI record for the same fingerprint; UI Start failed `REMOTE_OWNER_EXISTS`.

No declared project sources apply. The correct boundary is the manager itself: every externally supplied project id must be canonicalized before it becomes an ownership key, status id, or delivery binding.
