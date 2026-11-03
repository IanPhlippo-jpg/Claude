// Smoke test of the installed program (NSIS install in %LOCALAPPDATA%\Programs\Phlippo CAD), as a user gets it: no test
// hooks, no debugging port (QA v0.3.4 F85), so it is driven from the outside only. It starts and shows its window, the
// file version matches package.json, the licence files are installed (F73, F91), and a start with
// --remote-debugging-port is refused, and --self-test (sketch, extrude, fillet and STEP on the B-rep kernel, an atomic
// save) passes in a throw-away profile.
// More functional checks without hooks run on the release build in desktop-nohooks.mjs.
// Run after installing; nothing in the user's profile is changed (the app only shows Welcome).
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checks, exitCode } from './lib/check.mjs';
import { logHead } from './lib/provenance.mjs';

const exe = process.env.PHLIPPO_EXE ?? join(process.env.LOCALAPPDATA, 'Programs', 'Phlippo CAD', 'Phlippo CAD.exe');
const dir = join(exe, '..');
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const { results, check } = checks();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ps = (cmd) => execFileSync('powershell.exe', ['-NoProfile', '-Command', cmd], { encoding: 'utf8' }).trim();
mkdirSync('e2e-out', { recursive: true });

check('the program is installed', existsSync(exe), exe);
const fileVersion = ps(`(Get-Item '${exe.replace(/'/g, "''")}').VersionInfo.ProductVersion`);
check(`the installed program is version ${version}`, fileVersion.startsWith(version), fileVersion);
check('LICENSE.txt and THIRD-PARTY-NOTICES.txt are installed', existsSync(join(dir, 'LICENSE.txt')) && existsSync(join(dir, 'THIRD-PARTY-NOTICES.txt')));
check('the Chromium licences ship with it (LICENSES.chromium.html, F91)', existsSync(join(dir, 'LICENSES.chromium.html')));
check('THIRD-PARTY-NOTICES points to the Chromium licences', /LICENSES\.chromium\.html/.test(readFileSync(join(dir, 'THIRD-PARTY-NOTICES.txt'), 'utf8')));

// the Electron fuses of the installed exe are those of the build config (QA 0.5.11 F196): no run-as-node, no
// NODE_OPTIONS, no inspector arguments, the asar integrity checked, the app only from the asar
try {
  const { getCurrentFuseWire, FuseV1Options } = await import('@electron/fuses');
  const wire = await getCurrentFuseWire(exe);
  const want = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).build.electronFuses;
  const bad = Object.entries(want).filter(([k, on]) => {
    const idx = FuseV1Options[k.charAt(0).toUpperCase() + k.slice(1)];
    return idx === undefined || wire[idx] !== (on ? 49 : 48);
  });
  check('the Electron fuses are set as configured', bad.length === 0, bad.length ? `differ: ${bad.map(([k]) => k).join(', ')}` : Object.keys(want).join(', '));
} catch (err) {
  check('the Electron fuses are set as configured', false, String(err.message ?? err));
}

// a normal start: the window appears with its title
const app = spawn(exe, [], { stdio: 'ignore', detached: false });
let title = '';
for (let i = 0; i < 40 && !title; i++) {
  await sleep(500);
  try { title = ps(`(Get-Process -Id ${app.pid} -ErrorAction Stop).MainWindowTitle`); } catch { /* not up yet */ }
}
check('the installed program starts and shows its window', /Phlippo CAD/.test(title), title || 'no window');
await sleep(2500);
try {
  ps(`Add-Type -AssemblyName System.Windows.Forms, System.Drawing; $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $img = New-Object System.Drawing.Bitmap $b.Width, $b.Height; $g = [System.Drawing.Graphics]::FromImage($img); $g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); $img.Save('${join(process.cwd(), 'e2e-out', 'desktop-installed.png').replace(/'/g, "''")}'); 'ok'`);
} catch { /* a screenshot is evidence only */ }
check('the program is still running after start-up (no crash)', app.exitCode === null);
app.kill();
await sleep(1000);

// a start with a debugging port is refused: the process ends at once and the port stays closed (F85)
const dbg = spawn(exe, ['--remote-debugging-port=9333'], { stdio: 'ignore' });
let ended = null;
dbg.on('exit', (code) => { ended = code; });
await sleep(4000);
const portOpen = await fetch('http://127.0.0.1:9333/json/version').then(() => true, () => false);
check('--remote-debugging-port is refused: the program exits with code 1', ended === 1, `exit ${ended}`);
check('--remote-debugging-port is refused: no debugging endpoint', !portOpen);
if (ended === null) dbg.kill();

// --self-test (F97): the installed program itself loads app:// and the OpenCascade WASM worker, builds a plate, makes it
// exact, adds an exact fillet, writes STEP and saves the .kcad atomically, all in a throw-away profile
const resultFile = join(process.env.TEMP ?? process.env.TMP, 'phlippo-self-test.json');
rmSync(resultFile, { force: true });
// a machine without a graphics card (a CI runner) adds --software-gl through PHLIPPO_SELFTEST_ARGS
const st = spawn(exe, ['--self-test', ...(process.env.PHLIPPO_SELFTEST_ARGS ?? '').split(' ').filter(Boolean)], { stdio: 'ignore' });
const stExit = await new Promise((r) => { const t = setTimeout(() => { st.kill(); r('timeout'); }, 240000); st.on('exit', (code) => { clearTimeout(t); r(code); }); });
const selfTest = existsSync(resultFile) ? JSON.parse(readFileSync(resultFile, 'utf8')) : null;
check('--self-test runs and exits with code 0', stExit === 0 && !!selfTest, `exit ${stExit}`);
check('--self-test ran in the installed program on app://', !!selfTest && selfTest.packaged === true && selfTest.version === version && selfTest.url === 'app://phlippo/index.html', JSON.stringify(selfTest && { packaged: selfTest.packaged, version: selfTest.version, url: selfTest.url }));
// the installed build names the commit it was built from (F97): a clean tree, so the log head and the build agree
check('the installed build names a clean commit', !!selfTest && /^[0-9a-f]{7,}$/.test(selfTest.commit ?? ''), `build commit ${selfTest?.commit ?? 'none'}`);
for (const s of selfTest?.steps ?? []) check(`self-test: ${s.name}`, s.ok, s.info ?? '');
if (selfTest?.dir) {
  try { copyFileSync(join(selfTest.dir, 'self-test.png'), join('e2e-out', 'desktop-selftest.png')); } catch { /* evidence only */ }
  rmSync(selfTest.dir, { recursive: true, force: true });
}

const summary = `${results.filter((r) => r.ok).length}/${results.length} checks passed`;
console.log(`\n${summary}`);
// the evidence file (QA 0.5.11, F97): version, commit, platform, time, the installed exe and every check by name
const lines = results.map((r) => `${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.info ? ` (${String(r.info).replace(/\s+/g, ' ').slice(0, 200)})` : ''}`);
writeFileSync(join('e2e-out', `desktop-installed-${version}.txt`), `${logHead('desktop-installed', version)}exe ${exe} (file version ${fileVersion})\n\n${lines.join('\n')}\n\n${summary}\n`);
process.exitCode = exitCode(results);
