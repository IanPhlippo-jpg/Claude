// Auto-Recover in the desktop shell (Options ▸ Backup/Recover, QA F112/F153/F154/F156).
//
// - The folder is decided here, never by the renderer: <profile>/autorecover, or a folder the user picked in the
//   folder dialog of this process (kept in <profile>/autorecover.json). The renderer sends no path at all.
// - One copy per document: the file name holds the document name (for the list) and a key made of the document id
//   and, when the document has a file, that file's path. Two documents with the same name never share a copy, and
//   a copied .kcad (same id, other path) has a copy of its own.
// - Every copy is written to a temp file, flushed to disk, then renamed over the previous copy.
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const { createHash } = require('node:crypto');

const RECOVER_SUFFIX = '.autorecover.kcad';
const DEFAULT_DIR_NAME = 'autorecover';
const SETTINGS_FILE = 'autorecover.json';

/** the copy's key: a hash of the document id and the path of its file ('' while it has none) */
function recoverKey(id, file) {
  return createHash('sha256').update(String(id ?? '')).update('\0').update(String(file ?? '')).digest('hex').slice(0, 16);
}
/** <document name>~<key>.autorecover.kcad; the name is only for the list and is cleaned of path characters */
function recoverFileName(name, key) {
  const shown = String(name ?? '').replace(/[^\w .()-]+/g, '_').replace(/^[ .]+|[ .]+$/g, '').slice(0, 80) || 'Document';
  return `${shown}~${key}${RECOVER_SUFFIX}`;
}
const isRecoverFile = (name) => typeof name === 'string' && name === path.basename(name) && /^[^\\/]+~[0-9a-f]{16}\.autorecover\.kcad$/.test(name);
/** the document name shown in Document Recovery (copies of older builds have no key) */
const recoverLabel = (name) => name.slice(0, -RECOVER_SUFFIX.length).replace(/~[0-9a-f]{16}$/, '');

/** the folder: the one chosen in the dialog (when it still is an absolute path), else <profile>/autorecover */
function recoverDir(userData) {
  try {
    const s = JSON.parse(fsSync.readFileSync(path.join(userData, SETTINGS_FILE), 'utf8'));
    if (typeof s?.folder === 'string' && path.isAbsolute(s.folder)) return path.normalize(s.folder);
  } catch { /* no choice made */ }
  return path.join(userData, DEFAULT_DIR_NAME);
}

/** temp file, flushed to disk, renamed over the target: a crash leaves the old copy or the new one, never half */
async function writeSynced(file, data) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    const fh = await fs.open(tmp, 'w');
    try {
      await fh.writeFile(Buffer.from(data));
      await fh.sync();
    } finally {
      await fh.close();
    }
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
}

/** removes the copies of these keys (any document name) */
async function removeKeys(dir, keys) {
  let names = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return;
  }
  for (const n of names) if (isRecoverFile(n) && keys.some((k) => n.endsWith(`~${k}${RECOVER_SUFFIX}`))) await fs.rm(path.join(dir, n), { force: true }).catch(() => {});
}

/**
 * The recover:* IPC. `pathOf(handle)` gives the file of a handle this process handed out (or null); `trusted(e)`
 * checks the sender; `getWin()` the window for the folder dialog.
 */
function registerRecover({ ipcMain, dialog, app, trusted, getWin, pathOf, maxBytes }) {
  const userData = () => app.getPath('userData');
  const dir = () => recoverDir(userData());
  const keyOf = (id, handle) => recoverKey(id, handle ? pathOf(handle) ?? '' : '');
  const validId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 200;

  ipcMain.handle('recover:write', async (e, opts) => {
    if (!trusted(e)) return null;
    const { id, name, handle, data } = opts ?? {};
    if (!validId(id)) return { error: 'The document has no id.' };
    if (!(data instanceof ArrayBuffer) || data.byteLength > maxBytes) return { error: 'The document is too large.' };
    const d = dir(), key = keyOf(id, handle), file = path.join(d, recoverFileName(name, key));
    try {
      await fs.mkdir(d, { recursive: true });
      await writeSynced(file, data);
      // a renamed document: its older copy (other name, same key) goes
      for (const n of await fs.readdir(d)) if (n !== path.basename(file) && isRecoverFile(n) && n.endsWith(`~${key}${RECOVER_SUFFIX}`)) await fs.rm(path.join(d, n), { force: true }).catch(() => {});
      return { name: path.basename(file) };
    } catch (err) {
      return { error: String(err.message ?? err) };
    }
  });
  ipcMain.handle('recover:list', async (e) => {
    if (!trusted(e)) return [];
    const d = dir();
    try {
      const names = (await fs.readdir(d)).filter(isRecoverFile);
      const out = [];
      for (const n of names) out.push({ name: n, label: recoverLabel(n), time: (await fs.stat(path.join(d, n))).mtimeMs });
      return out.sort((a, b) => b.time - a.time);
    } catch {
      return [];
    }
  });
  ipcMain.handle('recover:read', async (e, name) => {
    if (!trusted(e) || !isRecoverFile(name)) return null;
    try {
      const buf = await fs.readFile(path.join(dir(), name));
      if (buf.byteLength > maxBytes) return null;
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch {
      return null;
    }
  });
  // the document was saved or its changes discarded: the copy without a file and the copies at its files go
  ipcMain.handle('recover:remove', async (e, opts) => {
    if (!trusted(e)) return;
    const { id, handles } = opts ?? {};
    if (!validId(id)) return;
    const keys = [recoverKey(id, ''), ...(Array.isArray(handles) ? handles : []).filter((h) => typeof h === 'string' && h).map((h) => keyOf(id, h))];
    await removeKeys(dir(), keys);
  });
  ipcMain.handle('recover:folder', (e) => (trusted(e) ? { folder: dir(), custom: dir() !== path.join(userData(), DEFAULT_DIR_NAME) } : null));
  // Options ▸ Backup/Recover ▸ Browse…: the folder dialog of this process; the choice is kept in the profile
  ipcMain.handle('recover:chooseFolder', async (e) => {
    const win = getWin();
    if (!trusted(e) || !win) return null;
    const r = await dialog.showOpenDialog(win, { title: 'Auto-recover folder', defaultPath: dir(), properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths.length || !path.isAbsolute(r.filePaths[0])) return null;
    await fs.mkdir(userData(), { recursive: true });
    await writeSynced(path.join(userData(), SETTINGS_FILE), new TextEncoder().encode(JSON.stringify({ folder: path.normalize(r.filePaths[0]) })));
    return { folder: dir(), custom: true };
  });
  ipcMain.handle('recover:resetFolder', async (e) => {
    if (!trusted(e)) return null;
    await fs.rm(path.join(userData(), SETTINGS_FILE), { force: true }).catch(() => {});
    return { folder: dir(), custom: false };
  });
}

module.exports = { registerRecover, recoverKey, recoverFileName, recoverLabel, isRecoverFile, recoverDir, writeSynced, RECOVER_SUFFIX };
