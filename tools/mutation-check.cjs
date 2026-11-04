// Mutation check (QA 0.5.11 F184, plan P0-8): proof that the QA tests catch a fault. Each mutation plants one known
// fault in one source module and runs the tests that guard it; they must FAIL. A mutation the tests let through is
// MISSED and the run exits 1.
//
// The working tree is never written: a child process runs vitest with a plugin whose `load` hook hands vitest the
// mutated text of the module instead of the file on disk (other runs on the same tree, by people or agents, never see
// the fault). The run still proves it at the end: the hashes of the mutated modules and `git diff --quiet` on them are
// what they were at the start.
//
// First a baseline: the same tests on the unmutated sources must be green, else a failure proves nothing.
//
// Usage: node tools/mutation-check.cjs [--only a,b] [--no-baseline]
//   exit 0 every mutation caught, 1 a mutation missed, the baseline red, a mutation that no longer applies, or a
//   changed tree
'use strict';
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

/**
 * The mutations. `find` must occur exactly once in `file` (a refactor that moves the code makes the run fail loudly
 * instead of testing nothing); `mustFail` are the test files that have to go red.
 */
const MUTATIONS = [
  {
    id: 'a',
    what: 'matchEdges returns only the first piece of a split edge',
    file: 'src/core/features/edgesets.ts',
    find: 'if (pieces.length > 1) return pieces.map((e) => alongRef(e, ref));',
    replace: 'if (pieces.length > 1) return pieces.slice(0, 1).map((e) => alongRef(e, ref));',
    mustFail: ['src/qa/qaTeam.test.ts', 'src/qa/qaStrict.test.ts'],
  },
  {
    id: 'b',
    what: 'volumeCheck: SHAPE_MISMATCH_MM x 10 (0.1 -> 1.0 mm)',
    file: 'src/core/features/volumeCheck.ts',
    find: 'export const SHAPE_MISMATCH_MM = 0.1;',
    replace: 'export const SHAPE_MISMATCH_MM = 0.1 * 10;',
    mustFail: ['src/qa/qaCrossCheck.test.ts'],
  },
  {
    id: 'c',
    what: 'round.ts: every fillet radius x 1.01 (the mesh kernel tools)',
    file: 'src/core/features/round.ts',
    find: "export function roundTools(edges: BodyEdge[], kind: 'fillet' | 'chamfer', size: number): { cutters: THREE.BufferGeometry[]; adders: THREE.BufferGeometry[] } {\n",
    replace: "export function roundTools(edges: BodyEdge[], kind: 'fillet' | 'chamfer', size: number): { cutters: THREE.BufferGeometry[]; adders: THREE.BufferGeometry[] } {\n  if (kind === 'fillet') size *= 1.01;\n",
    mustFail: ['src/qa/qaStrict.test.ts'],
  },
  {
    id: 'd',
    what: 'mate solver: the linear coupler ratio the wrong way round',
    file: 'src/core/assembly/assembly.ts',
    find: 'const ratio = movIdx === 1 ? mate.ratio ?? 1 : 1 / (mate.ratio || 1);',
    replace: 'const ratio = movIdx === 1 ? 1 / (mate.ratio || 1) : mate.ratio ?? 1;',
    mustFail: ['src/core/assembly/mechMates.test.ts'],
  },
];

const norm = (p) => path.resolve(p).split(path.sep).join('/').toLowerCase();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const hash = (rel) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });

/** the mutated text of a module, or an error when the mutation no longer applies */
function mutate(m) {
  const src = read(m.file).replace(/\r\n/g, '\n');
  const n = src.split(m.find).length - 1;
  if (n !== 1) throw new Error(`mutation ${m.id}: the text to mutate occurs ${n} times in ${m.file} (expected once)`);
  return src.replace(m.find, m.replace);
}

// ---- child: one vitest run (optionally with one mutation) on the given test files, the result as JSON on stdout ----
async function child(spec) {
  const { startVitest } = await import('vitest/node');
  let loads = 0;
  const plugins = [];
  if (spec.mutation) {
    const target = norm(path.join(ROOT, spec.mutation.file));
    const code = spec.mutation.code;
    // a name of its own per mutant: Vitest keys its transform cache on the plugin names, so a cached module of one
    // run is never served to another (the cache is off for these runs as well)
    plugins.push({
      name: `phlippo-mutant-${createHash('sha1').update(spec.mutation.file + code).digest('hex').slice(0, 12)}`,
      enforce: 'pre',
      load(id) {
        if (norm(id.split('?')[0]) !== target) return null;
        loads++;
        return code;
      },
    });
  }
  const vitest = await startVitest('test', spec.files, { root: ROOT, run: true, watch: false, reporters: ['dot'], fsModuleCache: false }, { plugins });
  const files = vitest ? vitest.state.getFiles() : [];
  const failedFiles = files.filter((f) => f.result?.state === 'fail' || (f.result?.errors?.length ?? 0) > 0).map((f) => path.relative(ROOT, f.filepath).split(path.sep).join('/'));
  const failedTests = vitest ? vitest.state.getCountOfFailedTests() : -1;
  const result = { ran: files.length, failedFiles, failedTests, loads };
  if (vitest) await vitest.close();
  process.stdout.write(`\nMUTATION-RESULT ${JSON.stringify(result)}\n`);
  process.exit(0);
}

