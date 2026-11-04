// Backup copies of a saved document (Tools ▸ Options ▸ Backup/Recover, QA v0.5.11 F112): the previous file is kept as
// file.bak, the one before as file.bak2 and so on up to the number of copies; with "Remove backups older than" the
// older copies past that age go (the newest backup always stays). No Electron dependency: tested in src/app.
const fs = require('node:fs/promises');

const MAX_COPIES = 10;
/** the name of backup i (1 = the newest): file.bak, file.bak2, file.bak3 … */
const bakName = (file, i) => `${file}.bak${i === 1 ? '' : i}`;

/** keep the current file as file.bak before it is replaced; `copies` backups are kept (2 by default) */
async function rotateBackups(file, copies = 2, removeDays = 0) {
  const n = Math.max(1, Math.min(MAX_COPIES, Math.round(Number(copies)) || 2));
  for (let i = n; i <= MAX_COPIES; i++) await fs.rm(bakName(file, i), { force: true });
  for (let i = n - 1; i >= 1; i--) {
    try {
      await fs.rename(bakName(file, i), bakName(file, i + 1));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  await fs.copyFile(file, bakName(file, 1));
  const days = Number(removeDays);
  if (days > 0) {
    const limit = Date.now() - days * 86_400_000;
    for (let i = 2; i <= n; i++) {
      const st = await fs.stat(bakName(file, i)).catch(() => null);
      if (st && st.mtimeMs < limit) await fs.rm(bakName(file, i), { force: true });
    }
  }
}

module.exports = { rotateBackups, bakName, MAX_COPIES };
