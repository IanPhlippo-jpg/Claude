// Line coverage of src/core without an extra package (QA 0.5.14 advice P3-10).
//   node tools/coverage/report.mjs [vitest arguments …]   (npm run test:coverage)
// Runs `npm test` (vitest) with tools/coverage/vitest.config.ts: every worker records V8's precise coverage through the
// built-in inspector (setup.ts). This script maps the counts back to the lines of the .ts files with the inline source
// map vite puts in each module, merges the workers (a line is covered when any worker ran it), prints a table per
// folder of src/core and writes coverage/core.json. A line counts as executable when the source map points code at it.
// It reports; it is not a gate (a minimum can be added once the numbers are known).
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const dir = join(os.tmpdir(), `phlippo-coverage-${process.pid}`);
if (!process.env.KEEP_COV) rmSync(dir, { recursive: true, force: true });
const run = spawnSync('npx', ['vitest', 'run', '--config', 'tools/coverage/vitest.config.ts', ...process.argv.slice(2)], {
  cwd: root, stdio: 'inherit', shell: process.platform === 'win32', env: { ...process.env, PHLIPPO_COVERAGE_DIR: dir },
});

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** the source-map segments [generated line, generated column, source line] (VLQ, version 3) */
function segments(mappings) {
  const out = [];
  let srcLine = 0, srcCol = 0, src = 0, name = 0;
  mappings.split(';').forEach((line, gl) => {
    let gc = 0;
    for (const seg of line.split(',')) {
      if (!seg) continue;
      const v = [];
      let shift = 0, value = 0;
      for (const ch of seg) {
        const d = B64.indexOf(ch);
        value += (d & 31) << shift;
        if (d & 32) shift += 5;
        else { v.push(value & 1 ? -(value >>> 1) : value >>> 1); value = 0; shift = 0; }
      }
      gc += v[0];
      if (v.length >= 4) {
        src += v[1]; srcLine += v[2]; srcCol += v[3];
        if (v.length >= 5) name += v[4];
        out.push([gl, gc, srcLine]);
      }
    }
  });
  return out;
}

/** file → Map(line → covered) over all workers */
const files = new Map();
let parts = 0;
for (const f of (() => { try { return readdirSync(dir); } catch { return []; } })()) {
  for (const s of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
    parts++;
    const file = relative(root, fileURLToPath(s.url.split('?')[0])).split('\\').join('/');
    // vite's inline map (the runner wraps the module, so the comment is not the last thing in the source)
    const m = [...s.source.matchAll(/\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,([A-Za-z0-9+/=]+)/g)].at(-1);
    if (!m) continue;
    const map = JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
    if (typeof map.mappings !== 'string') continue;
    // the count of every character: V8 lists a function's block ranges outer first, so later ranges overwrite
    const count = new Int32Array(s.source.length).fill(-1);
    for (const ranges of s.functions) for (const r of ranges) count.fill(r.count, r.startOffset, Math.min(r.endOffset, s.source.length));
    const lineStart = [0];
    for (let i = 0; i < s.source.length; i++) if (s.source.charCodeAt(i) === 10) lineStart.push(i + 1);
    const lines = files.get(file) ?? new Map();
    for (const [gl, gc, sl] of segments(map.mappings)) {
      const at = (lineStart[gl] ?? s.source.length) + gc;
      const c = count[at] ?? -1;
      if (c < 0) continue;
      lines.set(sl + 1, (lines.get(sl + 1) ?? false) || c > 0);
    }
    files.set(file, lines);
  }
}
if (!process.env.KEEP_COV) rmSync(dir, { recursive: true, force: true });

const byFolder = new Map();
const perFile = [];
let total = 0, hit = 0;
for (const [file, lines] of [...files].sort()) {
  const n = lines.size, h = [...lines.values()].filter(Boolean).length;
  perFile.push({ file, lines: n, covered: h, pct: n ? Math.round((1000 * h) / n) / 10 : 100 });
  const folder = file.split('/').slice(0, 3).join('/');
  const agg = byFolder.get(folder) ?? { lines: 0, covered: 0, files: 0 };
  agg.lines += n; agg.covered += h; agg.files++;
  byFolder.set(folder, agg);
  total += n; hit += h;
}
// src/core modules that no test loaded at all count as uncovered (their line count: non-empty, non-comment lines)
const loaded = new Set(files.keys());
const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : /\.ts$/.test(e.name) && !/\.test\.ts$|\.d\.ts$/.test(e.name) ? [`${d}/${e.name}`] : []));
const unloaded = walk('src/core').filter((f) => !loaded.has(f) && !/\.worker\.ts$/.test(f));
for (const f of unloaded) {
  const n = readFileSync(join(root, f), 'utf8').split('\n').filter((l) => l.trim() && !/^\s*(\/\/|\*|\/\*|import |export type |export interface |type |interface )/.test(l)).length;
  perFile.push({ file: f, lines: n, covered: 0, pct: 0, notLoaded: true });
  const folder = f.split('/').slice(0, 3).join('/');
  const agg = byFolder.get(folder) ?? { lines: 0, covered: 0, files: 0 };
  agg.lines += n; agg.files++;
  byFolder.set(folder, agg);
  total += n;
}
const pct = (h, n) => (n ? ((100 * h) / n).toFixed(1) : '100.0');
console.log(`\nLine coverage of src/core (${parts} module records, ${files.size} modules loaded, ${unloaded.length} not loaded by any test)`);
for (const [folder, a] of [...byFolder].sort()) console.log(`${folder.padEnd(28)} ${pct(a.covered, a.lines).padStart(6)} %  ${String(a.covered).padStart(6)} / ${String(a.lines).padEnd(6)} lines, ${a.files} files`);
console.log(`${'src/core'.padEnd(28)} ${pct(hit, total).padStart(6)} %  ${String(hit).padStart(6)} / ${total} lines`);
mkdirSync(join(root, 'coverage'), { recursive: true });
writeFileSync(join(root, 'coverage', 'core.json'), JSON.stringify({ total: { lines: total, covered: hit, pct: Number(pct(hit, total)) }, folders: Object.fromEntries(byFolder), files: perFile }, null, 1));
console.log('details: coverage/core.json');
process.exit(run.status ?? 1);