/** run the tests in a child process; quiet unless something goes wrong */
function runChild(files, mutation) {
  const spec = JSON.stringify({ files, mutation });
  const r = spawnSync(process.execPath, [__filename, '--child'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, MUTATION_SPEC: spec }, maxBuffer: 256 * 1024 * 1024, timeout: 20 * 60 * 1000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const line = out.split('\n').find((l) => l.startsWith('MUTATION-RESULT '));
  if (!line) {
    console.log(out.split('\n').slice(-40).join('\n'));
    throw new Error(`the vitest child gave no result (exit ${r.status ?? r.signal})`);
  }
  return { ...JSON.parse(line.slice('MUTATION-RESULT '.length)), out };
}

function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] ?? '' : '';
  const only = onlyArg ? onlyArg.split(',') : null;
  const list = MUTATIONS.filter((m) => !only || only.includes(m.id));
  const t0 = Date.now();
  // the state of the mutated modules before the run: content hash and whether git sees a change
  const before = new Map(list.map((m) => [m.file, { hash: hash(m.file), clean: git('diff', '--quiet', '--', m.file).status === 0 }]));
  const problems = [];
  // every mutation applies before anything runs
  const codes = new Map();
  for (const m of list) {
    try { codes.set(m.id, mutate(m)); } catch (e) { problems.push(e.message); }
  }
  if (problems.length) {
    console.log(problems.join('\n'));
    process.exit(1);
  }
  const allFiles = [...new Set(list.flatMap((m) => m.mustFail))];
  if (!args.includes('--no-baseline')) {
    const b = runChild(allFiles, null);
    const red = b.failedFiles.length || b.failedTests || b.ran !== allFiles.length;
    console.log(`baseline: ${b.ran} file(s), ${b.failedTests} failed test(s)${b.failedFiles.length ? ` in ${b.failedFiles.join(' ')}` : ''} ${red ? 'RED' : 'green'}`);
    if (red) {
      console.log(b.out.split('\n').slice(-60).join('\n'));
      console.log('the tests fail without a mutation: a failure under a mutation would prove nothing');
      process.exit(1);
    }
  }
  const results = [];
  for (const m of list) {
    const t = Date.now();
    const r = runChild(m.mustFail, { file: m.file, code: codes.get(m.id) });
    const missedFiles = m.mustFail.filter((f) => !r.failedFiles.includes(f));
    const status = r.loads === 0 ? 'NOT-LOADED' : missedFiles.length ? 'MISSED' : 'caught';
    const line = `mutation ${m.id} (${m.what}; ${m.file}): ${status} — ${r.failedTests} failed test(s) in ${r.failedFiles.join(' ') || 'no file'}${missedFiles.length ? `; still green: ${missedFiles.join(' ')}` : ''} (${((Date.now() - t) / 1000).toFixed(0)} s)`;
    console.log(line);
    results.push({ id: m.id, status });
  }
  // the tree is what it was: the mutated modules have the same content and git sees no new change
  for (const [file, b] of before) {
    if (hash(file) !== b.hash) problems.push(`${file} changed during the run`);
    if (b.clean && git('diff', '--quiet', '--', file).status !== 0) problems.push(`${file} has a git change after the run`);
  }
  const bad = results.filter((r) => r.status !== 'caught');
  const done = `DONE ${results.length - bad.length}/${results.length} mutation(s) caught${bad.length ? ` — not caught: ${bad.map((r) => `${r.id} (${r.status})`).join(', ')}` : ''}${problems.length ? ` — ${problems.join('; ')}` : ''}, tree unchanged: ${problems.length ? 'NO' : 'yes'} (${((Date.now() - t0) / 1000).toFixed(0)} s)`;
  console.log(done);
  process.exit(bad.length || problems.length ? 1 : 0);
}

if (process.argv.includes('--child')) {
  child(JSON.parse(process.env.MUTATION_SPEC)).catch((e) => {
    console.error(e);
    process.exit(2);
  });
} else {
  main();
}
