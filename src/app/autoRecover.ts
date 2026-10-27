/**
 * Tools ▸ Options ▸ Backup/Recover (QA v0.5.1 F112):
 *   - Auto-Recover: in the desktop app a copy of the open document with unsaved changes is written to the
 *     auto-recover folder every N minutes, and removed again when the document is saved. Document Recovery lists
 *     these copies. In the browser there is no folder: the copy after every change in the browser storage stays.
 *   - Save notification: a reminder when the document has had unsaved changes for N minutes, dismissed after
 *     N seconds.
 */
import { serializeDocument } from '../core/document/persistence';
import { desktop } from './desktop';
import { getPref } from './prefs';
import { useStore } from './store';

const folder = () => String(getPref('backup.autoRecoverFolder') ?? '');

/** writes the auto-recover copy now (also used by the tests); false when there is nothing to write */
export async function writeAutoRecover(): Promise<boolean> {
  const api = desktop(), st = useStore.getState();
  if (!api?.writeRecover || !st.hasDocument) return false;
  const data = new TextEncoder().encode(serializeDocument(st.doc)).buffer as ArrayBuffer;
  const r = await api.writeRecover({ folder: folder(), name: st.doc.name, data });
  if (r?.error) st.pushMessage(`The auto-recover copy could not be written: ${r.error}`, 'warn');
  return !!r && !r.error;
}

/** the document was saved: its auto-recover copy is no longer needed */
export function clearAutoRecover(name: string): void {
  desktop()?.removeRecover?.({ folder: folder(), name });
}

export function listDiskRecovery(): Promise<{ name: string; time: number }[]> {
  return desktop()?.listRecover?.(folder()) ?? Promise.resolve([]);
}

export async function readDiskRecovery(name: string): Promise<string | null> {
  const data = await desktop()?.readRecover?.({ folder: folder(), name });
  return data ? new TextDecoder().decode(data) : null;
}

let dirtySince = 0, lastRecover = 0, lastReminder = 0;

function tick(now: number): void {
  const st = useStore.getState();
  const dirty = st.hasDocument && st.dirty;
  if (!dirty) { dirtySince = 0; return; }
  if (!dirtySince) dirtySince = now;
  const minutes = (key: string) => Math.max(1, Number(getPref(key)) || 1) * 60_000;
  if (getPref('backup.autoRecover') !== false && now - Math.max(dirtySince, lastRecover) >= minutes('backup.autoRecoverMinutes')) {
    lastRecover = now;
    void writeAutoRecover();
  }
  if (getPref('backup.saveNotify') === true && now - Math.max(dirtySince, lastReminder) >= minutes('backup.saveNotifyMinutes')) {
    lastReminder = now;
    const n = Math.round((now - dirtySince) / 60_000);
    const text = `${st.doc.name} has not been saved for ${n} minute${n === 1 ? '' : 's'}.`;
    st.pushMessage(text, 'warn');
    const secs = Math.max(1, Number(getPref('backup.saveNotifySeconds')) || 5);
    setTimeout(() => useStore.setState((s) => ({ messages: s.messages.filter((m) => m.text !== text) })), secs * 1000);
  }
}

if (typeof window !== 'undefined') setInterval(() => tick(Date.now()), 15_000);
