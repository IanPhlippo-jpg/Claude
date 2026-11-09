// The evidence chain of one commit (QA 0.5.12, F180/F93/F149): every claim in README/TASKS points to a folder in
// qa-logs/<version>/ with a manifest that says what was tested (commit, clean tree, source hashes), on what (OS, Node,
// npm, browser), with which commands, their exit codes and durations, the full stdout/stderr of each, and why each
// skipped test was skipped.
//
//   node tools/bewijs.mjs                 the local gate (the commands of the CI job "checks") on this computer
//                                         -> qa-logs/<version>/local-<platform>-<sha>/
//   node tools/bewijs.mjs --voorbeelden   also runs the example tests (npm run test:voorbeelden, ~30 min)
//   node tools/bewijs.mjs --e2e           also copies the regression logs in e2e-out/ that were made from this commit
//   node tools/bewijs.mjs --ci <run-id>   a GitHub Actions run: every job log, the artifacts and the run itself
//                                         -> qa-logs/<version>/actions-<run-id>-<sha>/
//
// Logs are .txt (*.log is ignored by git). Exit code 0 only when every step passed.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { arch, cpus, release, totalmem } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', cwd: ROOT, shell: process.platform === 'win32', maxBuffer: 1 << 30, ...opts });
const out = (cmd, ...args) => run(cmd, args).stdout?.trim() ?? '';
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

/** every file below dir (relative paths, sorted) */
function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).map(String).filter((f) => statSync(join(dir, f)).isFile()).sort();
}

/** the hashes of the inputs: the lock file, the tracked sources (one hash over `git ls-files -s`) and the fixtures */
function sources() {
  const tracked = out('git', 'ls-files', '-s');
  const fixtures = Object.fromEntries(files(join(ROOT, 'e2e', 'fixtures')).map((f) => [`e2e/fixtures/${f.replace(/\\/g, '/')}`, sha256(readFileSync(join(ROOT, 'e2e', 'fixtures', f)))]));
  return {
    'package-lock.json': sha256(readFileSync(join(ROOT, 'package-lock.json'))),
    'git ls-files -s (all tracked files)': sha256(tracked),
    trackedFiles: tracked.split('\n').length,
    fixtures,
  };
}

/** what was tested on: commit, tree state and the machine */
function provenance() {
  const status = out('git', 'status', '--porcelain', '--untracked-files=no');
  return {
    commit: out('git', 'rev-parse', 'HEAD'),
    branch: out('git', 'rev-parse', '--abbrev-ref', 'HEAD'),
    cleanTree: !status,
    changedFiles: status ? status.split('\n') : [],
    version,
    date: new Date().toISOString(),
    platform: `${process.platform} ${release()} ${arch()}`,
    cpu: `${cpus()[0]?.model ?? '?'} x ${cpus().length}`,
    memoryGB: Math.round(totalmem() / 2 ** 30),
    node: process.version,
    npm: out('npm', '-v'),
    git: out('git', '--version'),
    playwright: out('npx', 'playwright', '--version'),
  };
}

/** why each skipped test was skipped: the skipIf/skip condition on its line in the source, else 'no reason in the source' */
function skipReasons(vitestJson) {
  const skips = [];
  for (const file of vitestJson.testResults ?? []) {
    const src = existsSync(file.name) ? readFileSync(file.name, 'utf8').split('\n') : [];
    for (const t of file.assertionResults ?? []) {
      if (t.status !== 'skipped' && t.status !== 'pending' && t.status !== 'todo') continue;
      const line = src.findIndex((l) => l.includes(t.title.slice(0, 40)));
      const m = line >= 0 ? /\.(skipIf|runIf|skip|todo)\s*\(([^)]*(?:\([^)]*\))?[^)]*)\)/.exec(src[line]) : null;
      // a whole file can be left out by vite.config (VOORBEELD_TESTS); a describe-level skip sits above the test
      const above = line >= 0 ? src.slice(0, line).reverse().find((l) => /describe\.(skipIf|runIf|skip)/.test(l)) : undefined;
      skips.push({
        file: relative(ROOT, file.name).replace(/\\/g, '/'),
        test: t.fullName ?? t.title,
        reason: m ? `${m[1]}(${m[2].trim()})` : above ? above.trim() : 'no reason in the source',
      });
    }
  }
  return skips;
}

