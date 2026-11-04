/**
 * Tools ▸ Options ▸ Backup/Recover (QA F112, F153, F154, F156):
 *   - Auto-Recover: in the desktop app a copy of every open document with unsaved changes is written every N minutes
 *     to the auto-recover folder, and removed again when the document is saved or its changes are discarded. The
 *     shell decides the folder and names the copies after the document id (plus the document's file, when it has
 *     one), so two documents with the same name keep a copy each. Document Recovery lists these copies and opens one
 *     as an unsaved "(Recovered)" document. In the browser there is no folder: the copy after every change in the
 *     browser storage stays.
 *   - Save notification: a reminder when the document has had unsaved changes for N minutes, dismissed after
 *     N seconds.
 */
import type { Document } from '../core/document/types';
import { serializeDocument } from '../core/document/persistence';
import { desktop, getDocumentHandle, type RecoverEntry } from './desktop';
import { recoverSchedule } from './prefsEffects';
import { useStore } from './store';
import { TEST_HOOKS } from './testHooks';

/** the open documents with unsaved changes, each with the handle of its file (null: not saved yet) */
export function unsavedDocuments(): { doc: Document; handle: string | null }[] {
  const st = useStore.getState();
  if (!st.hasDocument) return [];
  const ctx = st.editContext;
  const out: { doc: Document; handle: string | null }[] = [];
  // Edit Component: the part being edited has no file of its own; the assembly it belongs to keeps the file
  if (st.dirty || ctx) out.push({ doc: st.doc, handle: ctx ? null : getDocumentHandle() });
  if (ctx) out.push({ doc: ctx.assembly, handle: getDocumentHandle() });
  return out.filter((o) => !!o.doc.id);
}

/** writes the auto-recover copies now (also used by the tests); false when nothing was written */
export async function writeAutoRecover(): Promise<boolean> {
  const api = desktop();
  if (!api?.writeRecover) return false;
  let written = 0;
  for (const { doc, handle } of unsavedDocuments()) {
    const data = new TextEncoder().encode(serializeDocument(doc)).buffer as ArrayBuffer;
    const r = await api.writeRecover({ id: doc.id!, name: doc.name, handle, data });
    if (r?.error) useStore.getState().pushMessage(`The auto-recover copy of ${doc.name} could not be written: ${r.error}`, 'warn');
    else if (r) written++;
  }
  return written > 0;
}

/** the document was saved: its copies (without a file, and at the files it was or is saved to) are no longer needed */
export function clearAutoRecover(doc: Document, handles: (string | null)[]): Promise<void> | null {
  const api = desktop();
  return doc.id && api?.removeRecover ? api.removeRecover({ id: doc.id, handles }).catch(() => {}) : null;
}

/** "Don't Save": the changes of the open documents are discarded, and so are their copies; null when there is nothing to remove */
export function discardAutoRecover(): Promise<void> | null {
  const removing = unsavedDocuments().map(({ doc, handle }) => clearAutoRecover(doc, [handle])).filter((p) => !!p);
  return removing.length ? Promise.all(removing).then(() => {}) : null;
}

export function listDiskRecovery(): Promise<RecoverEntry[]> {
  return desktop()?.listRecover?.() ?? Promise.resolve([]);
}

export async function readDiskRecovery(name: string): Promise<string | null> {
  const data = await desktop()?.readRecover?.(name);
  return data ? new TextDecoder().decode(data) : null;
}

let dirtySince = 0, lastRecover = 0, lastReminder = 0;

function tick(now: number): void {
  const st = useStore.getState();
  const dirty = st.hasDocument && (st.dirty || !!st.editContext);
  if (!dirty) { dirtySince = 0; return; }
  if (!dirtySince) dirtySince = now;
  // Options ▸ Backup/Recover: what is due now
  const due = recoverSchedule(now, dirtySince, lastRecover, lastReminder);
  if (due.recover) {
    lastRecover = now;
    void writeAutoRecover();
  }
  if (due.remind) {
    lastReminder = now;
    const n = Math.round((now - dirtySince) / 60_000);
    const text = `${st.doc.name} has not been saved for ${n} minute${n === 1 ? '' : 's'}.`;
    st.pushMessage(text, 'warn');
    setTimeout(() => useStore.setState((s) => ({ messages: s.messages.filter((m) => m.text !== text) })), due.dismissMs);
  }
}

/** at start: copies left behind (the program did not close normally) open the Document Recovery pane, by design */
async function announceRecovery(): Promise<void> {
  const list = await listDiskRecovery();
  if (!list.length) return;
  const st = useStore.getState();
  st.setTaskPane('recovery');
  st.pushMessage(`Document Recovery: ${list.length} auto-recover cop${list.length === 1 ? 'y' : 'ies'} of unsaved work found.`, 'info');
}

if (typeof window !== 'undefined') {
  setInterval(() => tick(Date.now()), 15_000);
  setTimeout(() => void announceRecovery(), 0);
  if (TEST_HOOKS) (window as unknown as Record<string, unknown>).__phlippoAutoRecover = { write: writeAutoRecover, list: listDiskRecovery };
}
