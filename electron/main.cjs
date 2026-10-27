// Phlippo CAD desktop shell: one frameless window (the app draws its own title row with the
// window buttons, as the original), native file dialogs for Open / Save As, and nothing else.
//
// Safety rules of this process:
// - the renderer never names a path: Save writes only to a path this process handed out itself
//   (a dialog result or the file the app was started with);
// - every write is atomic (temp file, then rename) and keeps the previous file as .bak;
// - the window never navigates away from the app and opens no child windows;
// - IPC is only taken from the app's own frame.
const { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');

// the development switches (dev server, smoke screenshot, test hooks) are only read by an unpackaged app:
// the installed program ignores its environment
const PACKAGED = app.isPackaged;
// the installed program refuses the debugging switches (F85): with --remote-debugging-port any local process could
// drive the window and its save bridge. The fuse covers --inspect for Node; these are Chromium switches.
if (PACKAGED && process.argv.some((a) => /^--(remote-debugging-(port|pipe|address)|inspect(-brk|-port)?|js-flags|remote-allow-origins)\b/i.test(a))) {
  console.error('Phlippo CAD: debugging switches are not accepted by the installed program.');
  app.exit(1);
}
const DEV_URL = PACKAGED ? undefined : process.env.VITE_DEV_SERVER_URL;
// --self-test (QA F97): the installed program checks itself (app://, the OpenCascade WASM worker, extrude, fillet, STEP,
// an atomic save) in a throw-away profile, writes the result to %TEMP%\phlippo-self-test.json and quits. The user's
// profile and documents are never touched; it takes no path from the command line.
const SELF_TEST = process.argv.includes('--self-test');
const SELF_TEST_DIR = SELF_TEST ? require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(), 'phlippo-self-test-')) : null;
if (SELF_TEST) app.setPath('userData', path.join(SELF_TEST_DIR, 'profile'));
// the desktop checks run in a profile of their own, never in the user's (unpackaged shell only)
if (!PACKAGED && process.env.PHLIPPO_USER_DATA) app.setPath('userData', process.env.PHLIPPO_USER_DATA);
const SMOKE = PACKAGED ? undefined : process.env.PHLIPPO_SMOKE; // path of a screenshot to write, then quit (used by the checks)
const E2E = !PACKAGED && process.env.PHLIPPO_E2E === '1'; // the test hooks (window.__phlippoStore …) only exist with this
const APP_DIST = path.join(__dirname, '..', 'dist');
const APP_INDEX = path.join(APP_DIST, 'index.html');
// the app is served from its own scheme instead of file:// (F88): a page on app://phlippo cannot read other local
// files, and the Content-Security-Policy below is sent as a real header
const APP_ORIGIN = 'app://phlippo';
const APP_URL = `${APP_ORIGIN}/index.html`;
const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
// the OpenCascade worker (STEP import/export, QA F51): its Emscripten glue builds functions at run time, which needs
// 'unsafe-eval'. Only that worker gets it; a worker keeps the policy of its own script, so the page stays strict.
const CSP_OCCT_WORKER = CSP.replace("script-src 'self' 'wasm-unsafe-eval'", "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'");
const isOcctWorker = (file) => /^occt\.worker-[\w-]+\.js$/.test(path.basename(file));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.txt': 'text/plain', '.hdr': 'application/octet-stream' };
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
/** https links the app may hand to the system browser (Help ▸ …); everything else is dropped */
const EXTERNAL_ALLOW = [/^https:\/\/github\.com\//i, /^https:\/\/(www\.)?phlippo\.be\//i];
// no application menu: the app draws its own menu bar, and the default menu would offer DevTools and Reload
Menu.setApplicationMenu(null);
const MAX_FILE_BYTES = 64 * 1024 * 1024;

/** @type {BrowserWindow | null} */
let win = null;
/** paths this process chose (dialogs, the file the app was started with), by an opaque handle: the renderer only ever sees the handle */
const handles = new Map();
const pathHandles = new Map();
function handleOf(file) {
  let h = pathHandles.get(file);
  if (!h) {
    h = randomUUID();
    handles.set(h, file);
    pathHandles.set(file, h);
  }
  return h;
}
/** the renderer says whether the document has unsaved changes; closing then asks first */
let dirty = false;
let forceClose = false;
/** a .kcad from the command line (file association) waits here until the window is ready */
let pendingOpen = kcadFromArgv(process.argv);

function kcadFromArgv(argv) {
  return argv.slice(1).find((a) => /\.kcad$/i.test(a) && !a.startsWith('-')) ?? null;
}

/** IPC only from the app's own top frame: exactly the dev server page or the packaged index.html (no other file:// page) */
function ownUrl(url) {
  const u = String(url || '').split('#')[0];
  if (DEV_URL) {
    try {
      const a = new URL(u), b = new URL(DEV_URL);
      return a.origin === b.origin && (a.pathname === '/' || a.pathname === b.pathname);
    } catch {
      return false;
    }
  }
  const p = u.split('?')[0];
  return p === APP_URL || p === `${APP_ORIGIN}/`;
}
function trusted(e) {
  const frame = e.senderFrame;
  if (!frame || frame.parent) return false; // only the top frame
  return !!win && e.sender === win.webContents && ownUrl(frame.url);
}

async function readForOpen(file) {
  const stat = await fs.stat(file);
  if (stat.size > MAX_FILE_BYTES) throw new Error(`The file is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`);
  const data = await fs.readFile(file);
  return { name: path.basename(file), handle: handleOf(file), data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
}

/**
 * Write the new contents next to the file (flushed to disk), keep the previous file as .bak and the one before as
 * .bak2, then swap. A failed save never damages the original and leaves no temp file; a backup that could not be
 * made is reported (warning) instead of ignored.
 */
async function atomicWrite(file, data) {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  let warning;
  try {
    const fh = await fs.open(tmp, 'w');
    try {
      await fh.writeFile(Buffer.from(data));
      await fh.sync();
    } finally {
      await fh.close();
    }
    let hadPrevious = true;
    try {
      await fs.access(file);
    } catch {
      hadPrevious = false;
    }
    if (hadPrevious) {
      try {
        await fs.rm(`${file}.bak2`, { force: true });
        try {
          await fs.rename(`${file}.bak`, `${file}.bak2`);
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
        }
        await fs.copyFile(file, `${file}.bak`);
      } catch (err) {
        warning = `the backup copy (.bak) could not be made: ${err.message ?? err}`;
      }
    }
    await fs.rename(tmp, file);
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
  return warning;
}

function sendOpen(file) {
  if (!win) return;
  readForOpen(file)
    .then((f) => win && win.webContents.send('file:opened', f))
    .catch((err) => win && win.webContents.send('file:opened', { name: path.basename(file), handle: '', error: String(err.message ?? err) }));
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
      // the installed program has no developer tools (F67); the development shell keeps them
      devTools: !PACKAGED,
      additionalArguments: E2E ? ['--phlippo-e2e'] : [],
    },
  });
  win.setMenuBarVisibility(false);
  const showWhenReady = () => win && win.once('ready-to-show', () => {
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
  // no child windows; only allow-listed https links go to the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (EXTERNAL_ALLOW.some((re) => re.test(url))) shell.openExternal(url);
    return { action: 'deny' };
  });
  // the window shows the app and nothing else: no navigation at all (a dropped .html, a typed URL, a redirect)
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('will-redirect', (e) => e.preventDefault());
  win.webContents.on('will-frame-navigate', (e) => e.preventDefault());
  // DevTools shortcuts (Ctrl+Shift+I, F12) do nothing in the installed program
  win.webContents.on('before-input-event', (e, input) => {
    if (PACKAGED && input.type === 'keyDown' && ((input.control && input.shift && /^[IJC]$/i.test(input.key)) || input.key === 'F12')) e.preventDefault();
  });
  if (DEV_URL) {
    showWhenReady();
    win.loadURL(DEV_URL);
  } else {
    showWhenReady();
    win.loadURL(APP_URL);
  }
  const onAppLoaded = async () => {
    if (pendingOpen) {
      sendOpen(pendingOpen);
      pendingOpen = null;
    }
    if (SELF_TEST) {
      win.webContents.send('self-test:run');
      // a renderer that never answers still ends the run, with a failed result
      setTimeout(() => finishSelfTest({ steps: [{ name: 'the app answered the self-test', ok: false, info: 'no answer within 180 s' }] }), 180_000);
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
  };
  win.webContents.once('did-finish-load', onAppLoaded);
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
    return { name: path.basename(r.filePaths[0]), handle: '', error: String(err.message ?? err) };
  }
});
ipcMain.handle('file:save', async (e, { defaultPath, filters, data, handle: known }) => {
  if (!trusted(e) || !win) return null;
  if (!(data instanceof ArrayBuffer) || data.byteLength > MAX_FILE_BYTES) return { name: String(defaultPath ?? ''), handle: '', error: 'The document is too large to save.' };
  // the renderer may only name a handle this process handed out before; anything else goes through the dialog
  let file = typeof known === 'string' && handles.has(known) ? handles.get(known) : null;
  if (!file) {
    const r = await dialog.showSaveDialog(win, { defaultPath: path.basename(String(defaultPath ?? 'Part1.kcad')), filters });
    if (r.canceled || !r.filePath) return null;
    file = r.filePath;
  }
  try {
    const warning = await atomicWrite(file, data);
    return { name: path.basename(file), handle: handleOf(file), warning };
  } catch (err) {
    return { name: path.basename(file), handle: '', error: String(err.message ?? err) };
  }
});
ipcMain.handle('file:saveAs', async (e, { defaultPath, filters, data }) => {
  if (!trusted(e) || !win) return null;
  if (!(data instanceof ArrayBuffer) || data.byteLength > MAX_FILE_BYTES) return { name: String(defaultPath ?? ''), handle: '', error: 'The document is too large to save.' };
  const r = await dialog.showSaveDialog(win, { defaultPath: path.basename(String(defaultPath ?? 'Part1.kcad')), filters });
  if (r.canceled || !r.filePath) return null;
  try {
    const warning = await atomicWrite(r.filePath, data);
    return { name: path.basename(r.filePath), handle: handleOf(r.filePath), warning };
  } catch (err) {
    return { name: path.basename(r.filePath), handle: '', error: String(err.message ?? err) };
  }
});

