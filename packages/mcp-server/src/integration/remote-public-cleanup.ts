/** Small LIFO cleanup stack used by the integration harness. */
export class CleanupStack {
  private readonly actions: Array<() => Promise<void> | void> = [];

  add(action: () => Promise<void> | void): void {
    this.actions.push(action);
  }

  async run(): Promise<readonly string[]> {
    const errors: string[] = [];
    for (const action of [...this.actions].reverse()) {
      try { await action(); }
      catch { errors.push("integration cleanup failed"); }
    }
    this.actions.length = 0;
    return errors;
  }
}
