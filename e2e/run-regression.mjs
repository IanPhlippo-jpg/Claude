// The full browser regression: every e2e script against the browser build (vite preview on 4173 by default).
// Cross-platform (no bash), writes e2e-out/regression-<version>[-<pass>][-partial].txt and exits 1 when any script fails
// or skips more optional steps than its budget allows.
// Usage: npm run build:e2e && npx vite preview --port 4173 &  then  node e2e/run-regression.mjs [script …]
//   E2E_URL    the app (default http://127.0.0.1:4173/); ?kernel=brep and ?rebuild=worker pick the pass
//   E2E_PASS   the pass name in the log name (default from the query of E2E_URL: brep, worker, brep-worker)
//   E2E_SHARD  k/n runs every n-th script starting at the k-th (a CI job per shard keeps each job short)
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { release } from 'node:os';
import { commitOf } from './lib/provenance.mjs';
const SCRIPTS = ['smoke', 'relations', 'features', 'full', 'assembly', 'drawing', 'configurations', 'rib', 'endconditions', 'multibody', 'slot', 'sheetmetal', 'section', 'sketchtools', 'helix', 'hem', 'explode', 'doorhandle', 'ellipsetext', 'componentpattern', 'uptobody', 'jogmiter', 'sketch3d', 'sketchpattern', 'faceappearance', 'draftcheck', 'editcomponent', 'arcslot', 'sketchtools2', 'surfaces', 'annotations', 'annotations2', 'annotations3', 'viewlayout', 'corners', 'unfoldfold', 'wrap', 'motion', 'thickness', 'dragHandles', 'dimpm', 'thread', 'confirmdelete', 'deletekey', 'deletekey2', 'rect3', 'sketchcurves', 'features2', 'sheetmetal2', 'evalrender2', 'assembly2', 'drawing2', 'misc7', 'filletopts', 'drawingfix', 'drawopts', 'keys', 'asmoptions', 'sectionopts', 'dwgopts', 'dialogopts', 'motion2', 'triad', 'blockf', 'fixes1', 'asmcut', 'qa1', 'qa2', 'qa3', 'qa4', 'leak', 'ga1', 'ga2', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gj', 'step', 'brep', 'bodies', 'pmsweep', 'inventory47', 'rebuildworker', 'facenames', 'appearance2', 'loftface', 'videos56', 'videos46', 'videos54', 'reorder', 'sheetexport', 'plastics', 'quickstart', 'round2', 'undo200', 'designtable', 'library', 'instant2d', 'magnify', 'sketch3d2'];

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout?.trim() ?? '';

/** the pass name: E2E_PASS, else the kernel and rebuild choices in the query of the url ('' for the default pass) */
function passOf(url, override = process.env.E2E_PASS) {
  if (override) return override.replace(/[^\w.-]+/g, '-');
  const q = new URL(url).searchParams;
  return [q.get('kernel') === 'brep' && 'brep', q.get('rebuild') === 'worker' && 'worker'].filter(Boolean).join('-');
}

/** the optional steps a script may skip: `// skip-budget: N <reason>` in its first lines, else 0. A budget without a
 * reason is an error (null), so every allowed skip says why. */
function skipBudget(source) {
  const head = source.split('\n').slice(0, 12).join('\n');
  const m = /^\/\/ skip-budget: (\d+)(.*)$/m.exec(head);
  if (!m) return 0;
  return /\w{3}/.test(m[2]) ? Number(m[1]) : null;
}

/** k/n: the scripts of shard k of n (every n-th, so the slow ones spread) */
function shardOf(list, spec) {
  if (!spec) return list;
  const [k, n] = spec.split('/').map(Number);
  if (!(n >= 1 && k >= 1 && k <= n)) throw new Error(`E2E_SHARD must be k/n, got ${spec}`);
  return list.filter((_, i) => i % n === k - 1);
}

const only = process.argv.slice(2);
const url = process.env.E2E_URL ?? 'http://127.0.0.1:4173/';
const shard = process.env.E2E_SHARD ?? '';
const list = shardOf(only.length ? only : SCRIPTS, shard);
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const pass = passOf(url);
// one log per pass (QA F160): the B-rep, worker and release passes never overwrite each other or the default pass
const name = ['regression', version, pass, shard && `shard${shard.replace('/', 'of')}`, only.length && 'partial'].filter(Boolean).join('-');
mkdirSync('e2e-out', { recursive: true });
const log = `e2e-out/${name}.txt`;
// the head names what was tested (QA F148): version, commit (and whether the tree had uncommitted changes), platform
// (an exported tree without .git takes the commit that `git archive` wrote into e2e/lib/commit.txt, F176)
const commit = commitOf();
writeFileSync(log, `regression ${version} pass ${pass || 'default'}${shard ? ` shard ${shard}` : ''}\ncommit ${commit}\nplatform ${process.platform} ${release()}\nurl ${url}\ndate ${new Date().toISOString()}\n(${list.length} scripts)\n`);
const failed = [];
const overBudget = [];
let skipped = 0;
for (const t of list) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [`e2e/${t}.mjs`], { env: { ...process.env, E2E_URL: url }, encoding: 'utf8', timeout: Number(process.env.E2E_SCRIPT_TIMEOUT || 900_000), maxBuffer: 64 * 1024 * 1024 });
  const all = `${r.stdout ?? ''}${r.stderr ?? ''}`.split('\n');
  // optional steps that were skipped are counted and named, and more than the script's budget fails the run (QA F119, F155)
  const skips = all.filter((l) => l.startsWith('skip: '));
  skipped += skips.length;
  let budget = 0;
  try { budget = skipBudget(readFileSync(`e2e/${t}.mjs`, 'utf8')); } catch { budget = 0; }
  const over = budget === null || skips.length > budget;
  if (over) overBudget.push(budget === null ? `${t} (skip-budget without a reason)` : `${t} (${skips.length} > ${budget})`);
  const out = all.filter((l) => !l.startsWith('BVH') && /FAIL|passed|ERRORS|Error|page errors/.test(l)).slice(0, 8).join(' | ') + (skips.length ? ` | ${skips.length} skipped (budget ${budget ?? '?'}): ${skips.map((l) => l.slice(6, 90)).join('; ')}` : '');
  const code = r.status ?? (r.signal ? `signal ${r.signal}` : 'timeout');
  if (code !== 0) failed.push(t);
  // the whole output of a failed script is kept next to the log (the CI artifact carries it): the stack of a timeout, the page errors
  if (code !== 0) writeFileSync(`e2e-out/${t}-output.txt`, [`${t}: exit=${code}`, ...all].join('\n'));
  const line = `${t}: exit=${code}${over ? ' OVER-SKIP-BUDGET' : ''} ${((Date.now() - t0) / 1000).toFixed(0)}s ${out}`;
  appendFileSync(log, line + '\n');
  console.log(line);
}
const bad = new Set([...failed, ...overBudget.map((o) => o.split(' ')[0])]);
const done = `DONE ${list.length - bad.size}/${list.length} green, ${skipped} optional step(s) skipped${failed.length ? ` — failed: ${failed.join(' ')}` : ''}${overBudget.length ? ` — over the skip budget: ${overBudget.join(', ')}` : ''}`;
appendFileSync(log, done + '\n');
console.log(done);
console.log(`log: ${log}`);
process.exit(bad.size ? 1 : 0);
