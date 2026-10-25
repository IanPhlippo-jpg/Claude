// Phlippo CAD desktop shell: one frameless window (the app draws its own title row with the
// window buttons, as the original), native file dialogs for Open / Save As, and nothing else.
//
// Safety rules of this process:
// - the renderer never names a path: Save writes only to a path this process handed out itself
//   (a dialog result or the file the app was started with);
// - every write is atomic (temp file, then rename) and keeps the previous file as .bak;
// - the window never navigates away from the app and opens no child windows;
// - IPC is only taken from the app's own frame.
const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const SMOKE = process.env.PHLIPPO_SMOKE; // path of a screenshot to write, then quit (used by the checks)
const E2E = process.env.PHLIPPO_E2E === '1'; // the test hooks (window.__phlippoStore …) only exist with this
const APP_INDEX = path.join(__dirname, '..', 'dist', 'index.html');
const MAX_FILE_BYTES = 64 * 1024 * 1024;

/** @type {BrowserWindow | null} */
let win = null;
/** paths this process chose (dialogs, the file the app was started with): the only paths Save may write to */
const knownPaths = new Set();
/** the renderer says whether the document has unsaved changes; closing then asks first */
let dirty = false;
let forceClose = false;
/** a .kcad from the command line (file association) waits here until the window is ready */
let pendingOpen = kcadFromArgv(process.argv);

function kcadFromArgv(argv) {
  return argv.slice(1).find((a) => /\.kcad$/i.test(a) && !a.startsWith('-')) ?? null;
}

/** IPC only from the app's own frame: the dev server or the packaged index.html */
function trusted(e) {
  const url = e.senderFrame?.url ?? '';
  if (DEV_URL) return url.startsWith(DEV_URL);
  return url.startsWith('file://') && decodeURIComponent(url).replace(/^file:\/\/\/?/, '').replace(/\//g, path.sep).toLowerCase().includes(path.join('dist', 'index.html').toLowerCase());
}

async function readForOpen(file) {
  const stat = await fs.stat(file);
  if (stat.size > MAX_FILE_BYTES) throw new Error(`The file is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`);
  const data = await fs.readFile(file);
  knownPaths.add(file);
  return { name: path.basename(file), path: file, data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
}

/** write the new contents next to the file, keep the old file as .bak, then swap: a failed save never damages the original */
async function atomicWrite(file, data) {
  const tmp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(tmp, Buffer.from(data));
  try {
    await fs.copyFile(file, `${file}.bak`);
  } catch {
    /* no previous file */
  }
  await fs.rename(tmp, file);
}

function sendOpen(file) {
  if (!win) return;
  readForOpen(file)
    .then((f) => win && win.webContents.send('file:opened', f))
    .catch((err) => win && win.webContents.send('file:opened', { name: path.basename(file), path: file, error: String(err.message ?? err) }));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    frame: false,
    backgroundColor: '#ffffff',
    title: 'Phlippo CAD',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: E2E ? ['--phlippo-e2e'] : [],
    },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => {
    if (!win) return;
    if (!SMOKE) win.maximize();
    win.show();
  });
  win.on('maximize', () => win && win.webContents.send('win:state', { maximized: true }));
  win.on('unmaximize', () => win && win.webContents.send('win:state', { maximized: false }));
  // unsaved changes: the app asks (Save / Don't Save / Cancel) and closes again with force
  win.on('close', (e) => {
    if (dirty && !forceClose && !SMOKE) {
      e.preventDefault();
      win && win.webContents.send('win:closeRequested');
    }
  });
  win.on('closed', () => {
    win = null;
  });
  // no child windows; http(s) links go to the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // the window shows the app and nothing else
  win.webContents.on('will-navigate', (e, url) => {
    const own = DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!own) e.preventDefault();
  });
  win.webContents.on('will-redirect', (e) => e.preventDefault());
  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(APP_INDEX);
  win.webContents.once('did-finish-load', async () => {
    if (pendingOpen) {
      sendOpen(pendingOpen);
      pendingOpen = null;
    }
    if (SMOKE) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const img = await win.webContents.capturePage();
        await fs.writeFile(SMOKE, img.toPNG());
        console.log('smoke screenshot written to ' + SMOKE);
      } catch (err) {
        console.error('smoke failed: ' + err);
      }
      app.quit();
    }
  });
}

// one running app: a second .kcad double-click opens in the existing window
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const file = kcadFromArgv(argv);
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      if (file) sendOpen(file);
    } else pendingOpen = file;
  });
  app.on('open-file', (e, file) => {
    e.preventDefault();
    if (win) sendOpen(file);
    else pendingOpen = file;
  });
}

app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (e) => e.preventDefault());
});

// window controls from the app's own title row
ipcMain.handle('win:minimize', (e) => trusted(e) && win && win.minimize());
ipcMain.handle('win:toggleMaximize', (e) => {
  if (!trusted(e) || !win) return false;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
  return win.isMaximized();
});
ipcMain.handle('win:isMaximized', (e) => trusted(e) && !!win && win.isMaximized());
ipcMain.handle('win:close', (e, force) => {
  if (!trusted(e) || !win) return;
  forceClose = !!force;
  win.close();
});
ipcMain.on('doc:dirty', (e, value) => {
  if (trusted(e)) dirty = !!value;
});

// files: native dialogs; the renderer only sees names and contents
ipcMain.handle('file:open', async (e, filters) => {
  if (!trusted(e) || !win) return null;
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters });
  if (r.canceled || !r.filePaths.length) return null;
  try {
    return await readForOpen(r.filePaths[0]);
  } catch (err) {
    return { name: path.basename(r.filePaths[0]), path: r.filePaths[0], error: String(err.message ?? err) };
  }
});
ipcMain.handle('file:save', async (e, { defaultPath, filters, data, path: known }) => {
  if (!trusted(e) || !win) return null;
  // the renderer may only name a path this process handed out before; anything else goes through the dialog
  let file = known && knownPaths.has(known) ? known : null;
  if (!file) {
    const r = await dialog.showSaveDialog(win, { defaultPath, filters });
    if (r.canceled || !r.filePath) return null;
    file = r.filePath;
  }
  try {
    await atomicWrite(file, data);
    knownPaths.add(file);
    return { name: path.basename(file), path: file };
  } catch (err) {
    return { name: path.basename(file), path: file, error: String(err.message ?? err) };
  }
});
ipcMain.handle('file:saveAs', async (e, { defaultPath, filters, data }) => {
  if (!trusted(e) || !win) return null;
  const r = await dialog.showSaveDialog(win, { defaultPath, filters });
  if (r.canceled || !r.filePath) return null;
  try {
    await atomicWrite(r.filePath, data);
    knownPaths.add(r.filePath);
    return { name: path.basename(r.filePath), path: r.filePath };
  } catch (err) {
    return { name: path.basename(r.filePath), path: r.filePath, error: String(err.message ?? err) };
  }
});

app.whenReady().then(() => {
  // the packaged app loads from file://; the same Content-Security-Policy as the built index.html carries
  if (!DEV_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"] } });
    });
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
