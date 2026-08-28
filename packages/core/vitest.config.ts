import { defineConfig } from "vitest/config";

// Vitest's default 5 s `testTimeout` is not a budget these tests can meet on
// Windows, and raising it is not a way of tolerating a slow assertion — it is
// sizing the budget against costs that are paid before any assertion runs:
//
//   * CORE-125 put every `updateItem`/`moveItem`/`setDoc`/`appendScratch`
//     behind the board write lock. A contended claim sleeps through the whole
//     of `DEFAULT_LOCK_RETRY_MS` ([10, 25, 60, 150, 300, 600, 1000] = 2145 ms)
//     before it gives up, and a test that writes repeatedly can pay that more
//     than once.
//   * The first locked write in each process resolves the Windows process
//     identity through a synchronous `execFileSync("powershell.exe", …)` in
//     `io.ts`. Measured on an idle developer host: ~776 ms for this process
//     (cached afterwards) and ~1103 ms for another pid (never cached), so a
//     first `updateItem` costs ~998 ms against ~26 ms steady state. Vitest
//     isolates modules per test *file*, so every file pays it again.
//   * Windows filesystem work — atomic write plus rename, temp-tree teardown —
//     slows by 3-5x whenever a second verification rail shares the host, which
//     is the normal condition for this repository.
//
// 2145 ms + ~1000 ms is already 63 % of a 5 s budget. Measured worst case is
// 1.63 s per test unloaded and 6.2 s under load, which is where the recurring
// `Test timed out in 5000ms` failures came from (CORE-128). 30 s leaves ~5x
// headroom over the worst observed loaded test while still failing a genuinely
// hung test promptly enough to be useful.
//
// `hookTimeout` matters as much as `testTimeout` here: the `beforeEach`
// `store.init()` and the `afterEach` temp-tree removal are where the lock and
// the filesystem are slowest.
export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
