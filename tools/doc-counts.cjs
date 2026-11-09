// Doc counts (QA 0.5.11, F38/F129/P3-1; QA 0.5.12 F38): the number of tests the README names per strict QA file
// ("qaBrep.test.ts (13)") must be what vitest finds in that file, and the total of `npm test` in the newest status section
// ("`npm test`: 777 tests") must be the total vitest runs. Runs `vitest run` once with the JSON reporter (a static list
// misses the tests made in loops).
// Usage: node tools/doc-counts.cjs   (exit 1 when a count in README.md disagrees, or when vitest gives no report)
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const out = path.join(os.tmpdir(), `phlippo-doc-counts-${process.pid}.json`);
spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32', stdio: 'ignore' });
if (!fs.existsSync(out)) {
  console.log('doc counts: vitest wrote no report');
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(out, 'utf8'));
fs.rmSync(out, { force: true });
const perFile = {};
for (const f of report.testResults) perFile[path.basename(f.name)] = f.assertionResults.length;
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
let bad = 0;
let seen = 0;
for (const m of readme.matchAll(/\b(qa\w+\.test\.ts) \((\d+)\)/g)) {
  seen++;
  const real = perFile[m[1]] ?? 0;
  const ok = real === Number(m[2]);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'DIFF'} README ${m[1]} (${m[2]}): vitest finds ${real}`);
}
for (const [f, n] of Object.entries(perFile)) if (/^qa\w+\.test\.ts$/.test(f) && !readme.includes(`${f} (`)) console.log(`note ${f}: ${n} tests, not named in README.md`);
if (!seen) { console.log('doc counts: README.md names no qa*.test.ts (N)'); bad++; }
// the total of `npm test` in the newest status section (older sections keep the number of their own commit)
const newest = readme.split(/^## /m).find((s) => s.startsWith('Status ')) ?? '';
const total = /`npm test`: (\d+) tests/.exec(newest);
const passed = report.numPassedTests;
if (!total) { console.log(`DIFF the newest status section names no "\`npm test\`: N tests" (vitest: ${passed} passed of ${report.numTotalTests})`); bad++; }
else {
  const ok = Number(total[1]) === report.numTotalTests && passed === report.numTotalTests;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'DIFF'} README \`npm test\`: ${total[1]} tests: vitest runs ${report.numTotalTests}, ${passed} passed`);
}
process.exit(bad ? 1 : 0);