/** app://phlippo/<path>: a file of dist/, never outside it, with its type and the Content-Security-Policy */
function serveApp(request) {
  let rel;
  try {
    const u = new URL(request.url);
    if (u.host !== 'phlippo') return new Response('Not found', { status: 404 });
    rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
  } catch {
    return new Response('Bad request', { status: 400 });
  }
  const file = path.normalize(path.join(APP_DIST, rel));
  if (file !== APP_DIST && !file.startsWith(APP_DIST + path.sep)) return new Response('Forbidden', { status: 403 });
  return fs.readFile(file).then(
    (data) => new Response(data, { status: 200, headers: { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Content-Security-Policy': isOcctWorker(file) ? CSP_OCCT_WORKER : CSP, 'X-Content-Type-Options': 'nosniff' } }),
    () => new Response('Not found', { status: 404 }),
  );
}

let selfTestDone = false;
/** writes the self-test result (with the save and the screenshot checks of this process) and quits */
async function finishSelfTest(result) {
  if (selfTestDone) return;
  selfTestDone = true;
  const steps = Array.isArray(result?.steps) ? result.steps.slice(0, 50) : [];
  if (typeof result?.kcad === 'string' && result.kcad) {
    try {
      const file = path.join(SELF_TEST_DIR, 'SelfTest.kcad');
      await atomicWrite(file, result.kcad);
      await atomicWrite(file, result.kcad);
      const back = await fs.readFile(file, 'utf8');
      const bak = await fs.readFile(`${file}.bak`, 'utf8');
      steps.push({ name: 'Save writes the .kcad atomically and keeps a .bak', ok: back === result.kcad && bak === result.kcad });
    } catch (err) {
      steps.push({ name: 'Save writes the .kcad atomically and keeps a .bak', ok: false, info: String(err.message ?? err) });
    }
  }
  try {
    if (win && !win.isDestroyed()) await fs.writeFile(path.join(SELF_TEST_DIR, 'self-test.png'), (await win.webContents.capturePage()).toPNG());
  } catch { /* the screenshot is evidence only */ }
  const out = { version: app.getVersion(), packaged: PACKAGED, url: win && !win.isDestroyed() ? win.webContents.getURL() : '', dir: SELF_TEST_DIR, steps };
  await fs.writeFile(path.join(require('node:os').tmpdir(), 'phlippo-self-test.json'), JSON.stringify(out, null, 1)).catch(() => {});
  app.exit(steps.length && steps.every((x) => x.ok) ? 0 : 1);
}
ipcMain.on('self-test:done', (e, result) => {
  if (SELF_TEST && trusted(e)) void finishSelfTest(result);
});

app.whenReady().then(async () => {
  // permissions (camera, microphone, notifications, …): none is ever granted (F87)
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, cb) => cb(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  if (!DEV_URL) {
    protocol.handle('app', serveApp);
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
