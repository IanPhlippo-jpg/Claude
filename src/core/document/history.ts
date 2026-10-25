/** Generic snapshot-based undo/redo stack. Snapshots must be immutable values. */
export class History<T> {
  private past: { label: string; state: T }[] = [];
  private future: { label: string; state: T }[] = [];
  constructor(private limit = 200) {}

  push(label: string, prev: T): void {
    this.past.push({ label, state: prev });
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }
  undo(current: T): { label: string; state: T } | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push({ label: entry.label, state: current });
    return entry;
  }
  redo(current: T): { label: string; state: T } | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push({ label: entry.label, state: current });
    return entry;
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  get undoLabel(): string | null {
    return this.past.length ? this.past[this.past.length - 1].label : null;
  }
  get redoLabel(): string | null {
    return this.future.length ? this.future[this.future.length - 1].label : null;
  }
  clear(): void {
    this.past = [];
    this.future = [];
  }
  /** the whole stack, to park it while another document is edited (Edit Component) */
  save(): { past: { label: string; state: T }[]; future: { label: string; state: T }[] } {
    return { past: [...this.past], future: [...this.future] };
  }
  restore(s: { past: { label: string; state: T }[]; future: { label: string; state: T }[] }): void {
    this.past = [...s.past];
    this.future = [...s.future];
  }
}
