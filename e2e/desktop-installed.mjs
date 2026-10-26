// Smoke test of the installed program (NSIS install in %LOCALAPPDATA%\Programs\Phlippo CAD), as a user gets it: no test
// hooks, no debugging port (QA v0.3.4 F85), so it is driven from the outside only. It starts and shows its window, the
// file version matches package.json, the licence files are installed (F73, F91), and a start with
// --remote-debugging-port is refused. The functional checks without hooks run on the same release build in
// desktop-nohooks.mjs. Run after installing; nothing in the user's profile is changed (the app only shows Welcome).
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checks, exitCode } from './lib/check.mjs';

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

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results);
