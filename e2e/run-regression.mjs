// The full browser regression: every e2e script against the browser build (vite preview on 4173 by default).
// Cross-platform (no bash), writes e2e-out/regression-<version>.txt and exits 1 when any script fails.
// Usage: npm run build && npx vite preview --port 4173 &  then  node e2e/run-regression.mjs [script …]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
const SCRIPTS = ['smoke', 'relations', 'features', 'full', 'assembly', 'drawing', 'configurations', 'rib', 'endconditions', 'multibody', 'slot', 'sheetmetal', 'section', 'sketchtools', 'helix', 'hem', 'explode', 'doorhandle', 'ellipsetext', 'componentpattern', 'uptobody', 'jogmiter', 'sketch3d', 'sketchpattern', 'faceappearance', 'draftcheck', 'editcomponent', 'arcslot', 'sketchtools2', 'surfaces', 'annotations', 'annotations2', 'annotations3', 'viewlayout', 'corners', 'unfoldfold', 'wrap', 'motion', 'thickness', 'dragHandles', 'dimpm', 'thread', 'confirmdelete', 'deletekey', 'deletekey2', 'rect3', 'sketchcurves', 'features2', 'sheetmetal2', 'evalrender2', 'assembly2', 'drawing2', 'misc7', 'filletopts', 'drawingfix', 'drawopts', 'keys', 'asmoptions', 'sectionopts', 'dwgopts', 'dialogopts', 'motion2', 'triad', 'blockf', 'fixes1', 'asmcut', 'qa1', 'qa2', 'qa3', 'qa4', 'leak', 'ga1', 'ga2', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gj', 'step', 'brep', 'bodies', 'pmsweep', 'inventory47', 'rebuildworker', 'facenames', 'appearance2', 'loftface', 'videos56', 'videos46', 'videos54', 'reorder', 'sheetexport', 'plastics'];
const only = process.argv.slice(2);
const list = only.length ? only : SCRIPTS;
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
mkdirSync('e2e-out', { recursive: true });
const log = only.length ? `e2e-out/regression-${version}-partial.txt` : `e2e-out/regression-${version}.txt`;
writeFileSync(log, `regression ${version} ${new Date().toISOString()} (${list.length} scripts)\n`);
const failed = [];
let skipped = 0;
for (const t of list) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [`e2e/${t}.mjs`], { env: { ...process.env, E2E_URL: process.env.E2E_URL ?? 'http://127.0.0.1:4173/' }, encoding: 'utf8', timeout: 400_000, maxBuffer: 64 * 1024 * 1024 });
  const all = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n');
  // optional steps that were skipped are counted and named, so "green" never hides them (QA v0.5.1 F119)
  const skips = all.filter((l) => l.startsWith('skip: '));
  skipped += skips.length;
  const out = all.filter((l) => !l.startsWith('BVH') && /FAIL|passed|ERRORS|Error|page errors/.test(l)).slice(0, 8).join(' | ') + (skips.length ? ` | ${skips.length} skipped: ${skips.map((l) => l.slice(6, 60)).join('; ')}` : '');
  const code = r.status ?? (r.signal ? `signal ${r.signal}` : 'timeout');
  if (code !== 0) failed.push(t);
  const line = `${t}: exit=${code} ${((Date.now() - t0) / 1000).toFixed(0)}s ${out}`;
  appendFileSync(log, line + '\n');
  console.log(line);
}
const done = `DONE ${list.length - failed.length}/${list.length} green, ${skipped} optional step(s) skipped${failed.length ? ` — failed: ${failed.join(' ')}` : ''}`;
appendFileSync(log, done + '\n');
console.log(done);
process.exit(failed.length ? 1 : 0);