/** run one step, keep its full output, return its record */
function step(dir, name, cmd, env = {}) {
  const t0 = Date.now();
  const r = run(cmd, [], { env: { ...process.env, FORCE_COLOR: '0', ...env } });
  const ms = Date.now() - t0;
  const text = `$ ${cmd}\n# exit ${r.status} after ${(ms / 1000).toFixed(1)} s\n\n--- stdout ---\n${r.stdout ?? ''}\n--- stderr ---\n${r.stderr ?? ''}`;
  const log = `${name}.txt`;
  writeFileSync(join(dir, log), text);
  console.log(`${r.status === 0 ? 'ok  ' : 'FAIL'} ${name} (${(ms / 1000).toFixed(0)} s)`);
  return { name, cmd, env: Object.keys(env).length ? env : undefined, exit: r.status, seconds: Math.round(ms / 100) / 10, log, sha256: sha256(text) };
}

function writeManifest(dir, manifest) {
  // every file in the folder with its hash, so a copy can be checked against the manifest
  manifest.files = Object.fromEntries(files(dir).filter((f) => f !== 'manifest.json').map((f) => [f.replace(/\\/g, '/'), sha256(readFileSync(join(dir, f)))]));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function local(withE2e, withVoorbeelden) {
  const prov = provenance();
  const dir = join(ROOT, 'qa-logs', version, `local-${process.platform}-${prov.commit.slice(0, 7)}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  // the commands of the CI job "checks" (.github/workflows/ci.yml), in that order
  const steps = [
    step(dir, '1-typecheck', 'npm run typecheck'),
    step(dir, '2-unit', 'npx vitest run --reporter=default --reporter=json --outputFile=qa-logs/.vitest.json'),
    step(dir, '3-mutation', 'node tools/mutation-check.cjs'),
    step(dir, '4-text', 'node tools/rename-trademarks.cjs --check && node tools/neutral-comments.cjs --check && node tools/line-budget.cjs'),
    step(dir, '5-build', 'npm run build'),
    step(dir, '6-budgets', 'node tools/bundle-budget.cjs && node tools/doc-counts.cjs'),
  ];
  if (withVoorbeelden) steps.push(step(dir, '7-voorbeelden', 'npm run test:voorbeelden -- --testTimeout=1800000 --reporter=default --reporter=json --outputFile=qa-logs/.voorbeelden.json'));
  let unit = {};
  const vj = join(ROOT, 'qa-logs', '.vitest.json');
  if (existsSync(vj)) {
    const j = JSON.parse(readFileSync(vj, 'utf8'));
    unit = { tests: j.numTotalTests, passed: j.numPassedTests, failed: j.numFailedTests, skipped: j.numPendingTests + (j.numTodoTests ?? 0), files: j.numTotalTestSuites, skips: skipReasons(j) };
    writeFileSync(join(dir, '2-unit.json'), JSON.stringify(j, null, 1));
    rmSync(vj);
  }
  // the example tests are not skipped but left out of `npm test` (vite.config.ts, VOORBEELD_TESTS): say so, and with
  // --voorbeelden give their own counts and skip reasons
  const cfg = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
  unit.excluded = { files: [...(/VOORBEELD_TESTS = \[([^\]]*)\]/.exec(cfg)?.[1].matchAll(/'([^']+)'/g) ?? [])].map((m) => m[1]),
    reason: 'vite.config.ts leaves them out unless VOORBEELDEN=1 (slow: they rebuild the example models); run by `npm run test:voorbeelden` and the CI job "voorbeelden"' };
  const vv = join(ROOT, 'qa-logs', '.voorbeelden.json');
  if (existsSync(vv)) {
    const j = JSON.parse(readFileSync(vv, 'utf8'));
    unit.voorbeelden = { tests: j.numTotalTests, passed: j.numPassedTests, failed: j.numFailedTests, skipped: j.numPendingTests + (j.numTodoTests ?? 0), skips: skipReasons(j) };
    writeFileSync(join(dir, '7-voorbeelden.json'), JSON.stringify(j, null, 1));
    rmSync(vv);
  }
  const regression = [];
  if (withE2e) {
    // only the regression logs whose head names this commit on a clean tree count as evidence for it
    const e2eOut = join(ROOT, 'e2e-out');
    for (const f of existsSync(e2eOut) ? readdirSync(e2eOut).filter((x) => /^regression-.*\.txt$/.test(x)) : []) {
      const head = readFileSync(join(e2eOut, f), 'utf8').split('\n').slice(0, 6).join('\n');
      const c = /^commit (\S+)(.*)$/m.exec(head);
      if (!c || !prov.commit.startsWith(c[1]) || c[2].trim()) continue;
      cpSync(join(e2eOut, f), join(dir, f));
      const body = readFileSync(join(e2eOut, f), 'utf8');
      regression.push({ log: f, done: /^DONE.*$/m.exec(body)?.[0] ?? 'no DONE line (cut off?)' });
    }
  }
  const ok = steps.every((s) => s.exit === 0) && prov.cleanTree;
  writeManifest(dir, { kind: 'local gate', ok, provenance: prov, sources: sources(), steps, unit, regression });
  console.log(`${ok ? 'GREEN' : 'NOT GREEN'}: ${relative(ROOT, dir)}${prov.cleanTree ? '' : ' (the work tree had uncommitted changes: not evidence for the commit)'}`);
  return ok;
}

function actions(id) {
  const view = JSON.parse(out('gh', 'run', 'view', id, '--json', 'databaseId,headSha,headBranch,event,status,conclusion,createdAt,updatedAt,url,workflowName,jobs'));
  const dir = join(ROOT, 'qa-logs', version, `actions-${id}-${view.headSha.slice(0, 7)}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const jobs = [];
  for (const j of view.jobs) {
    const name = j.name.replace(/^regression \((.*)\)$/, '$1').replace(/[^\w.-]+/g, '-');
    const log = run('gh', ['run', 'view', id, '--job', String(j.databaseId), '--log']).stdout ?? '';
    mkdirSync(join(dir, name), { recursive: true });
    writeFileSync(join(dir, name, `job-${name}.txt`), log);
    jobs.push({ name: j.name, id: j.databaseId, conclusion: j.conclusion, started: j.startedAt, completed: j.completedAt,
      steps: j.steps?.map((s) => ({ name: s.name, conclusion: s.conclusion })), log: `${name}/job-${name}.txt`,
      done: /DONE [^\n]*/.exec(log)?.[0] });
  }
  // the artifacts (regression logs, installer self-test, signature report): one folder per artifact
  const art = join(dir, 'artifacts');
  const dl = run('gh', ['run', 'download', id, '-D', art]);
  const ok = view.status === 'completed' && view.conclusion === 'success' && jobs.every((j) => j.conclusion === 'success' || j.conclusion === 'skipped');
  writeManifest(dir, { kind: 'GitHub Actions run', ok, run: { id: view.databaseId, url: view.url, workflow: view.workflowName, event: view.event, branch: view.headBranch, commit: view.headSha, status: view.status, conclusion: view.conclusion, created: view.createdAt, updated: view.updatedAt },
    artifactsDownloaded: dl.status === 0, jobs });
  console.log(`${ok ? 'GREEN' : 'NOT GREEN'} (${jobs.filter((j) => j.conclusion === 'success').length}/${jobs.length} jobs): ${relative(ROOT, dir)}`);
  return ok;
}

const args = process.argv.slice(2);
const ci = args.indexOf('--ci');
const ok = ci >= 0 ? actions(args[ci + 1]) : local(args.includes('--e2e'), args.includes('--voorbeelden'));
process.exit(ok ? 0 : 1);
